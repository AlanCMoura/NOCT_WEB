import React, { useRef, useState, useCallback, useMemo, useEffect, useReducer } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Trash2, Plus, FileUp, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';
import ToggleSwitch from '../components/ToggleSwitch';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { computeStatus, getProgress, ContainerStatus } from '../services/containerProgress';
import { deleteOperation, getOperationById, updateOperation, completeOperationStatus, getSackImages, type ApiOperation, type UpdateOperationPayload } from '../services/operations';
import { createContainer, deleteContainer, getContainersByOperation, getAllContainerImages, getContainerById, CONTAINER_IMAGE_SECTIONS, mapApiCategoryToSectionKey, type ApiContainer, type ApiContainerStatus, type ContainerImageCategoryKey, type CreateContainerPayload } from '../services/containers';
import { LOGO_DATA_URI } from '../utils/logoDataUri';

interface OperationInfo {
  id: string;
  local: string;
  reserva: string;
  deadline: string;
  ctv: string;
  cliente: string;
  exporter: string;
  destination: string;
  ship: string;
  data: string;
  entrega: string;
}

interface Container {
  id: string;
  apiId?: string;
  description?: string;
  pesoBruto: string;
  lacreAgencia?: string;
  lacrePrincipal?: string;
  lacreOutros?: string;
  qtdSacarias?: number;
  terminal?: string;
  data?: string; // yyyy-mm-dd
  apiStatus?: ApiContainerStatus;
}

const coalesceText = (...values: unknown[]): string => {
  const found = values.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
  return found === undefined || found === null ? '' : String(found);
};

const numericToDate = (value: number): string => {
  // heurísticas: timestamp em ms, segundos ou serial Excel
  if (value > 1e12) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  if (value > 1e9) {
    const d = new Date(value * 1000);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  // serial Excel (base 1899-12-30)
  const excel = new Date(Math.round((value - 25569) * 86400 * 1000));
  return Number.isNaN(excel.getTime()) ? '' : excel.toISOString().slice(0, 10);
};

const toDateOnly = (value: unknown): string => {
  if (value === undefined || value === null) return '';

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === 'number') {
    return numericToDate(value);
  }

  const text = String(value).trim();
  if (!text) return '';

  const normalized = text.replace(/\//g, '-');

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);

  // dd-mm-yyyy ou d-m-yy
  const dayFirst = normalized.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dayFirst) {
    const [, d, m, y] = dayFirst;
    const year = y.length === 2 ? `20${y}` : y.padStart(4, '0');
    const date = new Date(Date.UTC(Number(year), Number(m) - 1, Number(d)));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  // número em string: tenta converter como serial/timestamp
  if (/^\d+$/.test(normalized)) {
    return numericToDate(Number(normalized));
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const coalesceDate = (...values: unknown[]): string => {
  for (const v of values) {
    const parsed = toDateOnly(v);
    if (parsed) return parsed;
  }
  return '';
};

const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const sanitizeText = (value: string): string => value.replace(/\//g, '-').trim();
const normalizeRowKeys = (row: Record<string, any>): Record<string, any> =>
  Object.entries(row).reduce<Record<string, any>>((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});
const pickCell = (row: Record<string, any>, keys: string[]): string => {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    const value = row[normalized];
    if (value !== undefined && value !== null && String(value).trim()) {
      return sanitizeText(String(value));
    }
  }
  return '';
};
const toOptionalNumber = (value: string): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizeStatus = (value: unknown): 'Aberta' | 'Fechada' => {
  const text = String(value ?? '').toUpperCase();
  if (text === 'COMPLETED' || text.includes('FINAL') || text.includes('FECH')) return 'Fechada';
  return 'Aberta';
};

const mapApiContainerStatusToDisplay = (status?: ApiContainerStatus): ContainerStatus => {
  if (!status) return 'Não inicializado';
  const upper = String(status).toUpperCase();
  if (upper === 'COMPLETED' || upper.includes('FINAL')) return 'Completo';
  if (upper === 'PENDING') return 'Parcial';
  return 'Não inicializado';
};

const mapOperation = (op: ApiOperation): OperationInfo => {
  const idValue = coalesceText(
    op.id,
    op.code,
    op.booking,
    op.bookingCode,
    op.reserva,
    op.reservation,
    op.ctv,
    op.amv,
    '---'
  );

  return {
    id: idValue,
    local: coalesceText(op.terminal, op.destination),
    reserva: coalesceText(op.reserva, op.reservation, op.booking, op.bookingCode, op.code),
    ctv: coalesceText(op.ctv, op.amv, op.ship, op.code, op.booking, idValue),
    cliente: coalesceText(op.cliente, op.refClient),
    exporter: coalesceText(op.exporter),
    destination: coalesceText(op.destination),
    ship: coalesceText(op.shipName, op.ship, op.vesselName, op.vessel, op.navio),
    data: coalesceDate(op.data, op.arrivalDate),
    entrega: coalesceDate(op.entrega, op.loadDeadline),
    deadline: coalesceDate(op.deadlineDraft, op.loadDeadline, op.deadline),
  };
};

const mapContainers = (data: ApiOperation): Container[] => {
  const list = Array.isArray(data.containers)
    ? data.containers
    : Array.isArray(data.containerList)
      ? data.containerList
      : [];

  return list.map((item, index) => {
    const c = item as Record<string, unknown>;
    const apiId = c?.id !== undefined && c?.id !== null ? String(c.id) : undefined;
    const id = coalesceText(
      c?.id,
      c?.container,
      c?.name,
      c?.codigo,
      c?.identificacao,
      `CONT-${index + 1}`
    );

    return {
      id,
      apiId,
      description: coalesceText(c?.description),
      pesoBruto: coalesceText(c?.pesoBruto, c?.peso, c?.grossWeight),
      lacreAgencia: coalesceText(c?.lacreAgencia, c?.sealAgency),
      lacrePrincipal: coalesceText(c?.lacrePrincipal, c?.seal),
      lacreOutros: coalesceText(c?.lacreOutros),
      qtdSacarias: typeof c?.qtdSacarias === 'number' ? c.qtdSacarias : undefined,
      terminal: coalesceText(c?.terminal),
      data: coalesceText(c?.data, c?.date),
    };
  });
};

const mapApiContainers = (items: ApiContainer[] = []): Container[] =>
  items.map((c, index) => ({
    id: coalesceText(c.containerId, c.id, `CONT-${index + 1}`),
    apiId: c.id !== undefined && c.id !== null ? String(c.id) : undefined,
    description: coalesceText(c.description),
    pesoBruto: coalesceText(c.grossWeight),
    lacreAgencia: coalesceText(c.agencySeal),
    lacrePrincipal: coalesceText(c.agencySeal),
    lacreOutros: (c.otherSeals || []).join(', '),
    qtdSacarias: typeof c.sacksCount === 'number' ? c.sacksCount : undefined,
    terminal: '',
    data: '',
    apiStatus: c.status,
  }));

const emptyOperation: OperationInfo = {
  id: '',
  local: '',
  reserva: '',
  cliente: '',
  deadline: '',
  ctv: '',
  exporter: '',
  destination: '',
  ship: '',
  data: '',
  entrega: ''
};

const formatDatePt = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

const OperationDetails: React.FC = () => {
  type Field = keyof OperationInfo;
  type Errors = Partial<Record<Field, string>>;
  type OperationState = { opInfo: OperationInfo; isEditing: boolean; errors: Errors };
  type Action =
    | { type: 'startEdit' }
    | { type: 'cancelEdit'; backup: OperationInfo }
    | { type: 'update'; field: Field; value: string }
    | { type: 'setEditing'; value: boolean }
    | { type: 'setErrors'; errors: Errors }
    | { type: 'hydrate'; opInfo: OperationInfo };

  const reducer = (state: OperationState, action: Action): OperationState => {
    switch (action.type) {
      case 'startEdit':
        return { ...state, isEditing: true };
      case 'cancelEdit':
        return { opInfo: action.backup, isEditing: false, errors: {} };
      case 'update':
        return { ...state, opInfo: { ...state.opInfo, [action.field]: action.value } as OperationInfo };
      case 'setEditing':
        return { ...state, isEditing: action.value };
      case 'setErrors':
        return { ...state, errors: action.errors };
      case 'hydrate':
        return { ...state, opInfo: action.opInfo, isEditing: false, errors: {} };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, { opInfo: emptyOperation, isEditing: false, errors: {} });
  const { opInfo, isEditing, errors } = state;
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });
  const [containers, setContainers] = useState<Container[]>([]);
  const [containersLoading, setContainersLoading] = useState<boolean>(true);
  const [containerSearch, setContainerSearch] = useState<string>('');
  const opBackupRef = useRef<OperationInfo>(emptyOperation);
  const [operationStatus, setOperationStatus] = useState<'Aberta' | 'Fechada'>('Aberta');
  const isOperationClosed = operationStatus === 'Fechada';
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [loadingOp, setLoadingOp] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingOp, setSavingOp] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [deleteContainerLoading, setDeleteContainerLoading] = useState<string | null>(null);
  const [importingContainers, setImportingContainers] = useState<boolean>(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [isDragOverImport, setIsDragOverImport] = useState<boolean>(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const sectionsLoading = (loadingOp || containersLoading) && !loadError;
  const controlsDisabled = sectionsLoading;
  const operationLabel = opInfo.ctv || decodedOperationId;
  const operationLabelLoading = loadingOp && !opInfo.ctv;

  // Ordenacao e Paginacao
  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);
  type StatusKey = 'todos' | 'ni' | 'parcial' | 'completo';
  const [statusKey, setStatusKey] = useState<StatusKey>('todos');
  const statusOf = useCallback(
    (id: string) => {
      const target = containers.find((c) => c.id === id);
      if (target?.apiStatus) {
        return mapApiContainerStatusToDisplay(target.apiStatus);
      }
      return computeStatus(getProgress(id));
    },
    [containers]
  );

  const toDataUri = useCallback(async (url: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('reader failed'));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return url; // fallback ao URL original se nÇõÇœ conseguir embutir
    }
  }, []);

  const fetchContainerImages = useCallback(
    async (container: Container) => {
      const keys = Array.from(
        new Set(
          [container.apiId, container.id]
            .filter(Boolean)
            .map((k) => String(k))
        )
      );
      const empty: Record<ContainerImageCategoryKey, string[]> = CONTAINER_IMAGE_SECTIONS.reduce((acc, { key }) => {
        acc[key] = [];
        return acc;
      }, {} as Record<ContainerImageCategoryKey, string[]>);
      if (!keys.length) return empty;

      try {
        const byCategory: Record<ContainerImageCategoryKey, Set<string>> = CONTAINER_IMAGE_SECTIONS.reduce((acc, { key }) => {
          acc[key] = new Set<string>();
          return acc;
        }, {} as Record<ContainerImageCategoryKey, Set<string>>);

        // Imagens vindas do detalhe do container (caso já venham com categoria)
        for (const key of keys) {
          try {
            const full = await getContainerById(key);
            (full?.containerImages || []).forEach((img) => {
              const url = img?.signedUrl || img?.url || img?.imageUrl;
              const mappedKey = mapApiCategoryToSectionKey(img?.category) ?? 'lacresOutros';
              if (url) byCategory[mappedKey]?.add(url);
            });
          } catch {
            /* ignore */
          }
        }

        // Endpoint dedicado por seção
        for (const key of keys) {
          try {
            const bySection = await getAllContainerImages(key);
            (Object.keys(bySection || {}) as ContainerImageCategoryKey[]).forEach((cat) => {
              (bySection?.[cat] || []).forEach((img) => {
                const url = img?.signedUrl || img?.url || img?.imageUrl;
                if (url) byCategory[cat]?.add(url);
              });
            });
          } catch {
            /* ignore */
          }
        }

        const result: Record<ContainerImageCategoryKey, string[]> = {} as Record<ContainerImageCategoryKey, string[]>;
        for (const { key } of CONTAINER_IMAGE_SECTIONS) {
          const urls = Array.from(byCategory[key]);
          result[key] = await Promise.all(urls.map((u) => toDataUri(u)));
        }
        return result;
      } catch {
        return empty;
      }
    },
    [toDataUri]
  );

  const fetchSacariaImages = useCallback(async () => {
    if (!decodedOperationId) return [] as string[];
    try {
      const data = await getSackImages(decodedOperationId);
      const urls = (data || [])
        .map((img: any) => img?.url || img?.imageUrl || img?.signedUrl)
        .filter(Boolean) as string[];
      if (!urls.length) return [];
      return Promise.all(urls.map((u) => toDataUri(u)));
    } catch {
      return [] as string[];
    }
  }, [decodedOperationId, toDataUri]);

  const exportPdf = useCallback(async () => {
    if (exportingPdf) return;
    if (!opInfo || sectionsLoading) {
      window.alert('Carregue a operaÇõÇœ e os containers antes de exportar.');
      return;
    }

    setExportingPdf(true);
    try {
      const safe = (val: string | number) =>
        String(val ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

      const fmt = (val: string | number | undefined) => (val === undefined || val === null || val === '' ? '-' : String(val));
      const opTitle = `Relatório Operação ${opInfo.ctv || decodedOperationId || '---'}`;
      const opRows = [
        { label: 'CTV', value: opInfo.ctv || decodedOperationId },
        { label: 'Reserva', value: opInfo.reserva },
        { label: 'Local (Terminal)', value: opInfo.local },
        { label: 'Destino', value: opInfo.destination },
        { label: 'Navio', value: opInfo.ship },
        { label: 'Exportador', value: opInfo.exporter },
        { label: 'Deadline Draft', value: formatDatePt(opInfo.deadline) },
        { label: 'Ref. Cliente', value: opInfo.cliente },
        { label: 'Data de Chegada', value: formatDatePt(opInfo.data) },
        { label: 'Deadline de Carregamento', value: formatDatePt(opInfo.entrega) },
        { label: 'Status', value: operationStatus },
      ];

      const containersWithImages = await Promise.all(
        containers.map(async (c) => ({
          ...c,
          status: statusOf(c.id),
          imagesByCategory: await fetchContainerImages(c),
        }))
      );
      const sacariaImages = await fetchSacariaImages();

      const opRowsHtml = opRows
        .map(
          ({ label, value }) => `
        <tr>
          <th>${safe(label)}</th>
          <td>${safe(fmt(value))}</td>
        </tr>`
        )
        .join('');

      const containersHtml = containersWithImages
        .map(
          (c) => `
        <div class="container-block">
          <div class="container-header">
            <h3>Container ${safe(c.id)}</h3>
            <span class="badge">${safe(c.status || '')}</span>
          </div>
          <table>
            <tr><th>Descrição</th><td>${safe(fmt(c.description))}</td></tr>
            <tr><th>Peso Bruto</th><td>${safe(fmt(c.pesoBruto))}</td></tr>
            <tr><th>Lacre Agencia</th><td>${safe(fmt(c.lacreAgencia))}</td></tr>
            <tr><th>Lacre Principal</th><td>${safe(fmt(c.lacrePrincipal))}</td></tr>
            <tr><th>Outros Lacres</th><td>${safe(fmt(c.lacreOutros))}</td></tr>
            <tr><th>Qtd. Sacarias</th><td>${safe(fmt(c.qtdSacarias))}</td></tr>
          </table>
          ${CONTAINER_IMAGE_SECTIONS.map(({ key, label }) => {
            const imgs = c.imagesByCategory?.[key] || [];
            const content = imgs.length
              ? imgs
                  .map(
                    (url: string) => `
              <div class="img-box">
                <img src="${safe(url)}" alt="${safe(label)} - ${safe(c.id)}" />
              </div>`
                  )
                  .join('')
              : '<p class="muted">Sem imagens</p>';
            return `
              <div class="img-section">
                <h4>${safe(label)}</h4>
                <div class="img-grid">
                  ${content}
                </div>
              </div>
            `;
          }).join('')}
        </div>`
        )
        .join('');

      const sacariaHtml = `
        <div class="container-block">
          <div class="container-header">
            <h3>Sacaria</h3>
            <span class="badge">Operação</span>
          </div>
          <div class="img-grid">
            ${
              sacariaImages.length
                ? sacariaImages
                    .map(
                      (url) => `
              <div class="img-box">
                <img src="${safe(url)}" alt="Sacaria - imagem" />
              </div>`
                    )
                    .join('')
                : '<p class="muted">Sem imagens de sacaria</p>'
            }
          </div>
        </div>
      `;

      const html = `
        <html>
          <head>
            <title>${safe(opTitle)}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
              .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
              h2 { margin: 0; }
              p { margin: 4px 0 12px; font-size: 12px; color: #6b7280; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              th { text-align: left; width: 35%; background: #f3f4f6; padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 12px; }
              td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 12px; }
              .container-block { page-break-inside: avoid; margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
              .container-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
              .badge { background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; }
              .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 8px; }
              .img-box { border: 1px dashed #e5e7eb; padding: 6px; border-radius: 6px; background: #fafafa; }
              .img-box img { width: 100%; height: auto; display: block; border-radius: 4px; }
              .muted { color: #9ca3af; font-size: 12px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h2>${safe(opTitle)}</h2>
                <p>Gerado em ${safe(new Date().toLocaleString())}</p>
              </div>
              <img src="${LOGO_DATA_URI}" alt="logo" style="height:50px; width:auto;" />
            </div>
            <table>${opRowsHtml}</table>
            ${sacariaHtml}
            <div>${containersHtml || '<p class="muted">Nenhum container</p>'}</div>
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
      iframe.title = opTitle;
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
      const previousTitle = document.title;
      document.title = opTitle;
      iframe.onload = () => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) doc.title = opTitle;
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } finally {
          setTimeout(() => {
            document.title = previousTitle;
            document.body.removeChild(iframe);
          }, 300);
        }
      };
    } finally {
      setExportingPdf(false);
    }
  }, [containers, decodedOperationId, exportingPdf, fetchContainerImages, fetchSacariaImages, opInfo, operationStatus, sectionsLoading, statusOf]);

  const filteredContainers = useMemo(() => {
    const q = containerSearch.trim().toLowerCase();
    const byStatus = (statusKey === 'todos')
      ? containers
      : containers.filter(c => statusOf(c.id) === (statusKey === 'ni' ? 'Não inicializado' : statusKey === 'parcial' ? 'Parcial' : 'Completo'));

    if (!q) return byStatus;
    return byStatus.filter((c) => {
      const text = [
        c.id,
        c.description,
        c.lacreAgencia,
        c.lacrePrincipal,
        c.lacreOutros,
        c.pesoBruto,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [containers, statusKey, statusOf, containerSearch]);

  const total = filteredContainers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const handleDeleteContainer = async (containerId: string) => {
    const confirmed = window.confirm(`Excluir o container ${containerId}?`);
    if (!confirmed) return;
    setDeleteContainerLoading(containerId);
    setLoadError(null);
    try {
      await deleteContainer(containerId);
      setContainers((prev) => prev.filter((c) => c.id !== containerId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possivel excluir o container.';
      setLoadError(msg);
    } finally {
      setDeleteContainerLoading(null);
    }
  };

  const buildContainerPayloadFromRow = useCallback(
    (row: Record<string, any>): CreateContainerPayload => {
      const normalized = normalizeRowKeys(row);
      const containerId = pickCell(normalized, ['containerid', 'id', 'codigo', 'identificacao', 'container']);
      const description = pickCell(normalized, ['description', 'descricao', 'desc']);
      const sacksCount = toOptionalNumber(pickCell(normalized, ['sackscount', 'sacos', 'sacas', 'quantidade']));
      const tareKg = toOptionalNumber(pickCell(normalized, ['tarekg', 'tara', 'tare', 'tara_kg']));
      const liquidWeight = toOptionalNumber(pickCell(normalized, ['liquidweight', 'peso_liquido', 'liquid', 'liquido']));
      const grossWeight = toOptionalNumber(pickCell(normalized, ['grossweight', 'peso_bruto', 'bruto']));
      const agencySeal = pickCell(normalized, ['agencyseal', 'lacre', 'lacreprincipal', 'lacres']);
      const otherSealsRaw = pickCell(normalized, ['otherseals', 'lacresoutros', 'outroslacres']);
      const otherSeals = otherSealsRaw
        ? otherSealsRaw.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      return {
        containerId,
        description,
        operationId: Number(decodedOperationId),
        sacksCount: sacksCount ?? undefined,
        tareTons: tareKg !== undefined ? tareKg / 1000 : undefined,
        liquidWeight: liquidWeight ?? undefined,
        grossWeight: grossWeight ?? undefined,
        agencySeal,
        otherSeals,
      };
    },
    [decodedOperationId]
  );

  const REQUIRED_CONTAINER_FIELDS = useMemo<Array<keyof CreateContainerPayload>>(
    () => ['containerId', 'description', 'operationId'],
    []
  );

  const refreshContainers = useCallback(async () => {
    try {
      const page = await getContainersByOperation(decodedOperationId, { page: 0, size: 200, sortBy: 'id', sortDirection: 'ASC' });
      const mappedFromApi = mapApiContainers(page.content || []);
      if (mappedFromApi.length) {
        setContainers(mappedFromApi);
        setPage(1);
      }
    } catch {
      // silencioso
    }
  }, [decodedOperationId, setPage]);

  const handleImportContainers = useCallback(
    async (file: File) => {
      if (!decodedOperationId || !Number.isFinite(Number(decodedOperationId))) {
        setImportErrors(['ID da operação inválido para importação de containers.']);
        return;
      }

      setImportingContainers(true);
      setImportMessage(null);
      setImportErrors([]);

      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
        if (!sheet) throw new Error('Planilha vazia ou sem abas.');

        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        if (!rows.length) throw new Error('Nenhuma linha encontrada na planilha.');

        const results = { created: 0, errors: [] as string[] };

        for (let i = 0; i < rows.length; i += 1) {
          const payload = buildContainerPayloadFromRow(rows[i]);
          const missing = REQUIRED_CONTAINER_FIELDS.filter((field) => {
            const value = payload[field];
            return value === undefined || value === null || String(value).trim() === '';
          });
          if (missing.length) {
            results.errors.push(`Linha ${i + 2}: faltam ${missing.join(', ')}`);
            continue;
          }

          try {
            await createContainer(payload);
            results.created += 1;
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar container';
            results.errors.push(`Linha ${i + 2}: ${message}`);
          }
        }

        if (results.created > 0) {
          setImportMessage(`Importação concluída: ${results.created} containers criados.`);
        } else if (results.errors.length) {
          setImportMessage('Importação finalizada com pendências. Confira os erros abaixo.');
        } else {
          setImportMessage('Nenhum container criado. Verifique o arquivo importado.');
        }

        setImportErrors(results.errors);
        await refreshContainers();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Não foi possível importar o arquivo.';
        setImportErrors([message]);
      } finally {
        setImportingContainers(false);
        setSelectedImportFile(null);
        if (importInputRef.current) {
          importInputRef.current.value = '';
        }
      }
    },
    [REQUIRED_CONTAINER_FIELDS, buildContainerPayloadFromRow, decodedOperationId, refreshContainers]
  );

  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImportFile(file);
      setIsDragOverImport(false);
    }
  };

  const handleImportDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOverImport(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedImportFile(file);
    }
  };

  const handleImportDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOverImport(true);
  };

  const handleImportDragLeave = () => setIsDragOverImport(false);

  const openImportModal = () => {
    setImportMessage(null);
    setImportErrors([]);
    setSelectedImportFile(null);
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setIsDragOverImport(false);
    setSelectedImportFile(null);
  };

  const triggerImportPicker = () => importInputRef.current?.click();

  const startImport = async () => {
    if (!selectedImportFile || importingContainers) return;
    await handleImportContainers(selectedImportFile);
    setShowImportModal(false);
  };

  // Carrega dados reais da operacao e containers (se retornados pela API)
  useEffect(() => {
    if (!decodedOperationId) return;

    let active = true;
    const load = async () => {
      setLoadingOp(true);
      setLoadError(null);
      setSaveError(null);
      setSaveMessage(null);
      setContainers([]);
      setPage(1);
      setContainersLoading(true);

      try {
        const data = await getOperationById(decodedOperationId);
        if (!active) return;

        dispatch({ type: 'hydrate', opInfo: mapOperation(data) });
        setOperationStatus(normalizeStatus(data.status));

        try {
          const containerPage = await getContainersByOperation(decodedOperationId, { page: 0, size: 200, sortBy: 'id', sortDirection: 'ASC' });
          if (active) {
            const mappedFromApi = mapApiContainers(containerPage.content || []);
            if (mappedFromApi.length) {
              setContainers(mappedFromApi);
              setPage(1);
              return;
            }
          }
        } catch {
          // fallback para containers vindo junto da operacao
        }

        const mappedContainers = mapContainers(data);
        setContainers(mappedContainers);
        setPage(1);
      } catch (err) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : 'Não foi possivel carregar a operacao.';
        setLoadError(msg);
      } finally {
        if (active) {
          setLoadingOp(false);
          setContainersLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [decodedOperationId]);

const buildUpdatePayload = (data: OperationInfo): UpdateOperationPayload => ({
  ctv: data.ctv,
  ship: data.ship,
  terminal: data.local,
  deadlineDraft: toDateOnly(data.deadline),
  destination: data.destination,
  arrivalDate: toDateOnly(data.data),
  reservation: data.reserva,
  refClient: data.cliente,
  loadDeadline: toDateOnly(data.entrega),
  exporter: data.exporter,
});

  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const paginated = useMemo(() => filteredContainers.slice(startIdx, endIdx), [filteredContainers, startIdx, endIdx]);

  const startEdit = () => {
    setSaveMessage(null);
    setSaveError(null);
    opBackupRef.current = opInfo;
    dispatch({ type: 'startEdit' });
  };

  const cancelEdit = () => {
    dispatch({ type: 'cancelEdit', backup: opBackupRef.current });
  };

  const handleDeleteOperation = async () => {
    if (!decodedOperationId) return;
    const confirmed = window.confirm('Tem certeza que deseja excluir a Operação ' + operationLabel + '?');
    if (!confirmed) return;
    
    setDeleteLoading(true);
    try {
      await deleteOperation(decodedOperationId);
      navigate('/operations');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possivel excluir a operação.';
      setLoadError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveOperation = async () => {
    if (savingOp) return;
    setSaveError(null);
    setSaveMessage(null);

    if (!decodedOperationId) {
      setSaveError('Operação não encontrada para atualizar.');
      return;
    }

    try {
      setSavingOp(true);
      const payload = buildUpdatePayload(opInfo);
      const updated = await updateOperation(decodedOperationId, payload);
      dispatch({ type: 'hydrate', opInfo: mapOperation(updated) });
      setOperationStatus(normalizeStatus(updated.status));
      setSaveMessage('Operação atualizada com sucesso.');
      dispatch({ type: 'setEditing', value: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível atualizar a operação.';
      setSaveError(msg);
    } finally {
      setSavingOp(false);
    }
  };

  const handleToggleStatus = async (checked: boolean) => {
    if (!decodedOperationId) return;
    setStatusError(null);

    const numericId = Number(decodedOperationId);
    const isNumericId = Number.isFinite(numericId);

    // Nao e possivel reabrir a operacao
    if (!checked) {
      setStatusError('Não e possível reabrir esta operação.');
      return;
    }

    if (operationStatus === 'Fechada') return;
    if (!isNumericId) {
      setStatusError('ID da operação invalido para alterar status.');
      return;
    }

    const prevStatus = operationStatus;

    try {
      setStatusLoading(true);
      const updated = await completeOperationStatus(numericId);
      dispatch({ type: 'hydrate', opInfo: mapOperation(updated) });
      setOperationStatus(normalizeStatus(updated.status));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível atualizar o status.';
      setStatusError(msg);
      setOperationStatus(prevStatus);
    } finally {
      setStatusLoading(false);
    }
  };

  // navegacao via SidebarProvider; handler antigo removido

  const handleContainerClick = (containerId: string): void => {
    navigate(
      `/operations/${encodeURIComponent(decodedOperationId)}/containers/${encodeURIComponent(containerId)}`
    );
  };

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">
                Operação{' '}
                {operationLabelLoading ? (
                  <span className="inline-block w-32 h-6 bg-[var(--hover)] rounded animate-pulse align-middle"></span>
                ) : (
                  operationLabel
                )}
              </h1>
              <p className="text-sm text-[var(--muted)]">Detalhes da Operação</p>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => changePage('perfil')} aria-label="Acessar perfil" className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden space-y-6">
          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          )}

            {sectionsLoading ? (
              <>
              <section className="bg-[var(--surface)] rounded-xl border border-[var(--border)] shadow-sm">
                <div className="p-6 border-b border-[var(--border)] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-[var(--text)]">Informações da Operação</h2>
                  </div>
                  <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                  >
                    Editar Operação
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
                  >
                    Excluir Operação
                  </button>
                  <button
                    type="button"
                    disabled
                    className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] opacity-50 cursor-not-allowed"
                  >
                    Voltar
                  </button>
                </div>
              </div>
                <div className="p-6 space-y-4 animate-pulse min-h-[180px]">
                  <div className="h-3 w-24 bg-[var(--hover)] rounded"></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="h-3 w-24 bg-[var(--hover)] rounded"></div>
                        <div className="h-4 w-full bg-[var(--hover)] rounded"></div>
                        <div className="h-3 w-3/4 bg-[var(--hover)] rounded"></div>
                      </div>
                    ))}
                </div>
                </div>
              </section>
              <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] mt-6">
                <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                  <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operação</h2>
                  <div className="flex flex-1 sm:flex-initial gap-3 items-center">
                    <div className="flex-1 h-10 bg-[var(--hover)] rounded animate-pulse"></div>
                    <div className="w-64 h-10 bg-[var(--hover)] rounded animate-pulse"></div>
                    <div className="h-10 w-32 bg-[var(--hover)] rounded animate-pulse"></div>
                    <div className="h-10 w-28 bg-[var(--hover)] rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="p-6 space-y-4 animate-pulse min-h-[260px]">
                  <div className="h-12 bg-[var(--hover)] rounded"></div>
                  <div className="h-10 bg-[var(--hover)] rounded"></div>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-14 bg-[var(--hover)] rounded"></div>
                  ))}
                  <div className="h-12 bg-[var(--hover)] rounded"></div>
                </div>
              </section>
              </>
            ) : (
            <>
          {saveMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {saveMessage}
            </div>
          )}
          {saveError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {importMessage || importErrors.length ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm flex items-start justify-between gap-3">
              <div>
                {importMessage ? <p className="font-semibold text-[var(--text)]">{importMessage}</p> : null}
                {importErrors.length ? (
                  <div className="mt-1 space-y-1 text-[var(--muted)]">
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
                onClick={() => {
                  setImportMessage(null);
                  setImportErrors([]);
                }}
                className="text-[var(--muted)] hover:text-[var(--text)] text-xs font-medium"
              >
                Fechar
              </button>
            </div>
          ) : null}
          <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleImportFileChange}
            aria-hidden="true"
          />
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-[var(--text)]">Informações da Operação</h2>
                  {!isEditing && (
                    <ToggleSwitch
                      id="operation-status-toggle"
                      className="flex items-center gap-2 text-sm mt-1 ml-4"
                      checked={operationStatus === 'Fechada'}
                      checkedLabel="Fechada"
                      uncheckedLabel="Em andamento"
                      onChange={handleToggleStatus}
                      disabled={statusLoading}
                    />
                  )}
                  {statusError && !isEditing && (
                    <p className="text-xs text-red-600">{statusError}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveOperation}
                        disabled={savingOp}
                        className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {savingOp ? 'Salvando...' : 'Salvar Operação'}
                      </button>
                    </>
                  ) : (
                    <>
                      {!isOperationClosed && (
                        <button
                          type="button"
                          onClick={startEdit}
                          className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar Operação
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDeleteOperation}
                        disabled={deleteLoading}
                        className="px-6 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteLoading ? 'Excluindo...' : 'Excluir Operação'}
                      </button>
                      <button
                        type="button"
                        onClick={exportPdf}
                        disabled={controlsDisabled || exportingPdf}
                        className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors flex items-center gap-2 disabled:opacity-60"
                      >
                        <Download className="w-4 h-4" />
                        {exportingPdf ? 'Exportando...' : 'Exportar Operação'}
                      </button>
                    <button
                      type="button"
                      onClick={() => navigate('/operations')}
                      className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                    >
                      Voltar
                    </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-[var(--muted)] block">ID</span>
                <span className="text-[var(--text)] font-medium">{opInfo.id}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">CTV</span>
                {isEditing ? (<>
                  <input value={opInfo.ctv} onChange={e=>dispatch({ type: 'update', field: 'ctv', value: e.target.value })} aria-invalid={!!errors.ctv} aria-describedby={errors.ctv ? 'ctv-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.ctv && (<p id="ctv-error" className="mt-1 text-xs text-red-600">{errors.ctv}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.ctv}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Reserva</span>
                {isEditing ? (<>
                  <input value={opInfo.reserva} onChange={e=>dispatch({ type: 'update', field: 'reserva', value: e.target.value })} aria-invalid={!!errors.reserva} aria-describedby={errors.reserva ? 'reserva-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.reserva && (<p id="reserva-error" className="mt-1 text-xs text-red-600">{errors.reserva}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.reserva}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Local (Terminal)</span>
                {isEditing ? (<>
                  <input value={opInfo.local} onChange={e=>dispatch({ type: 'update', field: 'local', value: e.target.value })} aria-invalid={!!errors.local} aria-describedby={errors.local ? 'local-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.local && (<p id="local-error" className="mt-1 text-xs text-red-600">{errors.local}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.local}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Destino</span>
                {isEditing ? (<>
                  <input value={opInfo.destination} onChange={e=>dispatch({ type: 'update', field: 'destination', value: e.target.value })} aria-invalid={!!errors.destination} aria-describedby={errors.destination ? 'destination-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.destination && (<p id="destination-error" className="mt-1 text-xs text-red-600">{errors.destination}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.destination}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Navio</span>
                {isEditing ? (<>
                  <input value={opInfo.ship} onChange={e=>dispatch({ type: 'update', field: 'ship', value: e.target.value })} aria-invalid={!!errors.ship} aria-describedby={errors.ship ? 'ship-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.ship && (<p id="ship-error" className="mt-1 text-xs text-red-600">{errors.ship}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.ship}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Exportador</span>
                {isEditing ? (<>
                  <input value={opInfo.exporter} onChange={e=>dispatch({ type: 'update', field: 'exporter', value: e.target.value })} aria-invalid={!!errors.exporter} aria-describedby={errors.exporter ? 'exporter-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.exporter && (<p id="exporter-error" className="mt-1 text-xs text-red-600">{errors.exporter}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.exporter}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Deadline Draft</span>
                {isEditing ? (<>
                  <input
                    type="date"
                    value={opInfo.deadline}
                    onChange={e=>dispatch({ type: 'update', field: 'deadline', value: e.target.value })}
                    aria-invalid={!!errors.deadline}
                    aria-describedby={errors.deadline ? 'deadline-error' : undefined}
                    className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {errors.deadline && (<p id="deadline-error" className="mt-1 text-xs text-red-600">{errors.deadline}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{formatDatePt(opInfo.deadline)}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Ref. Cliente</span>
                {isEditing ? (
                  <input
                    value={opInfo.cliente}
                    onChange={(e) => dispatch({ type: 'update', field: 'cliente', value: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.cliente || '-'}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Data de Chegada</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={opInfo.data}
                    onChange={(e) => dispatch({ type: 'update', field: 'data', value: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <span className="text-[var(--text)] font-medium">{formatDatePt(opInfo.data)}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Deadline de Carregamento</span>
                {isEditing ? (
                  <input
                    type="date"
                    value={opInfo.entrega}
                    onChange={(e) => dispatch({ type: 'update', field: 'entrega', value: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <span className="text-[var(--text)] font-medium">{formatDatePt(opInfo.entrega)}</span>
                )}
              </div>
            </div>
          </section>

          {/* Sacaria upload dorment (moved to dedicated page) */}

          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operação</h2>
                <div className="flex flex-1 sm:flex-initial gap-3 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar container..."
                      aria-label="Buscar container"
                      disabled={controlsDisabled}
                      value={containerSearch}
                      onChange={(e) => setContainerSearch(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-[var(--surface)] text-[var(--text)] ${controlsDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>
                  <div className="w-64">
                    <select
                      value={statusKey as any}
                      onChange={(e) => setStatusKey(e.target.value as any)}
                      disabled={controlsDisabled}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                      aria-label="Filtrar por Status"
                      title="Filtrar containers pelo status"
                    >
                      <option value="todos">Todos os Status</option>
                    <option value="ni">Não inicializado</option>
                    <option value="parcial">Parcial</option>
                    <option value="completo">Completo</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/containers/new`)}
                  disabled={controlsDisabled}
                  className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Container
                </button>
                <button
                  type="button"
                  onClick={openImportModal}
                  disabled={controlsDisabled}
                  className="inline-flex items-center px-4 py-2 bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-lg text-sm font-medium hover:bg-[var(--hover)] transition-colors gap-2"
                  title="Importar containers via planilha XLSX"
                >
                  <FileUp className="w-4 h-4" />
                  Importar
                </button>
                <button
                  aria-label="Ver overview da operação"
                  onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/overview`)}
                  disabled={controlsDisabled}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Overview
                </button>
              </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {sectionsLoading ? (
                <div className="p-6 space-y-4 animate-pulse min-h-[260px]">
                  <div className="h-12 bg-[var(--hover)] rounded"></div>
                  <div className="h-10 bg-[var(--hover)] rounded"></div>
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-14 bg-[var(--hover)] rounded"></div>
                  ))}
                  <div className="h-12 bg-[var(--hover)] rounded"></div>
                </div>
              ) : (
                <>
                  {/* Item especial: Sacaria (como se fosse um container) */}
                  <button
                    type="button"
                    aria-label="Abrir sacaria"
                    className="w-full text-left p-4 flex items-center justify-between cursor-pointer transition-colors bg-[var(--hover)] border-l-4 border-teal-500"
                    onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/sacaria`)}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)]">Sacaria</div>
                    </div>
                  </button>
                  {/* Contador total */}
                  <div className="px-4 py-2 text-sm text-[var(--muted)]">
                    Total de containers: <span className="font-medium text-[var(--text)]">{total}</span>
                  </div>
                  {paginated.map(container => (
                    <div
                      key={container.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleContainerClick(container.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleContainerClick(container.id); }}
                      className="w-full text-left p-4 flex items-center justify-between hover:bg-[var(--hover)] transition-colors cursor-pointer focus:outline-none"
                      aria-label={`Abrir container ${container.id}`}
                    >
                      <div>
                        <div className="text-sm font-medium text-[var(--text)]">{container.id}</div>
                        <div className="text-xs text-[var(--muted)]">{container.pesoBruto} Peso Bruto</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          (() => { const s = statusOf(container.id); return s === 'Completo' ? 'bg-green-100 text-green-800' : s === 'Parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'; })()
                        }`}>
                          {statusOf(container.id)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteContainer(container.id); }}
                            onKeyDown={(e) => e.stopPropagation()}
                            disabled={deleteContainerLoading === container.id}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deleteContainerLoading === container.id ? 'Excluindo...' : 'Excluir'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {/* Paginacao */}
            {!sectionsLoading && (
              <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">
                  {total === 0 ? (
                    <span>Mostrando 0 a 0 de 0</span>
                  ) : (
                    <span>
                      Mostrando <span className="font-medium">{startIdx + 1}</span> a <span className="font-medium">{endIdx}</span> de <span className="font-medium">{total}</span>
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
            )}
          </section>

          {showImportModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/40" onClick={closeImportModal} />
              <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--text)]">Importar containers</p>
                    <p className="text-sm text-[var(--muted)]">
                      Baixe o modelo, preencha os campos e arraste o arquivo XLSX aqui para criar containers.
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
                    href="/modelo-containers.xlsx"
                    download
                    className="inline-flex items-center px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-semibold hover:opacity-90 transition-colors"
                  >
                    Baixar modelo
                  </a>
                </div>

                <div
                  onDrop={handleImportDrop}
                  onDragOver={handleImportDragOver}
                  onDragLeave={handleImportDragLeave}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    isDragOverImport ? 'border-[var(--primary)] bg-[var(--hover)]' : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  <FileUp className="w-10 h-10 mx-auto mb-3 text-[var(--primary)]" />
                  <p className="text-[var(--text)] font-semibold">Arraste o arquivo XLSX aqui</p>
                  <p className="text-sm text-[var(--muted)] mt-1">Ou selecione manualmente</p>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={triggerImportPicker}
                      className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors disabled:opacity-60"
                      disabled={importingContainers}
                    >
                      {importingContainers ? 'Processando...' : 'Selecionar arquivo'}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-3">
                    {selectedImportFile ? `Selecionado: ${selectedImportFile.name}` : 'Apenas .xlsx ou .xls'}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={startImport}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-semibold hover:opacity-90 transition-colors disabled:opacity-60"
                    disabled={!selectedImportFile || importingContainers}
                  >
                    {importingContainers ? 'Importando...' : 'Importar arquivo'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </main>

      </div>
    </div>
  );
};

export default OperationDetails;
