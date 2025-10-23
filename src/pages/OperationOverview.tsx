import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, Edit } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { computeStatus, getProgress, ContainerStatus } from '../services/containerProgress';
import { containerCountFor } from '../mock/operationData';

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



// Gera linhas mock com tamanho variável por operação
const generateRows = (count: number): ContainerRow[] => {
  const rows: ContainerRow[] = [];
  for (let i = 0; i < count; i++) {
    const num = 100001 + i;
    rows.push({
      id: `CNTR ${num}-${(i % 9) + 1}`,
      lacreAgencia: `AG-${1000 + i}`,
      lacrePrincipal: `LP-${2000 + i}`,
      lacreOutros: i % 3 === 0 ? `ALT-${i % 10}` : '',
      qtdSacarias: 6 + (i % 7),
      terminal: `Terminal ${1 + (i % 4)}`,
      data: `2025-09-${String(15 + (i % 15)).padStart(2, '0')}`,
    });
  }
  return rows;
};

const OperationOverview: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';

  const user: User = { name: 'Carlos Oliveira', role: 'Administrador' };
  const { changePage } = useSidebar();

  const [rows, setRows] = useState<ContainerRow[]>(() => generateRows(containerCountFor(decodedOperationId)));
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftRows, setDraftRows] = useState<ContainerRow[]>(rows);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);

  // Atualiza quando navega para outra operação
  useEffect(() => {
    const c = containerCountFor(decodedOperationId);
    const gen = generateRows(c);
    setRows(gen);
    setDraftRows(gen);
    setPage(1);
  }, [decodedOperationId]);

  type StatusKey = 'todos' | 'ni' | 'parcial' | 'completo';
  const [statusKey, setStatusKey] = useState<StatusKey>('todos');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.id.toLowerCase().includes(q)) : rows;
    if (statusKey === 'todos') return base;
    const target: ContainerStatus = statusKey === 'ni' ? 'Nao inicializado' : statusKey === 'parcial' ? 'Parcial' : 'Completo';
    return base.filter((r) => computeStatus(getProgress(r.id)) === target);
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
            <div className="w-full sm:w-64">
              <select
                value={statusKey}
                onChange={(e) => setStatusKey(e.target.value as any)}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="Filtrar por Status"
                title="Filtrar containers pelo status"
              >
                <option value="todos">Todos os Status</option>
                <option value="Nao inicializado">Nao inicializado</option>
                <option value="parcial">Parcial</option>
                <option value="completo">Completo</option>
              </select>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operação</h2>
              </div>
            </div>

            <div className="px-6 pt-2 text-sm text-[var(--muted)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>Total de containers: <span className="font-medium text-[var(--text)]">{rows.length}</span></div>
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Terminal</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Data</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                  {paginated.map((row) => {
                    const status = computeStatus(getProgress(row.id));
                    const badge = status === 'Completo'
                      ? 'bg-green-100 text-green-800'
                      : status === 'Parcial'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-200 text-gray-700';
                    return (
                    <tr key={row.id} className="hover:bg-[var(--hover)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{row.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm"><span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${badge}`}>{status}</span></td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
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
                  Próximo
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


























