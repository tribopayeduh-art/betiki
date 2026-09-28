import { useState, useEffect } from "react";
import { adminApi } from "../../lib/adminApi";
import { PageTitle, Status } from "./AdminComponents";

export default function StaffPage() {
  const [items, setItems] = useState<any[]>([]);

  const load = () => adminApi<any>("/api/admin/staff").then(d => setItems(d.staff || [])).catch(() => {});
  useEffect(() => { void load(); }, []);

  async function role(uid: string, roleName: string) {
    try {
      await adminApi(`/api/admin/staff/${uid}/role`, { method: "POST", body: JSON.stringify({ role: roleName }) });
      await load();
    } catch { }
  }

  async function disable(uid: string, disabled: boolean) {
    try {
      await adminApi(`/api/admin/staff/${uid}/disable`, { method: "POST", body: JSON.stringify({ disabled }) });
      await load();
    } catch { }
  }

  return <>
    <PageTitle eyebrow="ACESSOS" title="Equipe administrativa" text="Cargos e acesso das contas administrativas." />
    <div className="admin-card admin-table-wrap">
      <table>
        <thead><tr><th>Usuário</th><th>Cargo</th><th>Status</th><th>Alterar cargo</th><th>Ação</th></tr></thead>
        <tbody>
          {items.map(x => (
            <tr key={x.uid}>
              <td><b>{x.displayName || "Usuário"}</b><small>{x.email || x.uid}</small></td>
              <td><Status value={String(x.role).toUpperCase()} /></td>
              <td><Status value={x.disabled ? "BLOCKED" : "ACTIVE"} /></td>
              <td>
                <select value={x.role} onChange={e => role(x.uid, e.target.value)}>
                  <option value="admin">admin</option>
                  <option value="finance">finance</option>
                  <option value="support">support</option>
                  <option value="marketing">marketing</option>
                  <option value="risk">risk</option>
                  <option value="viewer">viewer</option>
                  <option value="user">user</option>
                </select>
              </td>
              <td>
                <button className="admin-secondary" onClick={() => disable(x.uid, !x.disabled)}>
                  {x.disabled ? "Reativar" : "Desativar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>;
}
