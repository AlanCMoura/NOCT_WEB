import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search, X } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { AuditLog, formatAuditApiError, listAuditLogs, ListAuditLogsParams } from '../services/auditLogs';

interface UserLogged {
  name: string;
  role: string;
}

interface AuditFilters {
  entityType: string;
  entityId: string;
  userName: string;
  startDate: string;
  endDate: string;
  sortBy: NonNullable<ListAuditLogsParams['sortBy']>;
  sortDirection: NonNullable<ListAuditLogsParams['sortDirection']>;
}

const PAGE_SIZE = 20;
const ENTITY_TYPES = ['', 'OPERATION', 'CONTAINER', 'USER'];
const DEFAULT_FILTERS: AuditFilters = {
  entityType: '',
  entityId: '',
  userName: '',
  startDate: '',
  endDate: '',
  sortBy: 'createdAt',
  sortDirection: 'DESC',
};

const coalesceText = (...values: unknown[]): string => {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
  return found === undefined || found === null ? '' : String(found);
};

const formatDateTimePt = (value: unknown): string => {
  const text = coalesceText(value);
  if (!text) return '-';

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleString('pt-BR');
};

const formatObjectValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const toDateTimeParam = (value: string): string | undefined => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

const actionBadgeClass = (action: string): string => {
  const normalized = action.toUpperCase();
  if (normalized.includes('DELETE') || normalized.includes('REMOVE') || normalized.includes('EXCL')) {
    return 'bg-red-100 text-red-700';
  }
  if (normalized.includes('CREATE') || normalized.includes('CADAST') || normalized.includes('ADD')) {
    return 'bg-green-100 text-green-700';
  }
  if (normalized.includes('UPDATE') || normalized.includes('ALTER') || normalized.includes('EDIT')) {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-blue-100 text-blue-700';
};

const AuditLogs: React.FC = () => {
  const { changePage } = useSidebar();
  const currentUser: UserLogged = useSessionUser({ role: 'Gerente' });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [reloadKey, setReloadKey] = useState(0);

  const requestParams = useMemo<ListAuditLogsParams>(
    () => ({
      entityType: appliedFilters.entityType,
      entityId: appliedFilters.entityId,
      startDate: toDateTimeParam(appliedFilters.startDate),
      endDate: toDateTimeParam(appliedFilters.endDate),
      page,
      size: PAGE_SIZE,
      sortBy: appliedFilters.sortBy,
      sortDirection: appliedFilters.sortDirection,
    }),
    [appliedFilters, page]
  );

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await listAuditLogs(requestParams);
      const content = data?.content ?? [];
      setLogs(content);
      setPage(data?.number ?? requestParams.page ?? 0);
      setTotalPages(data?.totalPages ?? 0);
      setTotalElements(data?.totalElements ?? content.length);
    } catch (error) {
      setLoadError(formatAuditApiError(error));
    } finally {
      setIsLoading(false);
    }
  }, [requestParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, reloadKey]);

  const displayedLogs = useMemo(() => {
    const query = appliedFilters.userName.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) =>
      coalesceText(log.userName, log.username)
        .toLowerCase()
        .includes(query)
    );
  }, [appliedFilters.userName, logs]);

  const updateDraftFilter = <K extends keyof AuditFilters>(field: K, value: AuditFilters[K]) => {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(0);
    setReloadKey((current) => current + 1);
  };

  const resetFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setPage(0);
    setReloadKey((current) => current + 1);
  };

  const renderDetails = (log: AuditLog): string => {
    const detail = coalesceText(log.details, log.description, log.message);
    if (detail) return detail;

    const oldValue = formatObjectValue(log.oldValue);
    const newValue = formatObjectValue(log.newValue);
    if (oldValue !== '-' || newValue !== '-') {
      return `Antes: ${oldValue} | Depois: ${newValue}`;
    }

    return '-';
  };

  const getLogKey = (log: AuditLog, index: number) =>
    coalesceText(log.id, `${coalesceText(log.entityType)}-${coalesceText(log.entityId)}-${coalesceText(log.createdAt, log.timestamp)}-${index}`);

  return (
    <div className="flex min-h-screen bg-app md:h-screen">
      <Sidebar user={currentUser} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)]">
          <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:px-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-[var(--text)]">Auditoria</h1>
              <p className="text-sm text-[var(--muted)]">Consulta de ações registradas no sistema</p>
            </div>

            <div onClick={() => changePage('perfil')} className="hidden cursor-pointer self-start items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--hover)] md:flex md:px-4 xl:self-auto">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-[var(--text)]">{currentUser.name}</div>
                <div className="text-xs text-[var(--muted)]">{currentUser.role}</div>
              </div>
              <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {currentUser.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto space-y-6 p-4 sm:p-6">
          {loadError && (
            <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
              <span>{loadError}</span>
              <button type="button" onClick={() => setLoadError(null)} className="self-end text-red-700 hover:opacity-70 sm:self-auto">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
              <select
                value={draftFilters.entityType}
                onChange={(e) => updateDraftFilter('entityType', e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={isLoading}
              >
                {ENTITY_TYPES.map((type) => (
                  <option key={type || 'all'} value={type}>{type || 'Todos os tipos'}</option>
                ))}
              </select>
              <input
                value={draftFilters.entityId}
                onChange={(e) => updateDraftFilter('entityId', e.target.value.replace(/\D/g, ''))}
                placeholder="ID da entidade"
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={isLoading}
              />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={draftFilters.userName}
                  onChange={(e) => updateDraftFilter('userName', e.target.value)}
                  placeholder="Nome do usuario"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-10 pr-3 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={isLoading}
                />
              </div>
              <input
                type="datetime-local"
                value={draftFilters.startDate}
                onChange={(e) => updateDraftFilter('startDate', e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={isLoading}
              />
              <input
                type="datetime-local"
                value={draftFilters.endDate}
                onChange={(e) => updateDraftFilter('endDate', e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={applyFilters}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--on-primary)] hover:opacity-90 disabled:opacity-60"
              >
                <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <select
                  value={draftFilters.sortBy}
                  onChange={(e) => updateDraftFilter('sortBy', e.target.value as NonNullable<ListAuditLogsParams['sortBy']>)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={isLoading}
                >
                  <option value="createdAt">Ordenar por data</option>
                  <option value="action">Ordenar por ação</option>
                  <option value="entityType">Ordenar por tipo</option>
                  <option value="userCpf">Ordenar por CPF</option>
                  <option value="entityId">Ordenar por entidade</option>
                </select>
                <select
                  value={draftFilters.sortDirection}
                  onChange={(e) => updateDraftFilter('sortDirection', e.target.value as NonNullable<ListAuditLogsParams['sortDirection']>)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  disabled={isLoading}
                >
                  <option value="DESC">Mais recentes</option>
                  <option value="ASC">Mais antigos</option>
                </select>
              </div>
              <button type="button" onClick={resetFilters} className="text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]">
                Limpar filtros
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
            {isLoading ? (
              <div className="space-y-3 p-6 animate-pulse">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-12 rounded-lg bg-[var(--hover)]" />
                ))}
              </div>
            ) : (
              <>
                <div className="divide-y divide-[var(--border)] md:hidden">
                  {displayedLogs.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-[var(--muted)]">Nenhum log de auditoria encontrado.</div>
                  ) : (
                    displayedLogs.map((log, index) => {
                      const action = coalesceText(log.action, log.eventType, '-');
                      return (
                        <article key={`mobile-${getLogKey(log, index)}`} className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text)]">{coalesceText(log.entityType, '-')} #{coalesceText(log.entityId, '-')}</p>
                              <p className="text-xs text-[var(--muted)]">{formatDateTimePt(log.createdAt ?? log.timestamp)}</p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${actionBadgeClass(action)}`}>{action}</span>
                          </div>
                          <p className="text-sm text-[var(--text)]">{renderDetails(log)}</p>
                          <p className="text-xs text-[var(--muted)]">Usuario: {coalesceText(log.userName, log.username, log.userCpf, '-')}</p>
                        </article>
                      );
                    })
                  )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full divide-y divide-[var(--border)]">
                    <thead className="bg-[var(--hover)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Ação</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Entidade</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Usuario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {displayedLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-6 text-sm text-[var(--muted)]">Nenhum log de auditoria encontrado.</td>
                        </tr>
                      ) : (
                        displayedLogs.map((log, index) => {
                          const action = coalesceText(log.action, log.eventType, '-');
                          return (
                            <tr key={getLogKey(log, index)} className="hover:bg-[var(--hover)]">
                              <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--text)]">{formatDateTimePt(log.createdAt ?? log.timestamp)}</td>
                              <td className="px-6 py-3 text-sm">
                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${actionBadgeClass(action)}`}>{action}</span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--text)]">{coalesceText(log.entityType, '-')} #{coalesceText(log.entityId, '-')}</td>
                              <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--text)]">{coalesceText(log.userName, log.username, log.userCpf, '-')}</td>
                              <td className="max-w-xl px-6 py-3 text-sm text-[var(--text)]">
                                <span className="line-clamp-2">{renderDetails(log)}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-[var(--border)] px-4 py-4 text-sm text-[var(--muted)] sm:px-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages} | Total: {totalElements}</div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <button
                        type="button"
                        onClick={() => setPage((current) => Math.max(0, current - 1))}
                        disabled={page === 0 || isLoading}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setPage((current) => current + 1)}
                        disabled={isLoading || totalPages === 0 || page + 1 >= totalPages}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Proximo
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default AuditLogs;
