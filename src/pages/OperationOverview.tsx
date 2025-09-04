import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, ArrowLeft, Edit } from 'lucide-react';

interface User {
  name: string;
  role: string;
}

type OperationStatus = 'Aberta' | 'Fechada';
type ContainerStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';

interface ContainerRow {
  id: string;
  lacreAgencia?: string;
  lacrePrincipal?: string;
  lacreOutros?: string;
  qtdSacarias?: number;
  terminal?: string;
  data?: string; // yyyy-mm-dd
  status?: ContainerStatus;
}

const seedRows: ContainerRow[] = [
  { id: 'ABCD 123456-1', lacreAgencia: 'AG-1001', lacrePrincipal: 'LP-2001', lacreOutros: '', qtdSacarias: 10, terminal: 'Terminal 1', data: '2025-09-15', status: 'em_andamento' },
  { id: 'EFGH 789012-3', lacreAgencia: 'AG-1002', lacrePrincipal: 'LP-2002', lacreOutros: 'ALT-9', qtdSacarias: 8, terminal: 'Terminal 2', data: '2025-09-16', status: 'nao_iniciado' },
];

const OperationOverview: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useParams();
  const decodedOperationId = useMemo(() => (operationId ? decodeURIComponent(operationId) : ''), [operationId]);

  const user: User = { name: 'Carlos Oliveira', role: 'Administrador' };

  const [rows, setRows] = useState<ContainerRow[]>(seedRows);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContainerRow | null>(null);
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('Aberta');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.id.toLowerCase().includes(q));
  }, [rows, search]);

  const startEdit = (containerId: string) => {
    const current = rows.find((r) => r.id === containerId);
    if (current) {
      setEditingId(containerId);
      setDraft({ ...current });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!editingId || !draft) return;
    setRows((prev) => prev.map((r) => (r.id === editingId ? { ...draft } : r)));
    setEditingId(null);
    setDraft(null);
  };

  const handleBack = () => {
    navigate(`/operations/${encodeURIComponent(decodedOperationId)}`);
  };

  const handlePageChange = (pageId: string): void => {
    switch (pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':
        navigate('/operations');
        break;
      case 'perfil':
        navigate('/profile');
        break;
      case 'usuarios':
        navigate('/users');
        break;
      case 'relatorios':
        navigate('/reports');
        break;
      case 'cadastrar':
        navigate('/register-inspector');
        break;
      case 'logout':
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  const containerStatusCfg = (s?: ContainerStatus) => {
    const map: Record<ContainerStatus, { label: string; className: string }> = {
      nao_iniciado: { label: 'Não iniciado', className: 'bg-gray-100 text-gray-800' },
      em_andamento: { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800' },
      concluido: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
    };
    return s ? map[s] : map.nao_iniciado;
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar currentPage="operations" onPageChange={handlePageChange} user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Overview de Containers</h1>
              <p className="text-sm text-[var(--muted)]">Operação {decodedOperationId}</p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={operationStatus}
                onChange={(e) => setOperationStatus(e.target.value as OperationStatus)}
                className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                title="Status da operação"
              >
                <option value="Aberta">Aberta</option>
                <option value="Fechada">Fechada</option>
              </select>
              <button onClick={handleBack} className="inline-flex items-center px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </button>
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--hover)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{row.id}</td>
                      {editingId === row.id ? (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacreAgencia || ''}
                              onChange={(e) => setDraft((prev) => (prev ? { ...prev, lacreAgencia: e.target.value } : prev))}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="AG-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacrePrincipal || ''}
                              onChange={(e) => setDraft((prev) => (prev ? { ...prev, lacrePrincipal: e.target.value } : prev))}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="LP-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacreOutros || ''}
                              onChange={(e) => setDraft((prev) => (prev ? { ...prev, lacreOutros: e.target.value } : prev))}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Outros"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="number"
                              min={0}
                              value={draft?.qtdSacarias ?? 0}
                              onChange={(e) => setDraft((prev) => (prev ? { ...prev, qtdSacarias: Number(e.target.value) } : prev))}
                              className="w-24 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.terminal || ''}
                              onChange={(e) => setDraft((prev) => (prev ? { ...prev, terminal: e.target.value } : prev))}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Terminal"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="date"
                              value={draft?.data || ''}
                              onChange={(e) => setDraft((prev) => (prev ? { ...prev, data: e.target.value } : prev))}
                              className="px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <select
                              value={draft?.status || 'nao_iniciado'}
                              onChange={(e) => setDraft((prev) => (prev ? { ...prev, status: e.target.value as ContainerStatus } : prev))}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                              <option value="nao_iniciado">Não iniciado</option>
                              <option value="em_andamento">Em andamento</option>
                              <option value="concluido">Concluído</option>
                            </select>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacreAgencia || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacrePrincipal || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacreOutros || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.qtdSacarias ?? 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.terminal || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.data || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {(() => {
                              const cfg = containerStatusCfg(row.status);
                              return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cfg.className}`}>{cfg.label}</span>;
                            })()}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingId === row.id ? (
                          <div className="flex items-center gap-3 justify-center">
                            <button onClick={cancelEdit} className="text-[var(--muted)] hover:text-[var(--text)] transition-colors font-medium">Cancelar</button>
                            <button onClick={saveEdit} className="text-teal-600 hover:text-teal-800 transition-colors font-medium">Salvar</button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(row.id)} className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 transition-colors font-medium">
                            <Edit className="w-4 h-4" /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
              <button onClick={handleBack} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">Voltar</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OperationOverview;

