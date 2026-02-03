import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, FileText, RefreshCcw, FileUp, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { getOperationStatus, type OperationStatus } from '../services/operationStatus';
import { createOperation, listOperations, type ApiOperation } from '../services/operations';
import { getContainersByOperation } from '../services/containers';

interface OperationItem {
  id: string;
  ctv: string;
  reserva: string;
  shipName: string;
  date: string;
  status: OperationStatus;
  containerCount?: number;
}

/**
 * Payload para criação de operação via importação.
 */
interface ImportOperationPayload {
  ctv: string;
  reservation: string;
  terminal: string;
  exporter: string;
  destination: string;
  ship: string;
  arrivalDate: string | null;
  deadlineDraft: string | null;
  refClient: string;
  loadDeadline: string;
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

const normalizeSearchKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const mapStatusToApi = (value: 'todos' | 'aberta' | 'fechada'): string | undefined => {
  if (value === 'aberta') return 'OPEN';
  if (value === 'fechada') return 'COMPLETED';
  return undefined;
};

const getDatePriority = (value: string): number => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeRowKeys = (row: Record<string, any>): Record<string, any> =>
  Object.entries(row).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

/**
 * Busca um valor em uma linha usando múltiplas chaves possíveis.
 */
const pickCellValue = (row: Record<string, any>, keys: string[]): unknown => {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    const value = row[normalized];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
};

/**
 * Busca um valor de texto e retorna como string sanitizada.
 */
const pickCellText = (row: Record<string, any>, keys: string[]): string => {
  const value = pickCellValue(row, keys);
  if (value === null || value === undefined) return '';
  return String(value).replace(/\//g, '-').trim();
};

/**
 * Converte qualquer valor de data para formato ISO-8601.
 * Suporta:
 * - Date objects (do XLSX com cellDates: true)
 * - Strings ISO ("2025-01-15T00:00:00.000Z")
 * - Strings formatadas ("15/01/2025", "2025-01-15", "1/15/25")
 * - Números seriais do Excel
 */
const convertToISODate = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;

  // Se for objeto Date (cellDates: true retorna Date)
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString();
  }

  // Se for string
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return null;

    // Já está no formato ISO completo
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
      return text;
    }

    // Formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return `${text}T12:00:00.000Z`;
    }

    // Formato DD/MM/YYYY ou DD-MM-YYYY
    const brFormat = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (brFormat) {
      const [, day, month, year] = brFormat;
      const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    // Formato M/D/YY ou M/D/YYYY (formato americano do Excel)
    const usFormat = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (usFormat) {
      const [, month, day, yearStr] = usFormat;
      const year = yearStr.length === 2 ? 2000 + Number(yearStr) : Number(yearStr);
      const d = new Date(Date.UTC(year, Number(month) - 1, Number(day), 12, 0, 0));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    // Tenta parse genérico
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
      return parsed.toISOString();
    }

    return null;
  }

  // Se for número (serial do Excel)
  if (typeof value === 'number') {
    // Serial do Excel: dias desde 1900-01-01
    // 25569 = dias entre 1900-01-01 e 1970-01-01 (epoch Unix)
    const msPerDay = 86400 * 1000;
    const date = new Date((value - 25569) * msPerDay);
    
    if (!Number.isNaN(date.getTime()) && date.getFullYear() > 1900 && date.getFullYear() < 2100) {
      // Ajusta para meio-dia UTC
      date.setUTCHours(12, 0, 0, 0);
      return date.toISOString();
    }
    return null;
  }

  return null;
};

/**
 * Converte data para formato YYYY-MM-DD (para campos que são String no backend).
 */
const convertToDateString = (value: unknown): string => {
  const isoDate = convertToISODate(value);
  if (!isoDate) return '';
  return isoDate.slice(0, 10); // "2025-01-15T12:00:00.000Z" -> "2025-01-15"
};

const buildPayloadFromRow = (row: Record<string, any>): ImportOperationPayload => {
  const normalizedRow = normalizeRowKeys(row);

  // Busca os valores brutos das datas
  const arrivalDateRaw = pickCellValue(normalizedRow, ['arrivaldate', 'datadechegada', 'eta']);
  const deadlineDraftRaw = pickCellValue(normalizedRow, ['deadlinedraft', 'draft', 'cutoffdraft']);
  const loadDeadlineRaw = pickCellValue(normalizedRow, ['loaddeadline', 'deadline', 'deadlinedeembarque', 'deadlinecarregamento', 'cutoff']);

  const payload = {
    ctv: pickCellText(normalizedRow, ['ctv']),
    reservation: pickCellText(normalizedRow, ['reservation', 'reserva', 'booking', 'bookingcode']),
    terminal: pickCellText(normalizedRow, ['terminal']),
    exporter: pickCellText(normalizedRow, ['exporter', 'exportador']),
    destination: pickCellText(normalizedRow, ['destination', 'destino']),
    ship: pickCellText(normalizedRow, ['ship', 'navio', 'vessel', 'vesselname']),
    // Datas para java.util.Date - formato ISO completo
    arrivalDate: convertToISODate(arrivalDateRaw),
    deadlineDraft: convertToISODate(deadlineDraftRaw),
    refClient: pickCellText(normalizedRow, ['refclient', 'ref', 'cliente', 'referencia']),
    // loadDeadline é String no backend - formato YYYY-MM-DD
    loadDeadline: convertToDateString(loadDeadlineRaw),
  };

  // Debug log
  console.log('Payload gerado:', {
    ...payload,
    _raw: {
      arrivalDateRaw,
      deadlineDraftRaw,
      loadDeadlineRaw,
    }
  });

  return payload;
};

const REQUIRED_IMPORT_FIELDS: Array<keyof ImportOperationPayload> = [
  'ctv',
  'reservation',
  'terminal',
  'exporter',
  'destination',
  'ship',
  'arrivalDate',
  'deadlineDraft',
  'refClient',
  'loadDeadline',
];

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
    parseDateValue(op.createdAt) ||
    parseDateValue(op.updatedAt) ||
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
    Aberta: { label: 'Aberta', className: 'bg-amber-100 text-amber-700' },
    Fechada: { label: 'Fechada', className: 'bg-green-100 text-green-800' },
  } as const;
  const cfg = map[status] ?? map.Aberta;
  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cfg.className}`}>{cfg.label}</span>;
};

const Operations: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });

  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'aberta' | 'fechada'>('todos');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalOperations, setTotalOperations] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const hasImportFeedback = Boolean(importMessage) || importErrors.length > 0;
  const [showImportModal, setShowImportModal] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);

  const fetchOperations = useCallback(
    async (targetPage = 0) => {
      setLoading(true);
      setListError(null);
      try {
        const statusParam = mapStatusToApi(statusFilter);
        const data = await listOperations({
          page: targetPage,
          size: pageSize,
          sortBy: 'createdAt',
          sortDirection: 'DESC',
          status: statusParam,
        });
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

        const sortedOperations = [...operationsWithCount].sort(
          (a, b) => getDatePriority(b.date) - getDatePriority(a.date)
        );

        setOperations(sortedOperations);
        setPage(data?.number ?? targetPage);
        setTotalPages(data?.totalPages ?? 0);
        setTotalOperations(data?.totalElements ?? sortedOperations.length);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Nao foi possivel carregar as operações.';
        setListError(msg);
      } finally {
        setLoading(false);
      }
    },
    [pageSize, statusFilter]
  );

  const handleImportFile = useCallback(
    async (file: File) => {
      setImporting(true);
      setImportMessage(null);
      setImportErrors([]);

      try {
        const buffer = await file.arrayBuffer();
        
        // IMPORTANTE: cellDates: true converte automaticamente datas do Excel para objetos Date
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;

        if (!sheet) {
          throw new Error('Planilha vazia ou sem abas.');
        }

        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        
        console.log('=== DADOS BRUTOS DO EXCEL ===');
        console.log(JSON.stringify(rows, null, 2));
        
        if (!rows.length) {
          throw new Error('Nenhuma linha encontrada na planilha.');
        }

        const results = { created: 0, errors: [] as string[] };

        for (let i = 0; i < rows.length; i += 1) {
          const payload = buildPayloadFromRow(rows[i]);
          
          console.log(`=== Linha ${i + 2} ===`);
          console.log('Payload final:', JSON.stringify(payload, null, 2));
          
          const missing = REQUIRED_IMPORT_FIELDS.filter((field) => {
            const value = payload[field];
            return value === undefined || value === null || String(value).trim() === '';
          });

          if (missing.length) {
            results.errors.push(`Linha ${i + 2}: faltam ${missing.join(', ')}`);
            continue;
          }

          try {
            await createOperation(payload as any);
            results.created += 1;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao criar operacao';
            results.errors.push(`Linha ${i + 2}: ${message}`);
          }
        }

        if (results.created > 0) {
          setImportMessage(`Importacao concluida: ${results.created} operacoes criadas.`);
        } else if (results.errors.length) {
          setImportMessage('Importacao finalizada com pendencias. Confira os erros abaixo.');
        } else {
          setImportMessage('Nenhuma operacao criada. Verifique o arquivo importado.');
        }

        setImportErrors(results.errors);
        await fetchOperations(page);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel importar o arquivo.';
        setImportErrors([message]);
      } finally {
        setImporting(false);
        setSelectedImportFile(null);
        if (importInputRef.current) {
          importInputRef.current.value = '';
        }
      }
    },
    [fetchOperations, page]
  );

  const handleImportChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImportFile(file);
      setIsDragOver(false);
    }
  };

  const handleImportClick = () => {
    setImportMessage(null);
    setImportErrors([]);
    setSelectedImportFile(null);
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setIsDragOver(false);
    setSelectedImportFile(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedImportFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const triggerFileDialog = () => {
    importInputRef.current?.click();
  };

  const startImport = async () => {
    if (!selectedImportFile || importing) return;
    await handleImportFile(selectedImportFile);
    setShowImportModal(false);
  };

  const clearImportFeedback = () => {
    setImportMessage(null);
    setImportErrors([]);
  };

  useEffect(() => {
    fetchOperations(page);
  }, [fetchOperations, page, pageSize, statusFilter]);

  const filtered = useMemo(() => {
    const q = normalizeSearchKey(search.trim());
    return operations.filter((op) => {
      const matchesSearch =
        !q ||
        normalizeSearchKey(op.ctv).includes(q) ||
        normalizeSearchKey(op.id).includes(q) ||
        normalizeSearchKey(op.reserva).includes(q) ||
        normalizeSearchKey(op.shipName).includes(q);

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
                  onChange={(e) => {
                    setStatusFilter(e.target.value as typeof statusFilter);
                    setPage(0);
                  }}
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
                onClick={handleImportClick}
                className="inline-flex items-center px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors disabled:opacity-60"
                disabled={importing}
                title="Use colunas: ctv, reservation, terminal, exporter, destination, ship, arrivalDate, deadlineDraft, refClient, loadDeadline"
              >
                <FileUp className="w-4 h-4 mr-2" />
                {importing ? 'Importando...' : 'Importar'}
              </button>
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

          {hasImportFeedback && (
            <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm flex items-start justify-between gap-3">
              <div>
                {importMessage ? <p className="font-semibold text-[var(--text)]">{importMessage}</p> : null}
                {importErrors.length ? (
                  <div className="mt-2 space-y-1 text-[var(--muted)]">
                    {importErrors.slice(0, 3).map((err, idx) => (
                      <p key={idx}>• {err}</p>
                    ))}
                    {importErrors.length > 3 ? (
                      <p>+ {importErrors.length - 3} erros adicionais.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={clearImportFeedback}
                className="text-[var(--muted)] hover:text-[var(--text)] transition-colors text-xs font-medium"
              >
                Fechar
              </button>
            </div>
          )}

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
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="text-sm text-[var(--muted)]">
                  Pagina {totalPages === 0 ? 0 : page + 1} de {totalPages} | Total: {totalOperations}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span>Linhas por página</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(0);
                      }}
                      className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
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
            </div>
          )}
        </main>

        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeImportModal} />
            <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--text)]">Importar operações</p>
                  <p className="text-sm text-[var(--muted)]">
                    Baixe o modelo, preencha os campos de texto e arraste o arquivo XLSX aqui para importar em lote.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeImportModal}
                  className="p-2 rounded-full hover:bg-[var(--hover)] text-[var(--muted)]"
                  aria-label="Fechar modal de importação"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--hover)] text-sm">
                <div>
                  <p className="text-[var(--text)] font-medium">Modelo para download</p>
                </div>
                <a
                  href="/modelo-operacoes.xlsx"
                  download
                  className="inline-flex items-center px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-semibold hover:opacity-90 transition-colors"
                >
                  Baixar modelo
                </a>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragOver ? 'border-[var(--primary)] bg-[var(--hover)]' : 'border-[var(--border)] bg-[var(--surface)]'
                }`}
              >
                <FileUp className="w-10 h-10 mx-auto mb-3 text-[var(--primary)]" />
                <p className="text-[var(--text)] font-semibold">Arraste o arquivo XLSX aqui</p>
                <p className="text-sm text-[var(--muted)] mt-1">Ou selecione manualmente</p>
                <div className="mt-4 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={triggerFileDialog}
                    className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors disabled:opacity-60"
                    disabled={importing}
                  >
                    {importing ? 'Processando...' : 'Selecionar arquivo'}
                  </button>
                </div>
                <p className="text-xs text-[var(--muted)] mt-3">
                  {selectedImportFile ? `Selecionado: ${selectedImportFile.name}` : 'Apenas .xlsx ou .xls'}
                </p>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportChange}
                className="hidden"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={startImport}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-60"
                  disabled={!selectedImportFile || importing}
                >
                  {importing ? 'Importando...' : 'Importar arquivo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Operations;
