import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import {
  CalendarDays,
  BarChart3,
  TrendingUp,
  Timer,
  Download,
  RefreshCcw,
  Search,
  Filter,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { listOperations, type ApiOperation } from '../services/operations';
import { getContainersByOperation, type ApiContainer, type ApiContainerStatus } from '../services/containers';
import { LOGO_DATA_URI } from '../utils/logoDataUri';

type StatusKey = 'todos' | 'aberta' | 'fechada';
type PresetKey = 'hoje' | '7d' | '30d' | 'pendencias';

interface ReportRow {
  id: string;
  ctv: string;
  reserva: string;
  ship: string;
  status: 'Aberta' | 'Fechada';
  date: string;
  containers?: number;
}

const normalizeStatus = (value: unknown): 'Aberta' | 'Fechada' => {
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

const formatDate = (value: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

const parseInputDate = (value: string): number | null => {
  if (!value) return null;
  // Parse date-only inputs as local midnight to avoid timezone shifts
  const [year, month, day] = value.split('-').map((v) => Number(v));
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  const ts = d.getTime();
  return Number.isNaN(ts) ? null : ts;
};

const endOfDay = (value: string): number | null => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((v) => Number(v));
  if (!year || !month || !day) return null;
  const d = new Date(year, month - 1, day, 23, 59, 59, 999);
  const ts = d.getTime();
  return Number.isNaN(ts) ? null : ts;
};

const mapOperation = (op: ApiOperation): ReportRow => {
  const id = String(
    op.id ??
      op.code ??
      op.booking ??
      op.bookingCode ??
      op.reserva ??
      op.reservation ??
      op.ctv ??
      op.amv ??
      '---'
  );

  const ctv = String(
    op.ctv ??
      op.amv ??
      op.code ??
      op.booking ??
      op.bookingCode ??
      op.reserva ??
      op.reservation ??
      id
  );

  const reserva = String(op.reserva ?? op.reservation ?? op.booking ?? op.bookingCode ?? '');
  const ship = String(op.shipName ?? op.ship ?? op.vesselName ?? op.vessel ?? op.navio ?? '---');
  const dateSource =
    parseDateValue(op.updatedAt) ||
    parseDateValue(op.createdAt) ||
    parseDateValue(op.arrivalDate) ||
    parseDateValue(op.deadline) ||
    parseDateValue(op.data) ||
    parseDateValue(op.entrega);

  const containers =
    typeof op.containerCount === 'number'
      ? op.containerCount
      : Array.isArray(op.containers)
        ? op.containers.length
        : Array.isArray(op.containerList)
          ? op.containerList.length
          : undefined;

  return {
    id,
    ctv,
    reserva,
    ship,
    status: normalizeStatus(op.status),
    date: dateSource,
    containers,
  };
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const currentUser = useSessionUser({ role: 'Gerente' });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusKey>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<PresetKey | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);

  const fetchOperations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listOperations({ page: 0, size: 200, sortBy: 'updatedAt', sortDirection: 'DESC' });
      const mapped = (data?.content ?? []).map(mapOperation);

      const enriched = await Promise.all(
        mapped.map(async (row) => {
          if (row.containers !== undefined && row.containers !== null) return row;
          try {
            const resp = await getContainersByOperation(row.id, { page: 0, size: 1, sortBy: 'id', sortDirection: 'ASC' });
            const total = typeof resp?.totalElements === 'number' ? resp.totalElements : Array.isArray(resp?.content) ? resp.content.length : 0;
            return { ...row, containers: total };
          } catch {
            return { ...row, containers: row.containers ?? 0 };
          }
        })
      );

      setRows(enriched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nao foi possivel carregar os dados de relatórios.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const start = parseInputDate(startDate);
    const end = endOfDay(endDate);

    if (start !== null && end !== null && start > end) {
      setRangeWarning('Data inicial maior que a final. Intervalo ignorado.');
      return rows.filter((row) => {
        const matchesSearch =
          !q ||
          row.id.toLowerCase().includes(q) ||
          row.ctv.toLowerCase().includes(q) ||
          row.reserva.toLowerCase().includes(q) ||
          row.ship.toLowerCase().includes(q);

        const matchesStatus =
          statusFilter === 'todos' ||
          (statusFilter === 'aberta' && row.status === 'Aberta') ||
          (statusFilter === 'fechada' && row.status === 'Fechada');

        return matchesSearch && matchesStatus;
      });
    }
    setRangeWarning(null);

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        row.id.toLowerCase().includes(q) ||
        row.ctv.toLowerCase().includes(q) ||
        row.reserva.toLowerCase().includes(q) ||
          row.ship.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'aberta' && row.status === 'Aberta') ||
        (statusFilter === 'fechada' && row.status === 'Fechada');

      const matchesDate = (() => {
        if (start === null && end === null) return true;
        const ts = row.date ? new Date(row.date).getTime() : NaN;
        if (Number.isNaN(ts)) return false;
        if (start !== null && ts < start) return false;
        if (end !== null && ts > end) return false;
        return true;
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [rows, search, statusFilter, startDate, endDate]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('todos');
    setStartDate('');
    setEndDate('');
    setSelectedPreset(null);
  };

  const applyPresetRange = (preset: PresetKey) => {
    const today = new Date();
    const toIso = (d: Date) => d.toISOString().slice(0, 10);
    setSelectedPreset(preset);
    if (preset === 'pendencias') {
      setStatusFilter('aberta');
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'hoje') {
      const d = toIso(today);
      setStartDate(d);
      setEndDate(d);
      return;
    }

    if (preset === '7d') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setStartDate(toIso(start));
      setEndDate(toIso(today));
      return;
    }

    if (preset === '30d') {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      setStartDate(toIso(start));
      setEndDate(toIso(today));
    }
  };

  const presetButtonClass = (key: PresetKey) =>
    `inline-flex items-center px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
      selectedPreset === key
        ? 'bg-teal-50 border-teal-500 text-teal-800'
        : 'border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)]'
    }`;

  const statusLabel = (status?: ApiContainerStatus) => {
    const norm = String(status || '').toUpperCase();
    if (norm.includes('COMP')) return 'Finalizado';
    if (norm.includes('PEND') || norm.includes('PARC')) return 'Parcial';
    return 'Não inicializado';
  };

  const exportOverviewPdf = async (operation: ReportRow) => {
    try {
      const resp = await getContainersByOperation(operation.id, { page: 0, size: 500, sortBy: 'id', sortDirection: 'ASC' });
      const list: ApiContainer[] = resp?.content || [];

      const safe = (val: string | number) =>
        String(val ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

      const rowsHtml = list
        .map((c, index) => {
          const id = safe(c.ctvId ?? c.containerId ?? `CONT-${index + 1}`);
          const status = statusLabel(c.status);
          const lacreAgencia = safe(c.agencySeal ?? '-');
          const lacrePrincipal = safe(c.agencySeal ?? '-');
          const lacreOutros = safe((c.otherSeals || []).join(', ') || '-');
          const qtdSacarias = safe(typeof c.sacksCount === 'number' ? c.sacksCount : '-');
          const pesoBruto = safe(typeof c.grossWeight === 'number' ? c.grossWeight : '-');
          const pesoLiquido = safe(typeof c.liquidWeight === 'number' ? c.liquidWeight : '-');
          return `
            <tr>
              <td>${id}</td>
              <td>${status}</td>
              <td>${lacreAgencia}</td>
              <td>${lacrePrincipal}</td>
              <td>${lacreOutros}</td>
              <td style="text-align:center">${qtdSacarias}</td>
              <td style="text-align:center">${pesoBruto}</td>
              <td style="text-align:center">${pesoLiquido}</td>
            </tr>
          `;
        })
        .join('');

      const pdfTitle = `Overview ${operation.ctv || operation.id}`;
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
              <h2>${safe(pdfTitle)}</h2>
              <img src="${LOGO_DATA_URI}" alt="logo" style="height:50px; width:auto;" />
            </div>
            <p>Operação: ${safe(operation.ctv || operation.id)}</p>
            <p>Gerado em ${safe(new Date().toLocaleString())}</p>
            <table>
              <thead>
                <tr>
                  <th>Container</th>
                  <th>Status</th>
                  <th>Lacre Agência</th>
                  <th>Lacre Principal</th>
                  <th>Lacre Outros</th>
                  <th>Qtd. Sacarias</th>
                  <th>Peso Bruto</th>
                  <th>Peso Líquido</th>
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível exportar o overview.';
      window.alert(msg);
    }
  };

  const exportCsv = (list: ReportRow[]) => {
    if (!list.length) {
      window.alert('Nenhum dado para exportar com os filtros atuais.');
      return;
    }
    const header = ['ID', 'CTV', 'Reserva', 'Navio', 'Status', 'Data', 'Containers'];
    const lines = [
      header,
      ...list.map((row) => [
        row.id,
        row.ctv,
        row.reserva || '-',
        row.ship,
        row.status,
        formatDate(row.date),
        row.containers ?? '-',
      ]),
    ];
    const csv = lines.map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatório de operações-${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = (list: ReportRow[]) => {
    if (!list.length) {
      window.alert('Nenhum dado para exportar com os filtros atuais.');
      return;
    }

    const safe = (val: string | number) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const docTitle = 'Relatório de Operações';

    const rowsHtml = list
      .map(
        (row) => `
          <tr>
            <td>${safe(row.ctv || row.id)}</td>
            <td>${safe(row.reserva || '-')}</td>
            <td>${safe(row.ship)}</td>
            <td>${safe(formatDate(row.date))}</td>
            <td>${safe(row.status)}</td>
            <td style="text-align:center">${safe(row.containers ?? '-')}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <html>
        <head>
          <title>${safe(docTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            .header { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px; }
            h2 { margin: 0; display: flex; align-items: center; gap: 8px; }
            p { margin: 0 0 12px; font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
            th { background: #f3f4f6; text-align: left; text-transform: uppercase; letter-spacing: 0.03em; font-size: 11px; }
            td:last-child { text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${safe(docTitle)}</h2>
            <img src="${LOGO_DATA_URI}" alt="logo" style="height:50px; width:auto;" />
          </div>
          <p>Gerado em ${safe(new Date().toLocaleString())}</p>
          <table>
            <thead>
              <tr>
                <th>CTV</th>
                <th>Reserva</th>
                <th>Navio</th>
                <th>Data</th>
                <th>Status</th>
                <th>Containers</th>
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
    iframe.title = docTitle;
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    const previousTitle = document.title;
    document.title = docTitle;
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) doc.title = docTitle;
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

  const rowsForTable = filteredRows.slice(0, 50);

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={currentUser} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Relatórios</h1>
              <p className="text-sm text-[var(--muted)]">Gere, filtre e exporte informações da operação</p>
            </div>
            <div className="flex items-center gap-3">
              <div
                onClick={() => changePage('perfil')}
                className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors"
              >
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{currentUser.name}</div>
                  <div className="text-xs text-[var(--muted)]">{currentUser.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">Filtros e ações</h2>
                <p className="text-sm text-[var(--muted)]">Refine o recorte antes de exportar</p>
                {rangeWarning && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {rangeWarning}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportCsv(filteredRows)}
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:opacity-90"
                >
                  <Download className="w-4 h-4 mr-2" /> Exportar CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportPdf(filteredRows)}
                  className="inline-flex items-center px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)]"
                >
                  <FileText className="w-4 h-4 mr-2" /> Exportar PDF
                </button>
                <button
                  type="button"
                  onClick={fetchOperations}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-60"
                >
                  <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por ID, CTV ou navio"
                  className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusKey)}
                  className="w-full appearance-none pl-10 pr-8 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="todos">Todos os status</option>
                  <option value="aberta">Abertas</option>
                  <option value="fechada">Fechadas</option>
                </select>
              </div>

              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedPreset(null);
                  }}
                  className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedPreset(null);
                  }}
                  className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-1 md:col-span-2 lg:col-span-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => applyPresetRange('hoje')}
                  className={presetButtonClass('hoje')}
                >
                  <Clock className="w-4 h-4 mr-2" /> Hoje
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRange('7d')}
                  className={presetButtonClass('7d')}
                >
                  <BarChart3 className="w-4 h-4 mr-2" /> Ultimos 7 dias
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRange('30d')}
                  className={presetButtonClass('30d')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" /> Ultimos 30 dias
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetRange('pendencias')}
                  className={presetButtonClass('pendencias')}
                >
                  <Timer className="w-4 h-4 mr-2" /> Pendências
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center px-3 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)]"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          </section>

          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">Operações para relatório</h2>
                <p className="text-sm text-[var(--muted)]">
                  {filteredRows.length} encontradas com os filtros atuais
                </p>
              </div>
              {startDate || endDate ? (
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                  <CalendarDays className="w-4 h-4" />
                  <span>
                    {startDate || 'inicio aberto'} - {endDate || 'fim aberto'}
                  </span>
                </div>
              ) : null}
            </div>

            {loading ? (
              <div className="p-6 text-sm text-[var(--muted)]">Carregando dados...</div>
            ) : filteredRows.length === 0 ? (
              <div className="p-10 text-center text-[var(--muted)] text-sm">
                Nenhum resultado com os filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border)]">
                  <thead className="bg-[var(--hover)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                        CTV
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                        Reserva
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                        Navio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                        Containers
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                    {rowsForTable.map((row) => (
                      <tr key={row.id} className="hover:bg-[var(--hover)] transition-colors">
                        <td className="px-6 py-3 text-sm font-medium text-[var(--text)] whitespace-nowrap">
                          {row.ctv || row.id}
                        </td>
                        <td className="px-6 py-3 text-sm text-[var(--muted)] whitespace-nowrap">
                          {row.reserva || '---'}
                        </td>
                        <td className="px-6 py-3 text-sm text-[var(--muted)] whitespace-nowrap">
                          {row.ship}
                        </td>
                        <td className="px-6 py-3 text-sm text-[var(--muted)] whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-6 py-3 text-sm text-[var(--text)] whitespace-nowrap text-center">
                          {row.containers ?? '---'}
                        </td>
                        <td className="px-6 py-3 text-sm whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              row.status === 'Aberta'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/operations/${encodeURIComponent(row.id)}/overview`)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)]"
                            >
                              <FileText className="w-4 h-4 mr-1.5" /> Containers
                            </button>
                            <button
                              type="button"
                              onClick={() => exportOverviewPdf(row)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-700 text-white hover:opacity-90"
                            >
                              <Download className="w-4 h-4 mr-1.5" /> Exportar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length > rowsForTable.length && (
                  <div className="px-6 py-3 text-xs text-[var(--muted)] bg-[var(--hover)] border-t border-[var(--border)]">
                    Mostrando {rowsForTable.length} de {filteredRows.length}. Ajuste filtros ou exporte o CSV para todos.
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default Reports;
