import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, Edit } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';

interface User { name: string; role: string; }

interface ContainerRow {
  id: string;
  lacreAgencia?: string;
  lacrePrincipal?: string;
  lacreOutros?: string;
  qtdSacarias?: number;
  terminal?: string;
  data?: string; // yyyy-mm-dd
}

const seedRows: ContainerRow[] = [
  { id: 'ABCD 123456-1', lacreAgencia: 'AG-1001', lacrePrincipal: 'LP-2001', lacreOutros: '', qtdSacarias: 10, terminal: 'Terminal 1', data: '2025-09-15' },
  { id: 'EFGH 789012-3', lacreAgencia: 'AG-1002', lacrePrincipal: 'LP-2002', lacreOutros: 'ALT-9', qtdSacarias: 8, terminal: 'Terminal 2', data: '2025-09-16' },
];

const OperationOverview: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';

  const user: User = { name: 'Carlos Oliveira', role: 'Administrador' };
  const { changePage } = useSidebar();

  const [rows, setRows] = useState<ContainerRow[]>(seedRows);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftRows, setDraftRows] = useState<ContainerRow[]>(rows);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.id.toLowerCase().includes(q));
  }, [rows, search]);

  const startEditAll = () => { setDraftRows(rows); setIsEditing(true); };
  const cancelEditAll = () => { setIsEditing(false); setDraftRows(rows); };
  const saveEditAll = () => { setRows(draftRows); setIsEditing(false); };

  const updateDraft = (id: string, patch: Partial<ContainerRow>) => {
    setDraftRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleBack = () => {
    navigate(`/operations/${encodeURIComponent(decodedOperationId)}`);
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Overview de Containers</h1>
              <p className="text-sm text-[var(--muted)]">Operação {decodedOperationId}</p>
            </div>
            <div className="flex items-center gap-3">
              <div onClick={() => changePage('perfil')} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-[var(--surface)] text-[var(--text)]"
                placeholder="Pesquisar por container..."
              />
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operação</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-[var(--hover)]">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Container</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Lacre Agência</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Lacre Principal</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Lacre Outros</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Qtd. Sacarias</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Terminal</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--hover)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{row.id}</td>
                      {isEditing ? (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draftRows.find(r => r.id === row.id)?.lacreAgencia || ''}
                              onChange={(e) => updateDraft(row.id, { lacreAgencia: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="AG-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draftRows.find(r => r.id === row.id)?.lacrePrincipal || ''}
                              onChange={(e) => updateDraft(row.id, { lacrePrincipal: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="LP-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draftRows.find(r => r.id === row.id)?.lacreOutros || ''}
                              onChange={(e) => updateDraft(row.id, { lacreOutros: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Outros"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="number"
                              min={0}
                              value={draftRows.find(r => r.id === row.id)?.qtdSacarias ?? 0}
                              onChange={(e) => updateDraft(row.id, { qtdSacarias: Number(e.target.value) })}
                              className="w-24 px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draftRows.find(r => r.id === row.id)?.terminal || ''}
                              onChange={(e) => updateDraft(row.id, { terminal: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Terminal"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="date"
                              value={draftRows.find(r => r.id === row.id)?.data || ''}
                              onChange={(e) => updateDraft(row.id, { data: e.target.value })}
                              className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacreAgencia || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacrePrincipal || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacreOutros || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)]">{row.qtdSacarias ?? 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.terminal || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.data || '-'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
              {!isEditing ? (
                <button onClick={startEditAll} className="inline-flex items-center px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </button>
              ) : (
                <>
                  <button onClick={cancelEditAll} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">Cancelar</button>
                  <button onClick={saveEditAll} className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors">Salvar</button>
                </>
              )}
              <button onClick={handleBack} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">Voltar</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OperationOverview;

