import { useState, useEffect } from "react";
import {
  RefreshCw, Users, CircleDollarSign, TrendingUp, TrendingDown,
  Banknote, Activity, BarChart3, TicketCheck
} from "lucide-react";
import { adminApi } from "../../lib/adminApi";
import { PageTitle, Metric, AdminError, SimpleTable, money, fmtDate } from "./AdminComponents";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [finance, setFinance] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = async () => {
    setError(""); setRefreshing(true);
    const results = await Promise.allSettled([
      adminApi("/api/admin/dashboard"),
      adminApi("/api/admin/finance/dashboard"),
      adminApi("/api/admin/operations/health")
    ]);
    if (results[0].status === "fulfilled") setData(results[0].value);
    if (results[1].status === "fulfilled") setFinance(results[1].value);
    if (results[2].status === "fulfilled") setHealth((results[2].value as any).health);
    if (results.some(result => result.status === "rejected")) setError("Alguns dados não puderam ser atualizados. Os outros blocos continuam disponíveis.");
    setUpdatedAt(new Date()); setRefreshing(false);
  };
  useEffect(() => { load(); }, []);

  const m = data?.metrics || {};
  const f = finance?.summary || {};

  return <>
    <PageTitle eyebrow="CENTRAL DE OPERAÇÃO" title="Visão geral" text="Cockpit da Borah Bet: usuários, financeiro, jogos, suporte e integrações." action={<button className="admin-primary" onClick={load} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "admin-spin" : ""} /> {refreshing ? "Atualizando..." : "Atualizar"}</button>} />
    {updatedAt && <p className="admin-data-timestamp">Última atualização: {updatedAt.toLocaleTimeString("pt-BR")}</p>}
    {error && <AdminError text={error} />}
    <div className="admin-dashboard-actions" aria-label="Acessos rápidos">
      {[
        ["users", "Gerenciar jogadores", Users], ["finance", "Ver financeiro", CircleDollarSign],
        ["dotfy", "Configurar PIX", Banknote], ["tracking", "Pixels e Utmify", Activity],
        ["reports", "Abrir relatórios", BarChart3], ["settings", "Configurações", TicketCheck]
      ].map(([id, label, Icon]: any) => <a key={id} href={`#admin/${id}`}><Icon size={17}/><span>{label}</span></a>)}
    </div>
    <div className="admin-health-strip">
      <div><i className={health?.backend ? "on" : "off"} /><span>Backend</span><b>{health?.backend ? "ONLINE" : "OFFLINE"}</b></div>
      <div><i className={health?.firebase ? "on" : "off"} /><span>Firebase</span><b>{health?.firebase ? "ONLINE" : "VERIFICAR"}</b></div>
      <div><i className={health?.igamewin ? "on" : "off"} /><span>iGameWin</span><b>{health?.igamewin ? "ONLINE" : health?.igamewinConfigured ? "ERRO" : "NÃO CONFIG."}</b></div>
    </div>
    <div className="admin-metrics">
      <Metric icon={Users} label="Jogadores" value={m.users ?? "—"} hint={`${m.activePlayers ?? 0} ativos`} />
      <Metric icon={CircleDollarSign} label="Saldo em carteiras" value={money(m.totalWallet)} hint="Saldo registrado" />
      <Metric icon={TrendingUp} label="Depósitos pagos" value={money(f.depositPaid)} hint={`${f.paidDepositsCount || 0} transações`} />
      <Metric icon={TrendingDown} label="Saques pagos" value={money(f.withdrawPaid)} hint={`${f.paidWithdrawalsCount || 0} transações`} />
      <Metric icon={Banknote} label="Fluxo líquido" value={money(f.netCashFlow)} hint="Cash flow" />
      <Metric icon={Activity} label="Apostas" value={money(m.betVolume)} hint={`Prêmios ${money(m.winVolume)}`} />
      <Metric icon={BarChart3} label="GGR aproximado" value={money(m.ggrApprox)} hint="Apostas - prêmios" />
      <Metric icon={TicketCheck} label="Tickets abertos" value={m.openTickets ?? "—"} hint="Atendimento" />
    </div>
    <div className="admin-two-cols">
      <SimpleTable title="Movimentações recentes" rows={(data?.recentPayments || []).map((x: any) => [x.type, money(x.amount), x.status, fmtDate(x.createdAt)])} headers={["Tipo", "Valor", "Status", "Data"]} />
      <SimpleTable title="Transações de jogo" rows={(data?.recentGameTransactions || []).map((x: any) => [x.type, money(x.amount), x.game_code || "—", money(x.new_balance)])} headers={["Evento", "Valor", "Jogo", "Saldo"]} />
    </div>
  </>;
}
