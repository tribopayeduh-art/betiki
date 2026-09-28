import { useState, useEffect } from "react";
import { adminApi } from "../../lib/adminApi";
import { PageTitle } from "./AdminComponents";

export default function TrackingPage() {
  const [form, setForm] = useState<any>({
    enabled: true, metaPixelId: "", metaAccessToken: "", tiktokPixelId: "", tiktokAccessToken: "",
    googleAdsId: "", googleConversions: { SignUp: "", Deposit: "", Purchase: "" }
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    adminApi<any>("/api/admin/integrations/tracking").then(d => setForm((x: any) => ({
      ...x, ...d.config, googleConversions: { ...x.googleConversions, ...(d.config?.googleConversions || {}) }
    }))).catch(e => setMsg(e.message));
  }, []);

  const set = (k: string, v: any) => setForm((x: any) => ({ ...x, [k]: v }));
  const conv = (k: string, v: string) => setForm((x: any) => ({ ...x, googleConversions: { ...(x.googleConversions || {}), [k]: v } }));

  async function save() {
    try {
      await adminApi("/api/admin/integrations/tracking", { method: "PATCH", body: JSON.stringify(form) });
      setMsg("Configuração de tracking salva.");
    } catch (e: any) { setMsg(e.message); }
  }

  return <>
    <PageTitle eyebrow="GROWTH" title="Ads & Tracking" text="Configure Meta Pixel, TikTok Pixel e Google Ads." action={<button className="admin-primary" onClick={save}>Salvar integrações</button>} />
    <div className="integration-grid">
      <section className="admin-card integration-card">
        <div className="integration-brand"><span className="meta-logo">f</span><div><h3>Meta Ads</h3><p>Facebook / Instagram Pixel</p></div></div>
        <label className="admin-field"><span>Pixel ID</span><input value={form.metaPixelId || ""} onChange={e => set("metaPixelId", e.target.value)} /></label>
        <label className="admin-field"><span>Access Token (Conversions API)</span><input type="password" value={form.metaAccessToken || ""} onChange={e => set("metaAccessToken", e.target.value)} /></label>
      </section>
      <section className="admin-card integration-card">
        <div className="integration-brand"><span className="tiktok-logo">TT</span><div><h3>TikTok Ads</h3><p>Pixel + Events API</p></div></div>
        <label className="admin-field"><span>Pixel ID</span><input value={form.tiktokPixelId || ""} onChange={e => set("tiktokPixelId", e.target.value)} /></label>
        <label className="admin-field"><span>Events API Token</span><input type="password" value={form.tiktokAccessToken || ""} onChange={e => set("tiktokAccessToken", e.target.value)} /></label>
      </section>
      <section className="admin-card integration-card">
        <div className="integration-brand"><span className="google-logo">G</span><div><h3>Google Ads</h3><p>Google tag + conversões</p></div></div>
        <label className="admin-field"><span>Google Ads ID</span><input value={form.googleAdsId || ""} onChange={e => set("googleAdsId", e.target.value)} placeholder="AW-XXXXXXXXX" /></label>
        <div className="admin-form-grid">
          <label className="admin-field"><span>Label Cadastro</span><input value={form.googleConversions?.SignUp || ""} onChange={e => conv("SignUp", e.target.value)} /></label>
          <label className="admin-field"><span>Label Depósito</span><input value={form.googleConversions?.Deposit || ""} onChange={e => conv("Deposit", e.target.value)} /></label>
        </div>
      </section>
    </div>
    <section className="admin-card tracking-events-card">
      <h3>Eventos preparados</h3>
      <div className="tracking-event-chips">
        {["PageView", "SignUp", "Login", "ViewContent", "GameLaunch", "DepositIntent", "Deposit", "WithdrawRequest", "BannerClick", "SupportOpen"].map(x => <span key={x}>{x}</span>)}
      </div>
    </section>
    {msg && <div className="admin-message">{msg}</div>}
  </>;
}
