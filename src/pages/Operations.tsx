import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Upload, FileText, RefreshCcw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { getOperationStatus, type OperationStatus } from '../services/operationStatus';
import { listOperations, type ApiOperation } from '../services/operations';
import { getContainersByOperation } from '../services/containers';

interface User { name: string; role: string; }

interface OperationItem {
  id: string;
  ctv: string;
  reserva: string;
  shipName: string;
  date: string; // ISO or string
  status: OperationStatus;
  containerCount?: number;
}

const formatDate = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

const normalizeStatus = (value: unknown): OperationStatus => {
  const text = String(value ?? '').toUpperCase();
  if (text === 'COMPLETED' || text.includes('FINAL') || text.includes('FECH')) return 'Fechada';
  return 'Aberta';
};

const parseDateValue = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') return value;
  return '';
};

const mapApiOperation = (op: ApiOperation): OperationItem => {
  const idValue =
    op.id ??
    op.code ??
    op.booking ??
    op.bookingCode ??
    op.reserva ??
    op.reservation ??
    op.ctv ??
    op.amv ??
    '---';
  const id = String(idValue);

  const ctv = String(
    op.ctv ??
      op.amv ??
      op.ship ??
      op.code ??
      op.booking ??
      op.bookingCode ??
      op.reserva ??
      op.reservation ??
      id
  );
  const reserva = String(
    op.reserva ?? op.reservation ?? op.booking ?? op.bookingCode ?? op.code ?? ''
  );
  const shipName = String(
    op.shipName ?? op.ship ?? op.vesselName ?? op.vessel ?? op.navio ?? id
  );
  const dateSource =
    parseDateValue(op.updatedAt) ||
    parseDateValue(op.createdAt) ||
    parseDateValue(op.arrivalDate) ||
    parseDateValue(op.deadline) ||
    parseDateValue(op.deadlineDraft) ||
    parseDateValue(op.loadDeadline) ||
    parseDateValue(op.data) ||
    parseDateValue(op.entrega);

  const baseStatus = normalizeStatus(op.status);
  const persistedStatus = getOperationStatus(id);
  const status = persistedStatus ?? baseStatus;

  const containerCount =
    op.containerCount ??
    (Array.isArray(op.containers) ? op.containers.length : undefined) ??
    (Array.isArray(op.containerList) ? op.containerList.length : undefined);

  return {
    id,
    ctv,
    reserva: reserva || '---',
    shipName,
    date: dateSource,
    status,
    containerCount,
  };
};

const StatusBadge: React.FC<{ status: OperationStatus }> = ({ status }) => {
  const map = {
    Aberta: { label: 'Aberta', className: 'bg-green-100 text-green-800' },
    Fechada: { label: 'Fechada', className: 'bg-blue-100 text-blue-800' },
  } as const;
  const cfg = map[status] ?? map.Aberta;
  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cfg.className}`}>{cfg.label}</span>;
};

const Operations: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });

  const PAGE_SIZE = 10;
  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aberta' | 'fechada'>('todos');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalOperations, setTotalOperations] = useState(0);
  const [listError, setListError] = useState<string | null>(null);

  const fetchOperations = useCallback(
    async (targetPage = 0) => {
      setLoading(true);
      setListError(null);
      try {
        const data = await listOperations({ page: targetPage, size: PAGE_SIZE, sortBy: 'id', sortDirection: 'ASC' });
        const mapped = (data?.content ?? []).map(mapApiOperation);

        const operationsWithCount = await Promise.all(
          mapped.map(async (op) => {
            if (op.containerCount !== undefined && op.containerCount !== null) {
              return op;
            }
            try {
              const pageData = await getContainersByOperation(op.id, {
                page: 0,
                size: 1,
                sortBy: 'id',
                sortDirection: 'ASC',
              });
              const count = pageData?.totalElements ?? (Array.isArray(pageData?.content) ? pageData.content.length : 0);
              return { ...op, containerCount: count };
            } catch {
              return { ...op, containerCount: 0 };
            }
          })
        );

        setOperations(operationsWithCount);
        setPage(data?.number ?? targetPage);
        setTotalPages(data?.totalPages ?? 0);
        setTotalOperations(data?.totalElements ?? operationsWithCount.length);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Nao foi possivel carregar as operações.';
        setListError(msg);
      } finally {
        setLoading(false);
      }
    },
    [PAGE_SIZE]
  );

  useEffect(() => {
    fetchOperations(page);
  }, [fetchOperations, page]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return operations.filter((op) => {
      const matchesSearch =
        !q ||
        op.ctv.toLowerCase().includes(q) ||
        op.id.toLowerCase().includes(q) ||
        op.reserva.toLowerCase().includes(q) ||
        op.shipName.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'aberta' && op.status === 'Aberta') ||
        (statusFilter === 'fechada' && op.status === 'Fechada');

      return matchesSearch && matchesStatus;
    });
  }, [operations, search, statusFilter]);

  const handleNew = () => navigate('/operations/new');
  const handleView = (id: string) => navigate(`/operations/${encodeURIComponent(id)}`);

  const goToPrevious = () => {
    if (page > 0) setPage((prev) => prev - 1);
  };

  const goToNext = () => {
    if (totalPages === 0) return;
    if (page + 1 < totalPages) setPage((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Operações</h1>
              <p className="text-sm text-[var(--muted)]">Gerencie as operações portuarias e inspeções</p>
            </div>
            <div className="flex items-center gap-4">
              <div onClick={() => changePage('perfil')} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
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
                placeholder="Pesquisar por CTV, reserva ou navio..."
              />
            </div>
            <div className="flex gap-3 items-center">
              <div className="w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  aria-label="Filtrar por status"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="aberta">Aberta</option>
                  <option value="fechada">Fechada</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => fetchOperations(page)}
                className="inline-flex items-center px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors"
                disabled={loading}
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
              <button onClick={handleNew} className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90 transition-colors">
                <Upload className="w-4 h-4 mr-2" /> Nova operação
              </button>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            {loading ? (
              <div className="p-6 min-h-[420px]">
                <div className="animate-pulse space-y-4 h-full">
                  <div className="h-6 bg-[var(--hover)] rounded w-1/3"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-[var(--border)] p-4">
                        <div className="h-4 bg-[var(--hover)] rounded w-3/4 mb-3"></div>
                        <div className="h-3 bg-[var(--hover)] rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-[var(--hover)] rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : listError ? (
              <div className="p-6 text-sm text-red-700 flex items-center justify-between">
                <span>{listError}</span>
                <button
                  type="button"
                  onClick={() => fetchOperations(page)}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text)]"
                >
                  Tentar novamente
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-[var(--muted)] mb-4" />
                <p className="text-[var(--muted)]">Nenhuma operação encontrada</p>
                <p className="text-sm text-[var(--muted)] mt-1">Tente ajustar os filtros ou buscar por outros termos</p>
              </div>
            ) : (
              <table className="w-full text-center">
                <thead className="bg-[var(--hover)]">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">CTV</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Reserva</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Navio</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Containers</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                  {filtered.map((op) => (
                    <tr key={op.id || op.ctv} className="hover:bg-[var(--hover)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{op.ctv || op.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{op.reserva || '---'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{op.shipName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{formatDate(op.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)]">
                        {op.containerCount !== undefined ? op.containerCount : '...'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={op.status} /></td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm ">
                        <button onClick={() => handleView(op.id || op.ctv)} className="text-teal-600 hover:text-teal-800 transition-colors font-medium">Ver Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {filtered.length > 0 && !loading && !listError && (
            <div className="px-6 py-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">
                  Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages} | Total: {totalOperations}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={goToPrevious}
                    disabled={page === 0}
                    className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={goToNext}
                    disabled={totalPages === 0 || page + 1 >= totalPages}
                    className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Proximo
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Operations;

