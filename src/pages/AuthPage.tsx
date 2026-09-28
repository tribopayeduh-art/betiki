import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, KeyRound,
  LockKeyhole, Mail, ShieldCheck, Sparkles, UserPlus, UserRound, LogIn, Phone,
  Network, Gift
} from 'lucide-react';
import { apiErrorMessage } from '../lib/apiError';
import { login, register, resetPassword } from '../lib/auth';
import { getActiveReferralCode, normalizeAffiliateCode } from '../lib/affiliateTracking';

type Mode = 'login' | 'register' | 'forgot';

function firebaseMessage(error: any) {
  const code = String(error?.code || '');
  if (code.includes('auth/email-already-in-use')) return 'Este e-mail já possui uma conta.';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'E-mail ou senha incorretos.';
  if (code.includes('auth/user-not-found')) return 'Não encontramos uma conta com este e-mail.';
  if (code.includes('auth/weak-password')) return 'Use uma senha com pelo menos 6 caracteres.';
  if (code.includes('auth/invalid-email')) return 'Informe um e-mail válido.';
  if (code.includes('auth/popup-closed-by-user')) return 'Login com Google cancelado.';
  if (code.includes('auth/popup-blocked')) return 'O navegador bloqueou a janela do Google. Permita popups e tente novamente.';
  if (code.includes('auth/too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  return error?.message || 'Não foi possível concluir a operação.';
}

function passwordScore(password: string) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(4, score);
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [referralCode, setReferralCode] = useState(() => getActiveReferralCode());
  const [visualTheme, setVisualTheme] = useState<any>({
    brandName: 'Borah Bet',
    logoUrl: '/borahlogo.png',
  });

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const strength = useMemo(() => passwordScore(password), [password]);
  const strengthLabel = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte'][strength];

  useEffect(() => {
    const activeRef = getActiveReferralCode();
    if (activeRef && !referralCode) {
      setReferralCode(activeRef);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/system/settings', { cache: 'no-store' })
      .then(async r => {
        if (!r.ok) throw new Error(`SETTINGS_HTTP_${r.status}`);
        return r.json();
      })
      .then(d => {
        if (cancelled) return;
        setVisualTheme((current:any) => ({
          ...current,
          ...(d?.settings?.visualTheme || {}),
        }));
      })
      .catch(() => {
        // Keep the local default theme if the public settings endpoint is unavailable.
      });
    return () => { cancelled = true; };
  }, []);



  function formatCpf(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }


  function changeMode(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);

    try {
      if (mode === 'login') {
        await login(email, password, remember);
        return;
      }

      if (mode === 'forgot') {
        await resetPassword(email);
        setNotice('Enviamos um link de recuperação para o seu e-mail.');
        return;
      }

      if (name.trim().length < 2) throw new Error('Informe seu nome completo.');
      const cpfDigits = cpf.replace(/\D/g, '');
      if (cpfDigits.length !== 11) throw new Error('Informe um CPF com exatamente 11 números.');
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 11) throw new Error('Informe um telefone válido com DDD.');
      if (password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');
      if (password !== confirm) throw new Error('As senhas não coincidem.');
      if (!adult) throw new Error('É necessário confirmar que você tem 18 anos ou mais.');
      if (!terms) throw new Error('Aceite os Termos de Uso e a Política de Privacidade.');

      await register(name, email, password, { adult, terms }, {
        cpf: cpf.replace(/\D/g, ''),
        cpfValidated: false,
        phone: phone.replace(/\D/g, ''),
        referralCode: (referralCode.trim() ? normalizeAffiliateCode(referralCode) : getActiveReferralCode()) || undefined,
      });
    } catch (e: any) {
      setError(firebaseMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page auth-v3">
      <section className="auth-showcase auth-showcase-v3">
        <img className="auth-showcase-image" src="/banners/desafio-tiger-home-v2.png" alt="" />
        <div className="auth-showcase-overlay"/>
        <div className="auth-showcase-brand">
          <img className="auth-brand-logo" src={visualTheme.logoUrl||"/borahlogo.png"} alt={visualTheme.brandName||"Borah Bet"} onError={e => { if (e.currentTarget.src !== "/borahlogo.png") e.currentTarget.src = "/borahlogo.png"; }}/>
        </div>

        <div className="auth-showcase-copy">
          <span className="auth-kicker"><Sparkles size={14}/> {visualTheme.brandName||"BORAH BET"}</span>
          <h1>Sua conta.<br/><strong>Seu acesso.</strong></h1>
          <p>Entre para acessar jogos, carteira, favoritos, histórico, promoções e suporte em uma experiência única.</p>

          <div className="auth-benefits">
            <div><Check size={15}/><span>Login protegido pelo Firebase Authentication</span></div>
            <div><Check size={15}/><span>Sessão sincronizada entre todas as áreas</span></div>
            <div><Check size={15}/><span>Perfil e preferências salvos no Firestore</span></div>
          </div>
          <div className="auth-proof-row">
            <div><b>PIX</b><span>Fluxo preparado</span></div>
            <div><b>+18</b><span>Controle de idade</span></div>
            <div><b>KYC</b><span>Verificação integrada</span></div>
          </div>
        </div>

        <div className="auth-responsible">
          <ShieldCheck size={17}/>
          <span><b>18+</b> Jogue com responsabilidade.</span>
        </div>
      </section>

      <section className="auth-panel auth-panel-v3">
        <div className="auth-mobile-brand">
          <img className="auth-brand-logo" src={visualTheme.logoUrl||"/borahlogo.png"} alt={visualTheme.brandName||"Borah Bet"} onError={e => { if (e.currentTarget.src !== "/borahlogo.png") e.currentTarget.src = "/borahlogo.png"; }}/>
        </div>

        <div className="auth-card auth-card-v3">
          {!isForgot && (
            <div className="auth-tabs">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>
                <LogIn size={14}/> Entrar
              </button>
              <button className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>
                <UserPlus size={14}/> Criar conta
              </button>
            </div>
          )}

          {isForgot && (
            <button className="auth-inline-back" onClick={() => changeMode('login')}>
              <ArrowLeft size={15}/> Voltar
            </button>
          )}

          {isRegister && <div className="auth-register-progress"><i className="done">1</i><span/><i className={terms && adult ? 'done' : ''}>2</i><small>Dados</small><small>Segurança</small></div>}
          <div className="auth-title">
            <span>{isForgot ? 'RECUPERAÇÃO DE CONTA' : isRegister ? 'COMECE AGORA' : 'BEM-VINDO DE VOLTA'}</span>
            <h2>{isForgot ? 'Recupere sua senha' : isRegister ? 'Crie sua conta' : `Entre na ${visualTheme.brandName || 'Borah Bet'}`}</h2>
            <p>{isForgot ? 'Digite o e-mail cadastrado e enviaremos as instruções.' : isRegister ? 'Cadastro rápido, seguro e integrado ao Firebase.' : 'Digite seus dados para acessar sua conta.'}</p>
          </div>

          <form onSubmit={submit} className="auth-form">

            {isRegister && (
              <label className="auth-input">
                <span>Nome completo</span>
                <div>
                  <UserRound size={17}/>
                  <input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Como podemos te chamar?" required/>
                </div>
              </label>
            )}

            {isRegister && (
              <label className="auth-input">
                <span>CPF</span>
                <div>
                  <UserRound size={17}/>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    value={cpf}
                    onChange={e => setCpf(formatCpf(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    minLength={11}
                    required
                  />
                </div>
                <small>Informe os 11 números do CPF. Não há consulta automática a serviço externo.</small>
              </label>
            )}

            {isRegister && (
              <label className="auth-input">
                <span>Telefone com DDD</span>
                <div>
                  <Phone size={17}/>
                  <input
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => setPhone(formatPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    maxLength={15}
                    required
                  />
                </div>
              </label>
            )}

            <label className="auth-input">
              <span>E-mail</span>
              <div>
                <Mail size={17}/>
                <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" required/>
              </div>
            </label>

            {!isForgot && (
              <label className="auth-input">
                <span>Senha</span>
                <div>
                  <LockKeyhole size={17}/>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isRegister ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isRegister ? 'Crie uma senha segura' : 'Digite sua senha'}
                    minLength={6}
                    required
                  />
                  <button type="button" className="auth-eye" onClick={() => setShowPassword(v => !v)} aria-label="Mostrar ou ocultar senha">
                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </label>
            )}

            {isRegister && (
              <>
                <div className="password-strength">
                  <div className="password-strength-top">
                    <span>Segurança da senha</span>
                    <b>{password ? strengthLabel : '—'}</b>
                  </div>
                  <div className={`password-bars score-${strength}`}>
                    <i/><i/><i/><i/>
                  </div>
                </div>

                <label className="auth-input">
                  <span>Confirmar senha</span>
                  <div>
                    <KeyRound size={17}/>
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Digite novamente" minLength={6} required/>
                    {confirm && password === confirm && <CheckCircle2 className="auth-valid" size={17}/>}
                  </div>
                </label>

                {referralCode && (
                  <div
                    id="auth-affiliate-tracked-badge"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(34, 197, 94, 0.12)",
                      border: "1px solid rgba(34, 197, 94, 0.25)",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#4ade80",
                    }}
                  >
                    <CheckCircle2 size={16} style={{ color: "#22c55e", flexShrink: 0 }} />
                    <span>
                      Link de parceiro ativo: <b>{referralCode}</b> <small style={{ color: "rgba(255,255,255,0.7)" }}>(Vinculado automaticamente)</small>
                    </span>
                  </div>
                )}

                <div className="auth-checks">
                  <label>
                    <input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)}/>
                    <span>Confirmo que tenho <b>18 anos ou mais</b>.</span>
                  </label>
                  <label>
                    <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)}/>
                    <span>Li e aceito os <b>Termos de Uso</b> e a <b>Política de Privacidade</b>.</span>
                  </label>
                </div>
              </>
            )}

            {mode === 'login' && (
              <div className="auth-login-options">
                <label className="remember-me">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/>
                  <span>Lembrar de mim</span>
                </label>
                <button type="button" onClick={() => changeMode('forgot')}>Esqueci minha senha</button>
              </div>
            )}

            {error && <div className="error-box auth-message">{error}</div>}
            {notice && <div className="success-box auth-message">{notice}</div>}

            <button className="auth-submit auth-submit-v3" disabled={busy}>
              {mode === 'login' ? <LogIn size={17}/> : mode === 'register' ? <UserPlus size={17}/> : <KeyRound size={17}/>}
              <span>{busy ? 'AGUARDE...' : mode === 'login' ? 'ENTRAR NA MINHA CONTA' : mode === 'register' ? 'CRIAR MINHA CONTA' : 'ENVIAR LINK DE RECUPERAÇÃO'}</span>
              {!busy && <ArrowRight size={17}/>}
            </button>
          </form>

          {!isForgot && (
            <div className="auth-switch-bottom">
              {isRegister ? 'Já possui uma conta?' : 'Ainda não possui uma conta?'}
              <button onClick={() => changeMode(isRegister ? 'login' : 'register')}>
                {isRegister ? 'Entrar agora' : 'Criar conta grátis'}
              </button>
            </div>
          )}

          <div className="auth-security-note">
            <ShieldCheck size={16}/>
            <span>Autenticação, sessão e recuperação de senha são processadas pelo Firebase. Credenciais da iGameWin permanecem somente no backend.</span>
          </div>
        </div>

        <div className="auth-footer-v3">
          <span>18+</span>
          <p>Jogue com responsabilidade. Ganhos não são garantidos.</p>
        </div>
      </section>
    </div>
  );
}
