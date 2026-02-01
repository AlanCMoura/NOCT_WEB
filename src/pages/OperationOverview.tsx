import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, Edit, Download } from 'lucide-react';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { getContainersByOperation, updateContainer, type ApiContainer, type ApiContainerStatus, type UpdateContainerPayload } from '../services/containers';
import { getOperationById } from '../services/operations';
import { LOGO_DATA_URI } from '../utils/logoDataUri';

interface ContainerRow {
  id: string;
  apiId?: string;
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
    id: String(c.ctvId || c.containerId || `CONT-${index + 1}`),
    apiId: c.id !== undefined && c.id !== null ? String(c.id) : undefined,
    status,
    lacreAgencia: c.agencySeal || '',
    lacrePrincipal: c.agencySeal || '',
    lacreOutros: (c.otherSeals || []).join(', '),
    qtdSacarias: typeof c.sacksCount === 'number' ? c.sacksCount : undefined,
    pesoBruto: typeof c.grossWeight === 'number' ? c.grossWeight : undefined,
    pesoLiquido: typeof c.liquidWeight === 'number' ? c.liquidWeight : undefined,
  };
};

type StatusKey = 'todos' | 'ni' | 'parcial' | 'completo';

const statusKeyOfRow = (status?: ApiContainerStatus): StatusKey => {
  const norm = String(status || '').toUpperCase();
  if (norm.includes('COMP')) return 'completo';
  if (norm.includes('PEND') || norm.includes('PARC')) return 'parcial';
  // trata desconhecidos ou vazios como não inicializado
  return 'ni';
};

const statusDisplay = (status?: ApiContainerStatus) => {
  const key = statusKeyOfRow(status);
  if (key === 'completo') return { label: 'Finalizado', className: 'bg-green-100 text-green-800' };
  if (key === 'parcial') return { label: 'Parcial', className: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Não inicializado', className: 'bg-gray-200 text-gray-700' };
};

const OperationOverview: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';

  const user = useSessionUser({ role: 'Administrador' });
  const { changePage } = useSidebar();

  const [rows, setRows] = useState<ContainerRow[]>([]);
  const [operationCtv, setOperationCtv] = useState<string>('');
  const [operationLabelLoading, setOperationLabelLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftRows, setDraftRows] = useState<ContainerRow[]>([]);
  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Atualiza quando navega para outra operacao
  useEffect(() => {
    setRows([]);
    setDraftRows([]);
    setPage(1);
    setOperationCtv('');
    setOperationLabelLoading(true);
  }, [decodedOperationId]);

  useEffect(() => {
    const load = async () => {
      if (!decodedOperationId) return;
      setLoading(true);
      setLoadError(null);
      try {
        try {
          const op = await getOperationById(decodedOperationId);
          const ctv = String(
            op.ctv ??
              op.amv ??
              op.code ??
              op.booking ??
              op.bookingCode ??
              op.reserva ??
              op.reservation ??
              decodedOperationId
          );
          setOperationCtv(ctv);
        } catch {
          setOperationCtv(decodedOperationId);
        }
        setOperationLabelLoading(false);
        const data = await getContainersByOperation(decodedOperationId, { page: 0, size: 500, sortBy: 'id', sortDirection: 'ASC' });
        const mapped = (data?.content || []).map(mapApiContainer);
        setRows(mapped);
        setDraftRows(mapped);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Não foi possivel carregar os containers.';
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [decodedOperationId]);

  const [statusKey, setStatusKey] = useState<StatusKey>('todos');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q ? rows.filter((r) => r.id.toLowerCase().includes(q)) : rows;
    if (statusKey === 'todos') return base;
    return base.filter((r) => statusKeyOfRow(r.status) === statusKey);
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

  const startEditAll = () => { setDraftRows(rows); setIsEditing(true); setSaveError(null); setSaveMessage(null); };
  const cancelEditAll = () => { setIsEditing(false); setDraftRows(rows); setSaveError(null); setSaveMessage(null); };

  const buildUpdatePayload = (row: ContainerRow): UpdateContainerPayload => ({
    agencySeal: row.lacreAgencia ?? '',
    otherSeals: row.lacreOutros ? row.lacreOutros.split(',').map((s) => s.trim()).filter(Boolean) : [],
    sacksCount: row.qtdSacarias ?? 0,
    grossWeight: row.pesoBruto ?? 0,
    liquidWeight: row.pesoLiquido ?? 0,
  });

  const saveEditAll = async () => {
    setSaveError(null);
    setSaveMessage(null);

    const changes = draftRows.filter((draft) => {
      const original = rows.find((r) => r.id === draft.id);
      if (!original) return true;
      return (
        (original.lacreAgencia || '') !== (draft.lacreAgencia || '') ||
        (original.lacrePrincipal || '') !== (draft.lacrePrincipal || '') ||
        (original.lacreOutros || '') !== (draft.lacreOutros || '') ||
        (original.qtdSacarias ?? 0) !== (draft.qtdSacarias ?? 0) ||
        (original.pesoBruto ?? 0) !== (draft.pesoBruto ?? 0) ||
        (original.pesoLiquido ?? 0) !== (draft.pesoLiquido ?? 0)
      );
    });

    if (!changes.length) {
      setSaveMessage('Nenhuma alteração para salvar.');
      setIsEditing(false);
      return;
    }

    try {
      setSaving(true);
      await Promise.all(
        changes.map(async (draft) => {
          const payload = buildUpdatePayload(draft);
          const targetId = draft.apiId ?? draft.id;
          if (!targetId) {
            throw new Error('ID do container indisponível para atualização.');
          }
          await updateContainer(targetId, payload);
        })
      );
      setRows(draftRows);
      setIsEditing(false);
      setSaveMessage('Containers atualizados com sucesso.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar as alterações.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (id: string, patch: Partial<ContainerRow>) => {
    setDraftRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleBack = () => {
    navigate(`/operations/${encodeURIComponent(decodedOperationId)}`);
  };
  const operationLabel = operationCtv || decodedOperationId;
  const exportCsv = (list: ContainerRow[]) => {
    if (!list.length) {
      window.alert('Nenhum container para exportar.');
      return;
    }
    const header = ['Container', 'Status', 'Lacre Agencia', 'Lacre Principal', 'Lacre Outros', 'Qtd. Sacarias', 'Peso Bruto', 'Peso Liquido'];
    const rowsCsv = list.map((row) => {
      const { label } = statusDisplay(row.status);
      const values = [
        row.id,
        label,
        row.lacreAgencia ?? '-',
        row.lacrePrincipal ?? '-',
        row.lacreOutros ?? '-',
        row.qtdSacarias ?? 0,
        row.pesoBruto ?? '-',
        row.pesoLiquido ?? '-',
      ];
      return values.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';');
    });
    const csv = [header.join(';'), ...rowsCsv].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `containers-${operationLabel || 'operacao'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = (list: ContainerRow[]) => {
    if (!list.length) {
      window.alert('Nenhum container para exportar.');
      return;
    }

    const safe = (val: string | number) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const rowsHtml = list
      .map((row) => {
        const { label } = statusDisplay(row.status);
        return `
          <tr>
            <td>${safe(row.id)}</td>
            <td>${safe(label)}</td>
            <td>${safe(row.lacreAgencia ?? '-')}</td>
            <td>${safe(row.lacrePrincipal ?? '-')}</td>
            <td>${safe(row.lacreOutros ?? '-')}</td>
            <td style="text-align:center">${safe(row.qtdSacarias ?? '-')}</td>
            <td style="text-align:center">${safe(row.pesoBruto ?? '-')}</td>
            <td style="text-align:center">${safe(row.pesoLiquido ?? '-')}</td>
          </tr>
        `;
      })
      .join('');

    const pdfTitle = `Overview ${operationLabel || decodedOperationId || 'operacao'}`;
    const html = `
      <html>
        <head>
          <title>${safe(pdfTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            .header { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px; }
            h2 { margin: 0; display: flex; align-items: center; gap: 8px; }
            p { margin: 0 0 12px; font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
            th { background: #f3f4f6; text-align: left; text-transform: uppercase; letter-spacing: 0.03em; font-size: 11px; }
            td:nth-last-child(-n+3) { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>
              ${safe(pdfTitle)}
            </h2>
            <img src="${LOGO_DATA_URI}" alt="logo" style="height:50px; width:auto;" />
          </div>
          <p>Operacao: ${safe(operationLabel)}</p>
          <p>Gerado em ${safe(new Date().toLocaleString())}</p>
          <table>
            <thead>
              <tr>
                <th>Container</th>
                <th>Status</th>
                <th>Lacre Agencia</th>
                <th>Lacre Principal</th>
                <th>Lacre Outros</th>
                <th>Qtd. Sacarias</th>
                <th>Peso Bruto</th>
                <th>Peso Liquido</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.title = pdfTitle;
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    const previousTitle = document.title;
    document.title = pdfTitle;
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) doc.title = pdfTitle;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          document.title = previousTitle;
          document.body.removeChild(iframe);
        }, 300);
      }
    };
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Overview de Containers</h1>
              <p className="text-sm text-[var(--muted)]">
                Operação{' '}
                {operationLabelLoading ? (
                  <span className="inline-block w-28 h-4 bg-[var(--hover)] rounded animate-pulse align-middle"></span>
                ) : (
                  operationLabel
                )}
              </p>
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
          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-3">
              {saveError}
            </div>
          )}
          {saveMessage && !saveError && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 mb-3">
              {saveMessage}
            </div>
          )}
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
                <option value="ni">Não inicializado</option>
                <option value="parcial">Parcial</option>
                <option value="completo">Completo</option>
              </select>
            </div>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => exportCsv(sorted)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors"
              >
                <Download className="w-4 h-4" /> Exportar CSV
              </button>
              <button
                type="button"
                onClick={() => exportPdf(sorted)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors ml-3"
              >
                <Download className="w-4 h-4" /> Exportar PDF
              </button>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operação</h2>
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
                  <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Peso Líquido</th>
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
          <button
            onClick={saveEditAll}
            disabled={saving}
            className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
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
