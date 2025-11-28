import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, Edit } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { getContainersByOperation, type ApiContainer, type ApiContainerStatus } from '../services/containers';

interface ContainerRow {
  id: string;
  status?: ApiContainerStatus;
  lacreAgencia?: string;
  lacrePrincipal?: string;
  lacreOutros?: string;
  qtdSacarias?: number;
  pesoBruto?: number;
  pesoLiquido?: number;
}

const mapApiContainer = (c: ApiContainer, index: number): ContainerRow => {
  const status = (c.status as ApiContainerStatus | undefined) || undefined;
  return {
    id: String(c.containerId || c.id || `CONT-${index + 1}`),
    status,
    lacreAgencia: c.agencySeal || '',
    lacrePrincipal: c.agencySeal || '',
    lacreOutros: (c.otherSeals || []).join(', '),
    qtdSacarias: typeof c.sacksCount === 'number' ? c.sacksCount : undefined,
    pesoBruto: typeof c.grossWeight === 'number' ? c.grossWeight : undefined,
    pesoLiquido: typeof c.liquidWeight === 'number' ? c.liquidWeight : undefined,
  };
};

const statusDisplay = (status?: ApiContainerStatus) => {
  const norm = String(status || '').toUpperCase();
  if (norm === 'COMPLETED') return { label: 'Finalizado', className: 'bg-green-100 text-green-800' };
  if (norm === 'PENDING') return { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' };
  if (norm === 'OPEN') return { label: 'Aberto', className: 'bg-gray-200 text-gray-700' };
  return { label: '-', className: 'bg-gray-200 text-gray-700' };
};

const OperationOverview: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';

  const user = useSessionUser({ role: 'Administrador' });
  const { changePage } = useSidebar();

  const [rows, setRows] = useState<ContainerRow[]>([]);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftRows, setDraftRows] = useState<ContainerRow[]>([]);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Atualiza quando navega para outra operacao
  useEffect(() => {
    setRows([]);
    setDraftRows([]);
    setPage(1);
  }, [decodedOperationId]);

  useEffect(() => {
    const load = async () => {
      if (!decodedOperationId) return;
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getContainersByOperation(decodedOperationId, { page: 0, size: 500, sortBy: 'id', sortDirection: 'ASC' });
        const mapped = (data?.content || []).map(mapApiContainer);
        setRows(mapped);
        setDraftRows(mapped);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Nao foi possivel carregar os containers.';
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [decodedOperationId]);

  type StatusKey = 'todos' | 'ni' | 'parcial' | 'completo';
  const [statusKey, setStatusKey] = useState<StatusKey>('todos');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.id.toLowerCase().includes(q)) : rows;
    if (statusKey === 'todos') return base;

    const matchesStatus = (status?: ApiContainerStatus) => {
      const norm = String(status || '').toUpperCase();
      if (statusKey === 'ni') return norm === 'OPEN';
      if (statusKey === 'parcial') return norm === 'PENDING';
      if (statusKey === 'completo') return norm === 'COMPLETED';
      return true;
    };

    return base.filter((r) => matchesStatus(r.status));
  }, [rows, search, statusKey]);

  const sorted = useMemo(() => filtered, [filtered]);

  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, totalFiltered);
  const paginated = useMemo(() => sorted.slice(startIdx, endIdx), [sorted, startIdx, endIdx]);

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
              <p className="text-sm text-[var(--muted)]">Operacao {decodedOperationId}</p>
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
            <div className="w-full sm:w-64">
              <select
                value={statusKey}
                onChange={(e) => setStatusKey(e.target.value as StatusKey)}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Filtrar por Status"
                title="Filtrar containers pelo status"
              >
                <option value="todos">Todos os Status</option>
                <option value="ni">Nao inicializado</option>
                <option value="parcial">Parcial</option>
                <option value="completo">Completo</option>
              </select>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operacao</h2>
              </div>
            </div>

            <div className="px-6 pt-2 text-sm text-[var(--muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              {loadError && <div className="text-red-600">{loadError}</div>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-[var(--hover)]">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Container</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Lacre Agencia</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Lacre Principal</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Lacre Outros</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Qtd. Sacarias</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Peso Bruto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Peso Liquido</th>
                </tr>
              </thead>
              <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                {paginated.map((row) => {
                    const { label: statusLabel, className: badge } = statusDisplay(row.status);
                    const draft = draftRows.find(r => r.id === row.id);
                    return (
                    <tr key={row.id} className="hover:bg-[var(--hover)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{row.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${badge}`}>{statusLabel}</span></td>
                      {isEditing ? (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacreAgencia || ''}
                              onChange={(e) => updateDraft(row.id, { lacreAgencia: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="AG-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacrePrincipal || ''}
                              onChange={(e) => updateDraft(row.id, { lacrePrincipal: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="LP-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacreOutros || ''}
                              onChange={(e) => updateDraft(row.id, { lacreOutros: e.target.value })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Outros"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="number"
                              min={0}
                              value={draft?.qtdSacarias ?? 0}
                              onChange={(e) => updateDraft(row.id, { qtdSacarias: Number(e.target.value) })}
                              className="w-24 px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="number"
                              min={0}
                              value={draft?.pesoBruto ?? 0}
                              onChange={(e) => updateDraft(row.id, { pesoBruto: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Peso bruto"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="number"
                              min={0}
                              value={draft?.pesoLiquido ?? 0}
                              onChange={(e) => updateDraft(row.id, { pesoLiquido: Number(e.target.value) })}
                              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Peso liquido"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacreAgencia || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacrePrincipal || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.lacreOutros || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)]">{row.qtdSacarias ?? 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.pesoBruto ?? '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{row.pesoLiquido ?? '-'}</td>
                        </>
                      )}
                    </tr>
                    );
                  })}
                  {loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-sm text-[var(--muted)]">
                        Carregando containers...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
              <div className="text-sm text-[var(--muted)]">
                {totalFiltered === 0 ? (
                  <span>Mostrando 0 a 0 de 0</span>
                ) : (
                  <span>
                    Mostrando <span className="font-medium">{startIdx + 1}</span> a <span className="font-medium">{endIdx}</span> de <span className="font-medium">{totalFiltered}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Proximo
                </button>
              </div>
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
