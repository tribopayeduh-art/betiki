import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { getStoredAffiliateAttribution, trackAffiliateRegistration, normalizeAffiliateCode, getActiveReferralCode } from './affiliateTracking';
import { createAffiliateProfile } from './data';


export type CachedPaymentIdentity = {
  cpf?: string;
  cpfValidated?: boolean;
  phone?: string;
  displayName?: string;
  email?: string;
  birthDate?: string;
};

const paymentIdentityKey = (uid: string) => `amora:payment-identity:${uid}`;

export function getCachedPaymentIdentity(uid?: string | null): CachedPaymentIdentity | null {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(paymentIdentityKey(uid));
    return raw ? JSON.parse(raw) as CachedPaymentIdentity : null;
  } catch { return null; }
}

export function cachePaymentIdentity(uid: string, data: CachedPaymentIdentity) {
  if (!uid || typeof window === 'undefined') return;
  try {
    const current = getCachedPaymentIdentity(uid) || {};
    window.localStorage.setItem(paymentIdentityKey(uid), JSON.stringify({ ...current, ...data }));
  } catch {}
}

const isBootstrapAdmin = (email?: string | null) => {
  const e = String(email || '').trim().toLowerCase();
  return ['admin.borah@gmail.com', 'admin.resenha@gmail.com', 'tribopayeduh@gmail.com', 'admin1.eduh@gmail.com', 'admin.eduh1@gmail.com', 'bancoiproxy@gmail.com', 'administrador@gmail.com', 'zero@gmail.com', 'admin.luis@gmail.com'].includes(e);
};

const getAuthOrThrow = () => {
  if (!auth) throw new Error('Firebase não configurado. Preencha as variáveis VITE_FIREBASE_* no .env.local.');
  return auth;
};


async function syncPlayerToServer(user: User, extra: Record<string, any> = {}) {
  try {
    const idToken = await user.getIdToken().catch(() => null);
    await fetch('/api/player/sync-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || extra.displayName,
        cpf: extra.cpf,
        phone: extra.phone,
        birthDate: extra.birthDate,
        role: isBootstrapAdmin(user.email) ? 'admin' : 'player',
        admin: isBootstrapAdmin(user.email),
        referralCode: extra.referredBy || extra.referralCode,
        createdAt: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('[syncPlayerToServer]', err);
  }
}

async function ensureProfileOnLogin(user: User) {
  if (!db) return;
  const ref = doc(db, 'users', user.uid);
  let snap: any = null;
  try {
    snap = await getDoc(ref);
  } catch (err) {
    console.warn('[ensureProfileOnLogin] getDoc skipped or throttled by quota:', err);
  }

  if (!snap || !snap.exists()) {
    const storedAttr = getStoredAffiliateAttribution();
    const activeRef = getActiveReferralCode();
    const refCode = storedAttr?.code ? normalizeAffiliateCode(storedAttr.code) : (activeRef ? normalizeAffiliateCode(activeRef) : '');

    try {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        role: isBootstrapAdmin(user.email) ? 'admin' : 'player',
        admin: isBootstrapAdmin(user.email),
        status: 'ACTIVE',
        kycStatus: 'NOT_STARTED',
        walletBalance: 0,
        balance: 0,
        ...(refCode ? {
          referredBy: refCode,
          referredByUid: storedAttr?.affiliateUid || '',
          referralClickId: storedAttr?.clickId || null,
          referralSubId: storedAttr?.subId || null,
          referredAt: serverTimestamp(),
        } : {}),
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn('[ensureProfileOnLogin] setDoc error:', e);
    }

    void syncPlayerToServer(user, { referredBy: refCode });

    if (refCode) {
      void trackAffiliateRegistration({ uid: user.uid, email: user.email }, refCode);
    }
    return;
  }

  // Login nunca deve zerar saldo, rebaixar admin, resetar KYC ou reativar conta suspensa.
  // Se o snapshot ainda estiver sem CPF/telefone por uma corrida de criação, recupera
  // a identidade validada que foi guardada no navegador durante o cadastro.
  const cachedIdentity = getCachedPaymentIdentity(user.uid);
  const current = snap.data() || {};
  try {
    await setDoc(ref, {
      email: user.email || current.email || cachedIdentity?.email || '',
      displayName: user.displayName || current.displayName || cachedIdentity?.displayName || '',
      ...(!current.cpf && cachedIdentity?.cpf ? { cpf: cachedIdentity.cpf, cpfValidated: Boolean(cachedIdentity.cpfValidated) } : {}),
      ...(!current.phone && cachedIdentity?.phone ? { phone: cachedIdentity.phone } : {}),
      ...(!current.birthDate && cachedIdentity?.birthDate ? { birthDate: cachedIdentity.birthDate } : {}),
      ...(isBootstrapAdmin(user.email) ? { role:'admin', admin:true, status:'ACTIVE' } : {}),
      affiliate: true,
      affiliateCode: current.affiliateCode || `AMORA${user.uid.slice(0, 6).toUpperCase()}`,
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('[ensureProfileOnLogin] update setDoc error:', e);
  }

  void syncPlayerToServer(user, current);
  void createAffiliateProfile(user.uid, user.email).catch(() => {});
}

async function createPlayerProfile(user: User, extra: Record<string, unknown> = {}) {
  if (!db) return;
  const ref = doc(db, 'users', user.uid);
  let snap: any = null;
  try {
    snap = await getDoc(ref);
  } catch (err) {
    console.warn('[createPlayerProfile] getDoc skipped or throttled by quota:', err);
  }

  const storedAttr = getStoredAffiliateAttribution();
  const explicitRef = typeof extra.referredBy === 'string' ? normalizeAffiliateCode(extra.referredBy) : '';
  const refCode = explicitRef || (storedAttr?.code ? normalizeAffiliateCode(storedAttr.code) : '') || normalizeAffiliateCode(getActiveReferralCode());
  const autoAffCode = `AMORA${user.uid.slice(0, 6).toUpperCase()}`;

  const affiliateData = refCode ? {
    referredBy: refCode,
    referredByUid: storedAttr?.affiliateUid || '',
    referralClickId: storedAttr?.clickId || null,
    referralSubId: storedAttr?.subId || null,
    referredAt: serverTimestamp(),
  } : {};

  if (snap && snap.exists()) {
    try {
      await setDoc(ref, {
        email: user.email || snap.data()?.email || '',
        displayName: user.displayName || snap.data()?.displayName || '',
        affiliate: true,
        affiliateCode: snap.data()?.affiliateCode || autoAffCode,
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...affiliateData,
        ...extra,
      }, { merge: true });
    } catch (e) {
      console.warn('[createPlayerProfile] update existing error:', e);
    }
    void syncPlayerToServer(user, { ...affiliateData, ...extra });
    void createAffiliateProfile(user.uid, user.email).catch(() => {});
    return;
  }

  try {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: isBootstrapAdmin(user.email) ? 'admin' : 'player',
      admin: isBootstrapAdmin(user.email),
      status: 'ACTIVE',
      kycStatus: 'NOT_STARTED',
      walletBalance: 0,
      balance: 0,
      affiliate: true,
      affiliateCode: autoAffCode,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...affiliateData,
      ...extra,
    }, { merge: true });
  } catch (e) {
    console.warn('[createPlayerProfile] initial setDoc error:', e);
  }

  void syncPlayerToServer(user, { ...affiliateData, ...extra });
  void createAffiliateProfile(user.uid, user.email).catch(() => {});

  if (refCode) {
    void trackAffiliateRegistration({ uid: user.uid, email: user.email }, refCode);
  }
}


export async function login(email: string, password: string, remember = true) {
  const instance = getAuthOrThrow();
  await setPersistence(instance, remember ? browserLocalPersistence : browserSessionPersistence);
  const credential = await signInWithEmailAndPassword(instance, email.trim(), password);
  await ensureProfileOnLogin(credential.user);
  return credential;
}

export async function register(
  name: string,
  email: string,
  password: string,
  consent: { adult: boolean; terms: boolean },
  identity?: {
    cpf?: string;
    cpfValidated?: boolean;
    birthDate?: string;
    gender?: string;
    apiName?: string;
    phone?: string;
    referralCode?: string;
  }
) {
  const instance = getAuthOrThrow();
  await setPersistence(instance, browserLocalPersistence);

  const credential = await createUserWithEmailAndPassword(instance, email.trim(), password);
  const cleanName = name.trim();

  if (cleanName) {
    await updateProfile(credential.user, { displayName: cleanName });
  }

  const cleanRef = identity?.referralCode ? normalizeAffiliateCode(identity.referralCode) : undefined;

  await createPlayerProfile(credential.user, {
    displayName: cleanName,
    adultConfirmed: Boolean(consent.adult),
    termsAccepted: Boolean(consent.terms),
    termsAcceptedAt: serverTimestamp(),
    cpf: identity?.cpf || '',
    cpfValidated: Boolean(identity?.cpfValidated),
    birthDate: identity?.birthDate || '',
    gender: identity?.gender || '',
    cpfApiName: identity?.apiName || '',
    phone: identity?.phone || '',
    ...(cleanRef ? { referredBy: cleanRef } : {}),
  });

  // Mantém uma cópia local apenas dos dados necessários ao pagamento para que
  // um snapshot do Firestore ainda em trânsito nunca bloqueie a geração do PIX.
  cachePaymentIdentity(credential.user.uid, {
    cpf: identity?.cpf || '',
    cpfValidated: Boolean(identity?.cpfValidated),
    phone: identity?.phone || '',
    displayName: cleanName,
    email: credential.user.email || email.trim(),
    birthDate: identity?.birthDate || '',
  });

  try {
    await sendEmailVerification(credential.user);
  } catch {
    // A conta continua válida mesmo se o envio de verificação estiver indisponível.
  }

  return credential;
}

export async function loginWithGoogle() {
  const instance = getAuthOrThrow();
  await setPersistence(instance, browserLocalPersistence);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(instance, provider);
  await ensureProfileOnLogin(credential.user);
  return credential;
}

export async function resendVerification(user?: User | null) {
  const current = user || getAuthOrThrow().currentUser;
  if (!current) throw new Error('Nenhum usuário autenticado.');
  await sendEmailVerification(current);
}

export async function resetPassword(email: string) {
  if (!email.trim()) throw new Error('Informe seu e-mail para recuperar a senha.');
  await sendPasswordResetEmail(getAuthOrThrow(), email.trim());
}

export const logout = () => auth ? signOut(auth) : Promise.resolve();

export const subscribeAuth = (cb: (user: User | null) => void) =>
  auth ? onAuthStateChanged(auth, cb) : (() => { cb(null); return () => undefined; })();
