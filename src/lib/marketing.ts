import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
type MarketingConfig = {
  enabled?: boolean;
  metaPixelId?: string;
  tiktokPixelId?: string;
  googleAdsId?: string;
  googleConversions?: Record<string,string>;
};

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    dataLayer?: any[];
    gtag?: (...args:any[]) => void;
  }
}

let loaded = false;
let config: MarketingConfig = {};

function appendScript(src:string, id:string) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.async = true; s.src = src; s.id = id;
  document.head.appendChild(s);
}

function loadMeta(pixelId:string) {
  if (!pixelId || window.fbq) return;
  const f:any = function(...args:any[]){ f.callMethod ? f.callMethod.apply(f,args) : f.queue.push(args); };
  window.fbq = f; window._fbq = f; f.push=f; f.loaded=true; f.version='2.0'; f.queue=[];
  appendScript('https://connect.facebook.net/en_US/fbevents.js','amora-meta-pixel');
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

function loadTikTok(pixelId:string) {
  if (!pixelId || window.ttq) return;
  const w:any = window;
  const ttq:any = w.ttq = w.ttq || [];
  ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
  ttq.setAndDefer = (t:any,m:string) => { t[m] = (...args:any[]) => { t.push([m,...args]); }; };
  for (const m of ttq.methods) ttq.setAndDefer(ttq,m);
  ttq.instance=(i:string)=>{ const t=ttq._i[i]||[]; for(const m of ttq.methods)ttq.setAndDefer(t,m); return t; };
  ttq.load=(i:string)=> {
    const src=`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(i)}&lib=ttq`;
    appendScript(src,'amora-tiktok-pixel');
    ttq._i=ttq._i||{}; ttq._i[i]=[]; ttq._i[i]._u=src;
    ttq._t=ttq._t||{}; ttq._t[i]=+new Date(); ttq._o=ttq._o||{}; ttq._o[i]={};
  };
  ttq.load(pixelId); ttq.page();
}

function loadGoogle(id:string) {
  if (!id) return;
  appendScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`,'amora-google-ads');
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(...args:any[]){ window.dataLayer!.push(args); };
  window.gtag('js', new Date());
  window.gtag('config', id);
}

export async function initMarketingTracking() {
  if (loaded) return config;
  try {
    const r = await fetch('/api/integrations/tracking');
    const d = await r.json();
    config = d.config || {};
  } catch {}

  // Fallback direto no documento público quando o backend local não possui Service Account.
  if ((!config.metaPixelId && !config.tiktokPixelId && !config.googleAdsId) && db) {
    try {
      const snap = await getDoc(doc(db, "public_config", "marketing_tracking"));
      config = snap.data() || {};
    } catch {}
  }

  if (config.enabled === false) return config;
  loadMeta(String(config.metaPixelId||''));
  loadTikTok(String(config.tiktokPixelId||''));
  loadGoogle(String(config.googleAdsId||''));
  loaded = true;
  return config;
}

export function trackMarketingEvent(name:string, params:Record<string,any>={}) {
  if (config.enabled === false) return;
  try { window.fbq?.('trackCustom', name, params); } catch {}
  try { window.ttq?.track?.(name, params); } catch {}
  try {
    window.gtag?.('event', name, params);
    const label = config.googleConversions?.[name];
    if (label && config.googleAdsId) {
      window.gtag?.('event','conversion',{send_to:`${config.googleAdsId}/${label}`,...params});
    }
  } catch {}
}
