import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Package,
  RefreshCcw,
  Ship,
  TrendingUp,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import {
  getDashboardMetrics,
  type DashboardMetricsDTO,
  type MonthlyTrendDTO,
  type RecentOperationDTO,
} from '../services/dashboard';
import { LOGO_DATA_URI } from '../utils/logoDataUri';

type OperationStatus = 'Aberta' | 'Fechada';
type TrendSemester = 'H1' | 'H2';

interface RecentOperation {
  id: string;
  status: OperationStatus;
  createdAt: string;
  containerCount: number;
  reservation?: string;
  ctv?: string;
}

interface ChartSegment {
  label: string;
  value: number;
  color: string;
}

interface TrendPoint {
  label: string;
  operations: number;
  containers: number;
}

const normalizeStatus = (value: unknown): OperationStatus => {
  const text = String(value ?? '').toUpperCase();
  if (text === 'COMPLETED' || text.includes('FINAL') || text.includes('FECH')) return 'Fechada';
  return 'Aberta';
};

const getMonthOrder = (monthNumber: number | null | undefined): number => {
  if (typeof monthNumber !== 'number' || Number.isNaN(monthNumber)) return 1;
  if (monthNumber >= 1 && monthNumber <= 12) return monthNumber;
  return monthNumber + 1; // fallback para APIs que usam 0-11
};

const formatMonthLabel = (item: MonthlyTrendDTO): string => {
  const raw = String(item.month ?? '').trim();
  const monthOrder = getMonthOrder(item.monthNumber);
  const year = typeof item.year === 'number' && !Number.isNaN(item.year) ? item.year : new Date().getFullYear();
  if (raw) {
    const cleaned = raw.replace('.', '').trim().toUpperCase();
    const stripped = cleaned.replace(/[0-9/.\-\s]/g, '').trim();
    if (stripped) return stripped;
  }
  const date = new Date(year, Math.min(Math.max(monthOrder - 1, 0), 11), 1);
  return date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
};

const escapeCsvValue = (value: unknown): string =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const toCsvLine = (values: unknown[]): string => values.map(escapeCsvValue).join(';');

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const buildTrendData = (source: MonthlyTrendDTO[], semester: TrendSemester) => {
  if (!source.length) {
    return { points: [] as TrendPoint[], year: new Date().getFullYear() };
  }

  const years = source
    .map((item) => (typeof item.year === 'number' && !Number.isNaN(item.year) ? item.year : null))
    .filter((year): year is number => year !== null);
  const currentYear = new Date().getFullYear();
  const targetYear = years.length ? Math.max(...years) : currentYear;

  const startMonth = semester === 'H1' ? 1 : 7;
  const months = Array.from({ length: 6 }, (_, idx) => startMonth + idx);

  const byMonth = new Map<number, MonthlyTrendDTO>();
  source.forEach((item) => {
    const monthOrder = getMonthOrder(item.monthNumber);
    const yearValue = typeof item.year === 'number' && !Number.isNaN(item.year) ? item.year : targetYear;
    if (yearValue === targetYear && monthOrder >= 1 && monthOrder <= 12) {
      byMonth.set(monthOrder, item);
    }
  });

  const points = months.map((monthOrder) => {
    const fallback: MonthlyTrendDTO = {
      month: '',
      year: targetYear,
      monthNumber: monthOrder,
      operations: 0,
      containers: 0,
    };
    const item = byMonth.get(monthOrder) ?? fallback;
    return {
      label: formatMonthLabel(item),
      operations: typeof item.operations === 'number' ? item.operations : 0,
      containers: typeof item.containers === 'number' ? item.containers : 0,
    };
  });

  return { points, year: targetYear };
};

const mapRecentOperation = (op: RecentOperationDTO): RecentOperation => {
  const idValue = op.id ?? op.ctv ?? op.reservation ?? `op-${Date.now()}`;
  return {
    id: String(idValue),
    ctv: op.ctv ? String(op.ctv) : undefined,
    reservation: op.reservation ? String(op.reservation) : undefined,
    status: normalizeStatus(op.status),
    createdAt: op.createdAt ? String(op.createdAt) : '',
    containerCount: typeof op.containerCount === 'number' ? op.containerCount : 0,
  };
};

const formatDate = (iso: string): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  helper?: string;
  accent?: string;
}> = ({ icon, title, value, helper, accent }) => (
  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-[var(--muted)]">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</p>
        {helper ? <p className="text-xs text-[var(--muted)] mt-1">{helper}</p> : null}
      </div>
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${
          accent ?? 'bg-[rgba(23,191,160,0.12)] text-[var(--primary)] border border-[rgba(23,191,160,0.3)]'
        }`}
      >
        {icon}
      </div>
    </div>
  </div>
);

const DonutChart: React.FC<{ segments: ChartSegment[]; size?: number }> = ({ segments, size = 140 }) => {
  const stroke = 25;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);
  const safeTotal = Math.max(totalValue, 1); // evita divisão por zero

  let offset = 0;

    return (
      <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => {
          const dash = (seg.value / safeTotal) * circumference;
          const circle = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
            />
          );
          offset += dash;
          return circle;
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius - stroke * 0.6}
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth={1}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="fill-[var(--text)] text-lg font-semibold"
        >
          {totalValue}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm text-[var(--text)]">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[var(--muted)]">{seg.label}</span>
            <span className="font-semibold">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MultiLineChart: React.FC<{ data: TrendPoint[]; showNovDecPair?: boolean }> = ({
  data,
  showNovDecPair = true,
}) => {
  const height = 360; // mais altura para acomodar tooltips e valores altos
  const padding = 80; // respiro extra
  const minWidth = 900;
  const baseSpacing = 80; // espaçamento ideal
  const safeSteps = Math.max(data.length - 1, 1);
  const naturalWidth = baseSpacing * safeSteps;
  const plotWidth = Math.max(naturalWidth, minWidth - padding * 2);
  const width = padding * 2 + plotWidth;
  const plotHeight = height - padding * 2;
  const legendY = height - padding + 26; // legenda abaixo do eixo sem sobrepor
  const effectiveSpacing = plotWidth / safeSteps;

  const maxValue = Math.max(
    ...data.map((p) => Math.max(p.operations, p.containers)),
    1
  );

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [hoverXRaw, setHoverXRaw] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState<number | null>(null);

  const getX = (index: number) => padding + index * effectiveSpacing;
  const getY = (value: number) =>
    padding + plotHeight - (value / maxValue) * plotHeight;

  const buildPath = (selector: (p: TrendPoint) => number) =>
    data
      .map((point, index) => {
        const x = getX(index);
        const y = getY(selector(point));
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  const operationsPath = buildPath((p) => p.operations);
  const containersPath = buildPath((p) => p.containers);

  const operationsColor = '#FBBF24'; // amarelo
  const containersColor = 'var(--primary)';

  const clampIndex = (idx: number) => Math.min(Math.max(idx, 0), data.length - 1);

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left;
    const minX = padding;
    const maxX = padding + effectiveSpacing * safeSteps;
    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const rawIndex = (clampedX - padding) / effectiveSpacing;
    const idx = clampIndex(Math.round(rawIndex));
    setHoverIndex(idx);
    setHoverX(clampedX);
    setHoverXRaw(rawX);
    setHoverY(event.clientY - rect.top);
  };

  const tooltip = (() => {
    if (hoverIndex === null || data.length === 0) return null;

    const clampedHover = Math.max(0, Math.min(data.length - 1, hoverIndex));
    const rawIndex =
      hoverXRaw !== null
        ? (hoverXRaw - padding) / effectiveSpacing
        : hoverX !== null
          ? (hoverX - padding) / effectiveSpacing
          : clampedHover;

    const baseIndex = Math.floor(rawIndex);
    const nextIndex = baseIndex + 1;
    const basePoint = data[clampIndex(baseIndex)];
    const nextPoint = nextIndex < data.length ? data[clampIndex(nextIndex)] : undefined;

    const fraction = rawIndex - baseIndex;
    const betweenNovDec =
      showNovDecPair &&
      fraction > 0.25 &&
      fraction < 0.75 &&
      basePoint &&
      nextPoint &&
      ((basePoint.label === 'NOV' && nextPoint.label === 'DEZ') ||
        (basePoint.label === 'DEZ' && nextPoint.label === 'NOV'));

    const indices: number[] = [clampIndex(baseIndex)];
    if (betweenNovDec) {
      indices.push(clampIndex(nextIndex));
    }

    const pointsToShow = indices
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((idx) => ({ idx, point: data[idx] }))
      .filter((item) => item.point);

    if (!pointsToShow.length) return null;

    const pillWidth = betweenNovDec ? 190 : 170;
    const pillHalf = pillWidth / 2;
    const xFromCursor =
      hoverXRaw !== null
        ? hoverXRaw
        : hoverX !== null
          ? hoverX
          : getX(clampedHover);
    const x = Math.max(padding + pillHalf + 2, Math.min(width - padding - pillHalf - 2, xFromCursor));

    const minYValue = Math.min(
      ...pointsToShow.map(({ point }) =>
        Math.min(getY(point.operations), getY(point.containers))
      )
    );
    const cursorY =
      hoverY !== null
        ? hoverY - 6 // cola logo acima do cursor
        : minYValue - 6;
    const y = Math.max(padding + 6, Math.min(cursorY, height - padding - 18));

    return (
      <g>
          <rect
          x={x - pillHalf}
          y={y - 26}
          width={pillWidth}
          height={betweenNovDec ? 60 : 46}
            rx="10"
            fill="var(--surface)"
            stroke="var(--border)"
          strokeWidth="1"
          opacity="0.97"
        />
        <text x={x} y={y - 12} textAnchor="middle" className="fill-[var(--text)] text-[11px] font-semibold">
          {pointsToShow.length === 1 ? pointsToShow[0].point.label : 'NOV / DEZ'}
        </text>
        {pointsToShow.map(({ point }, idx) => {
          const lineY = y + 4 + idx * 14;
          return (
            <text key={point.label} x={x} y={lineY} textAnchor="middle" className="fill-[var(--muted)] text-[11px]">
              {`${point.label}: Op ${point.operations} | Cont ${point.containers}`}
            </text>
          );
        })}
      </g>
    );
  })();

  return (
    <div className="w-full overflow-x-auto">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <line
          x1={padding}
          y1={padding}
          x2={padding}
          y2={height - padding}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {tooltip}

        <path
          d={operationsPath}
          fill="none"
          stroke={operationsColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <path
          d={containersPath}
          fill="none"
          stroke={containersColor}
          strokeWidth={3}
          strokeLinecap="round"
        />

        {data.map((point, index) => {
          const x = getX(index);
          const yOps = getY(point.operations);
          const yCont = getY(point.containers);
          return (
            <g key={point.label}>
              <circle cx={x} cy={yOps} r={5} fill={operationsColor} />
              <circle cx={x} cy={yCont} r={5} fill={containersColor} />
              <text
                x={x}
                y={height - padding + 14}
                textAnchor="middle"
                className="fill-[var(--muted)] text-[10px]"
              >
                {point.label}
              </text>
            </g>
          );
        })}

        <g transform={`translate(${padding}, ${legendY})`} className="text-[11px]">
          <rect width="12" height="12" rx="3" fill={operationsColor} />
          <text x="16" y="10" className="fill-[var(--text)]">
            Operações
          </text>
        </g>
        <g transform={`translate(${padding + 120}, ${legendY})`} className="text-[11px]">
          <rect width="12" height="12" rx="3" fill={containersColor} />
          <text x="16" y="10" className="fill-[var(--text)]">
            Containers
          </text>
        </g>

        <rect
          x={padding}
          y={padding}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetricsDTO | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os dados.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalOperations = metrics?.totalOperations ?? 0;
  const openOperations = metrics?.openOperations ?? 0;
  const closedOperations = metrics?.completedOperations ?? 0;
  const totalContainers = metrics?.totalContainers ?? 0;

  const statusSegments = useMemo<ChartSegment[]>(
    () => [
      { label: 'Abertas', value: openOperations, color: '#FBBF24' }, // amarelo
      { label: 'Fechadas', value: closedOperations, color: 'var(--accent-green)' },
    ],
    [openOperations, closedOperations]
  );

  const currentMonth = new Date().getMonth();
  const initialSemester: TrendSemester = currentMonth < 6 ? 'H1' : 'H2';
  const [trendSemester, setTrendSemester] = useState<TrendSemester>(initialSemester);
  const trendSemesterLabel = trendSemester === 'H1' ? '1o Semestre' : '2o Semestre';

  const { points: monthlyTrend, year: trendYear } = useMemo(
    () => buildTrendData(metrics?.monthlyTrend ?? [], trendSemester),
    [metrics?.monthlyTrend, trendSemester]
  );

  const recentOperations = useMemo(() => {
    const toTime = (value: string) => {
      const time = new Date(value).getTime();
      return Number.isNaN(time) ? 0 : time;
    };

    return (metrics?.recentOperations ?? [])
      .map(mapRecentOperation)
      .sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt))
      .slice(0, 6);
  }, [metrics?.recentOperations]);

  const avgContainers = useMemo(() => {
    const raw = metrics?.averageContainersPerOperation;
    if (typeof raw === 'number' && !Number.isNaN(raw)) return +raw.toFixed(1);
    if (!totalOperations) return 0;
    return +(totalContainers / totalOperations).toFixed(1);
  }, [metrics?.averageContainersPerOperation, totalContainers, totalOperations]);

  const completionRate = useMemo(() => {
    const raw = metrics?.completionRate;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return 0;
    const normalized = raw <= 1 ? raw * 100 : raw;
    return Math.round(normalized);
  }, [metrics?.completionRate]);

  const canExport = Boolean(metrics) && !isLoading;

  const skeletonCards = (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
          <div className="animate-pulse space-y-2">
            <div className="h-3 w-24 bg-[var(--hover)] rounded" />
            <div className="h-6 w-16 bg-[var(--hover)] rounded" />
            <div className="h-3 w-20 bg-[var(--hover)] rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const exportDashboardCsv = () => {
    if (!metrics) {
      window.alert('Carregue o dashboard antes de exportar.');
      return;
    }

    const now = new Date();
    const lines: string[] = [];

    lines.push(toCsvLine(['Dashboard']));
    lines.push(toCsvLine(['Gerado em', now.toLocaleString()]));
    lines.push('');

    lines.push(toCsvLine(['Resumo']));
    lines.push(toCsvLine(['Indicador', 'Valor']));
    lines.push(toCsvLine(['Operações registradas', totalOperations]));
    lines.push(toCsvLine(['Operações abertas', openOperations]));
    lines.push(toCsvLine(['Operações fechadas', closedOperations]));
    lines.push(toCsvLine(['Containers totais', totalContainers]));
    lines.push(toCsvLine(['Media por operação', avgContainers]));
    lines.push(toCsvLine(['Taxa de conclusao', `${completionRate}%`]));
    lines.push('');

    lines.push(toCsvLine(['Distribuição por status']));
    lines.push(toCsvLine(['Status', 'Quantidade']));
    lines.push(toCsvLine(['Abertas', openOperations]));
    lines.push(toCsvLine(['Fechadas', closedOperations]));
    lines.push('');

    lines.push(toCsvLine([`Tendencia ${trendSemesterLabel} ${trendYear}`]));
    lines.push(toCsvLine(['Mes', 'Operações', 'Containers']));
    if (!monthlyTrend.length) {
      lines.push(toCsvLine(['Sem dados', '', '']));
    } else {
      monthlyTrend.forEach((point) => {
        lines.push(toCsvLine([point.label, point.operations, point.containers]));
      });
    }
    lines.push('');

    lines.push(toCsvLine(['Operações recentes']));
    lines.push(toCsvLine(['CTV/ID', 'Reserva', 'Status', 'Data', 'Containers']));
    if (!recentOperations.length) {
      lines.push(toCsvLine(['Sem dados', '', '', '', '']));
    } else {
      recentOperations.forEach((op) => {
        lines.push(
          toCsvLine([
            op.ctv || op.id,
            op.reservation || '-',
            op.status,
            formatDate(op.createdAt),
            op.containerCount,
          ])
        );
      });
    }

    const csv = lines.join('\n');
    const csvWithBom = `\uFEFF${csv}`;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${now.toISOString().replace(/[:T]/g, '-').slice(0, 19)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildStatusChartHtml = () => {
    const size = 200;
    const stroke = 22;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = openOperations + closedOperations;
    const safeTotal = Math.max(total, 1);
    const segments = [
      { label: 'Abertas', value: openOperations, color: '#FBBF24' },
      { label: 'Fechadas', value: closedOperations, color: '#10B981' },
    ];

    let offset = 0;
    const circles = segments
      .map((seg) => {
        const dash = (seg.value / safeTotal) * circumference;
        const circle = `
          <circle
            cx="${size / 2}"
            cy="${size / 2}"
            r="${radius}"
            fill="transparent"
            stroke="${seg.color}"
            stroke-width="${stroke}"
            stroke-dasharray="${dash} ${circumference - dash}"
            stroke-dashoffset="${-offset}"
            stroke-linecap="round"
          />
        `;
        offset += dash;
        return circle;
      })
      .join('');

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Distribuicao por status">
        ${circles}
        <circle
          cx="${size / 2}"
          cy="${size / 2}"
          r="${radius - stroke * 0.6}"
          fill="#ffffff"
          stroke="#e5e7eb"
          stroke-width="1"
        />
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="18" font-weight="600" fill="#111827">
          ${escapeHtml(total)}
        </text>
      </svg>
    `;

    const legend = segments
      .map(
        (seg) => `
          <div class="legend-item">
            <span class="legend-dot" style="background:${seg.color}"></span>
            <span>${escapeHtml(seg.label)}</span>
            <strong>${escapeHtml(seg.value)}</strong>
          </div>
        `
      )
      .join('');

    return `
      <div class="chart-row">
        <div class="chart">${svg}</div>
        <div class="legend">${legend}</div>
      </div>
    `;
  };

  const buildTrendChartHtml = () => {
    if (!monthlyTrend.length) {
      return `<div class="empty">Sem dados</div>`;
    }

    const width = 720;
    const height = 300;
    const padding = 50;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;
    const maxValue = Math.max(
      ...monthlyTrend.map((p) => Math.max(p.operations, p.containers)),
      1
    );
    const steps = Math.max(monthlyTrend.length - 1, 1);
    const getX = (idx: number) => padding + (idx / steps) * plotWidth;
    const getY = (value: number) => padding + plotHeight - (value / maxValue) * plotHeight;

    const buildPath = (selector: (p: TrendPoint) => number) =>
      monthlyTrend
        .map((point, idx) => {
          const x = getX(idx);
          const y = getY(selector(point));
          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

    const operationsColor = '#FBBF24';
    const containersColor = '#14B8A6';
    const operationsPath = buildPath((p) => p.operations);
    const containersPath = buildPath((p) => p.containers);

    const pointsSvg = monthlyTrend
      .map((point, idx) => {
        const x = getX(idx);
        const yOps = getY(point.operations);
        const yCont = getY(point.containers);
        return `
          <g>
            <circle cx="${x}" cy="${yOps}" r="4" fill="${operationsColor}" />
            <circle cx="${x}" cy="${yCont}" r="4" fill="${containersColor}" />
            <text x="${x}" y="${height - padding + 18}" text-anchor="middle" font-size="10" fill="#6b7280">
              ${escapeHtml(point.label)}
            </text>
          </g>
        `;
      })
      .join('');

    const gridLines = [0.25, 0.5, 0.75].map((ratio) => {
      const y = padding + plotHeight - plotHeight * ratio;
      return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e5e7eb" stroke-width="1" />`;
    });

    const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendencia">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#d1d5db" stroke-width="1" />
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#d1d5db" stroke-width="1" />
        ${gridLines.join('')}
        <path d="${operationsPath}" fill="none" stroke="${operationsColor}" stroke-width="2.5" stroke-linecap="round" />
        <path d="${containersPath}" fill="none" stroke="${containersColor}" stroke-width="2.5" stroke-linecap="round" />
        ${pointsSvg}
      </svg>
    `;

    return `
      <div class="chart">
        ${svg}
        <div class="chart-legend">
          <span><i style="background:${operationsColor}"></i> Operacoes</span>
          <span><i style="background:${containersColor}"></i> Containers</span>
        </div>
      </div>
    `;
  };

  const exportDashboardPdf = () => {
    if (!metrics) {
      window.alert('Carregue o dashboard antes de exportar.');
      return;
    }

    const generatedAt = new Date().toLocaleString();
    const docTitle = `Dashboard ${trendSemesterLabel} ${trendYear}`;

    const summaryRows = [
      ['Operações registradas', totalOperations],
      ['Operações abertas', openOperations],
      ['Operações fechadas', closedOperations],
      ['Containers totais', totalContainers],
      ['Media por operação', avgContainers],
      ['Taxa de conclusao', `${completionRate}%`],
    ];

    const summaryRowsHtml = summaryRows
      .map(
        ([label, value]) => `
          <tr>
            <td>${escapeHtml(label)}</td>
            <td style="text-align:right">${escapeHtml(value)}</td>
          </tr>
        `
      )
      .join('');

    const statusRowsHtml = `
      <tr>
        <td>Abertas</td>
        <td style="text-align:center">${escapeHtml(openOperations)}</td>
      </tr>
      <tr>
        <td>Fechadas</td>
        <td style="text-align:center">${escapeHtml(closedOperations)}</td>
      </tr>
    `;

    const trendRowsHtml = monthlyTrend.length
      ? monthlyTrend
          .map(
            (point) => `
              <tr>
                <td>${escapeHtml(point.label)}</td>
                <td style="text-align:center">${escapeHtml(point.operations)}</td>
                <td style="text-align:center">${escapeHtml(point.containers)}</td>
              </tr>
            `
          )
          .join('')
      : `
        <tr>
          <td colspan="3" style="text-align:center">Sem dados</td>
        </tr>
      `;

    const recentRowsHtml = recentOperations.length
      ? recentOperations
          .map(
            (op) => `
              <tr>
                <td>${escapeHtml(op.ctv || op.id)}</td>
                <td>${escapeHtml(op.reservation || '-')}</td>
                <td>${escapeHtml(op.status)}</td>
                <td>${escapeHtml(formatDate(op.createdAt))}</td>
                <td style="text-align:center">${escapeHtml(op.containerCount)}</td>
              </tr>
            `
          )
          .join('')
      : `
        <tr>
          <td colspan="5" style="text-align:center">Sem dados</td>
        </tr>
      `;

    const statusChartHtml = buildStatusChartHtml();
    const trendChartHtml = buildTrendChartHtml();

    const html = `
      <html>
        <head>
          <title>${escapeHtml(docTitle)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            .header { display: flex; align-items: center; justify-content: space-between; margin: 0 0 8px; }
            h2 { margin: 0; display: flex; align-items: center; gap: 8px; }
            h3 { margin: 16px 0 6px; font-size: 14px; color: #111827; }
            h4 { margin: 12px 0 6px; font-size: 12px; color: #111827; font-weight: 600; }
            p { margin: 0 0 12px; font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
            th { background: #f3f4f6; text-align: left; text-transform: uppercase; letter-spacing: 0.03em; font-size: 11px; }
            .chart-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
            .chart { display: inline-flex; flex-direction: column; gap: 8px; }
            .legend { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #111827; }
            .legend-item { display: flex; align-items: center; gap: 6px; }
            .legend-item strong { margin-left: 4px; font-weight: 600; }
            .legend-dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
            .chart-legend { display: flex; gap: 12px; font-size: 11px; color: #6b7280; align-items: center; }
            .chart-legend i { width: 10px; height: 10px; display: inline-block; border-radius: 3px; margin-right: 6px; }
            .empty { font-size: 12px; color: #6b7280; padding: 8px 0; }
            .page-break { page-break-before: always; break-before: page; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${escapeHtml(docTitle)}</h2>
            <img src="${LOGO_DATA_URI}" alt="logo" style="height:50px; width:auto;" />
          </div>
          <p>Gerado em ${escapeHtml(generatedAt)}</p>

          <h3>Resumo</h3>
          <table>
            <thead>
              <tr>
                <th>Indicador</th>
                <th style="text-align:right">Valor</th>
              </tr>
            </thead>
            <tbody>${summaryRowsHtml}</tbody>
          </table>

          <h3>Distribuição por status</h3>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th style="text-align:center">Quantidade</th>
              </tr>
            </thead>
            <tbody>${statusRowsHtml}</tbody>
          </table>

          <h3>Tendencia ${escapeHtml(trendSemesterLabel)} ${escapeHtml(trendYear)}</h3>
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th style="text-align:center">Operações</th>
                <th style="text-align:center">Containers</th>
              </tr>
            </thead>
            <tbody>${trendRowsHtml}</tbody>
          </table>

          <h3>Operações recentes</h3>
          <table>
            <thead>
              <tr>
                <th>CTV/ID</th>
                <th>Reserva</th>
                <th>Status</th>
                <th>Data</th>
                <th style="text-align:center">Containers</th>
              </tr>
            </thead>
            <tbody>${recentRowsHtml}</tbody>
          </table>

          <div class="page-break">
            <h3>Gráficos</h3>
            <h4>Tendência (operações x containers)</h4>
            ${trendChartHtml}
            <h4>Acompanhamento por status</h4>
            ${statusChartHtml}
          </div>
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

  const timelineText = useCallback(
    (op: RecentOperation) => {
      const createdTime = op.createdAt ? new Date(op.createdAt).getTime() : NaN;
      if (!Number.isNaN(createdTime)) {
        return `Criada em ${formatDate(op.createdAt)}`;
      }
      return 'Data indisponível';
    },
    []
  );

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
              <p className="text-sm text-[var(--muted)]">
                Visão geral das operações, containers e terminais.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              <button
                type="button"
                onClick={exportDashboardCsv}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors disabled:opacity-50"
                disabled={!canExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </button>
              <button
                type="button"
                onClick={exportDashboardPdf}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors disabled:opacity-50"
                disabled={!canExport}
              >
                <FileText className="w-4 h-4 mr-2" />
                Exportar PDF
              </button>
              <button
                type="button"
                onClick={() => navigate('/operations')}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-semibold hover:opacity-90 transition-colors"
              >
                Ver operações
              </button>
              <div
                onClick={() => changePage('perfil')}
                className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors"
              >
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name
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
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold">Não foi possível carregar o dashboard</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={fetchData}
                className="px-3 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-100 text-sm font-medium"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          {isLoading ? (
            <>
              {skeletonCards}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm xl:col-span-2">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-32 bg-[var(--hover)] rounded" />
                    <div className="h-48 bg-[var(--hover)] rounded" />
                  </div>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-24 bg-[var(--hover)] rounded" />
                    <div className="h-48 bg-[var(--hover)] rounded" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  title="Operações registradas"
                  value={totalOperations}
                  helper="Total de operações registradas"
                  icon={<Activity className="w-5 h-5 text-[var(--accent-green)]" />}
                  accent="bg-[rgba(23,191,160,0.12)] text-[var(--accent-green)] border border-[rgba(23,191,160,0.3)]"
                />
                <StatCard
                  title="Operações abertas"
                  value={openOperations}
                  helper="Em andamento"
                  icon={<Clock3 className="w-5 h-5 text-[var(--accent-green)]" />}
                  accent="bg-[rgba(23,191,160,0.12)] text-[var(--accent-green)] border border-[rgba(23,191,160,0.3)]"
                />
                <StatCard
                  title="Operações fechadas"
                  value={closedOperations}
                  helper={`Taxa de conclusão: ${completionRate}%`}
                  icon={<CheckCircle2 className="w-5 h-5 text-[var(--accent-green)]" />}
                  accent="bg-[rgba(23,191,160,0.12)] text-[var(--accent-green)] border border-[rgba(23,191,160,0.3)]"
                />
                <StatCard
                  title="Containers totais"
                  value={totalContainers}
                  helper={`Média por operação: ${avgContainers}`}
                  icon={<Package className="w-5 h-5 text-[var(--accent-green)]" />}
                  accent="bg-[rgba(23,191,160,0.12)] text-[var(--accent-green)] border border-[rgba(23,191,160,0.3)]"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm xl:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-[var(--muted)]">Volume (operações x containers)</p>
                      <p className="text-lg font-semibold text-[var(--text)]">Tendência</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex bg-[var(--hover)] rounded-full p-1 text-xs text-[var(--text)]">
                        {[
                          { id: 'H1', label: '1o Sem' },
                          { id: 'H2', label: '2o Sem' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTrendSemester(opt.id as TrendSemester)}
                            className={`px-3 py-1 rounded-full transition-colors ${trendSemester === opt.id ? 'bg-[var(--surface)] shadow-sm text-[var(--text)]' : 'text-[var(--muted)]'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <TrendingUp className="w-5 h-5 text-[var(--accent-green)]" />
                    </div>
                  </div>
                  <MultiLineChart data={monthlyTrend} />
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-[var(--muted)]">Distribuição por status</p>
                      <p className="text-lg font-semibold text-[var(--text)]">Acompanhamento das operações</p>
                    </div>
                    <Ship className="w-5 h-5 text-[var(--accent-green)]" />
                  </div>
                  <div className="flex p-10">
                    <DonutChart segments={statusSegments} size={240} />
                  </div>
                </div>
              </div>

              <div className=" gap-4">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm xl:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm text-[var(--muted)]">Operações recentes</p>
                      <p className="text-lg font-semibold text-[var(--text)]">Últimas movimentações</p>
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--border)]">
                    {recentOperations.length === 0 ? (
                      <div className="py-6 text-sm text-[var(--muted)]">Sem dados para exibir.</div>
                    ) : (
                      recentOperations.map((op) => (
                        <div key={op.id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--hover)] px-2 py-1 text-xs text-[var(--muted)]">
                                  {op.ctv || op.id}
                                </span>
                              </p>
                              <p className="text-xs text-[var(--muted)]">
                                {op.reservation ? `Reserva: ${op.reservation}` : 'Sem reserva'} • {timelineText(op)}
                              </p>
                            </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                op.status === 'Fechada'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {op.status}
                            </span>
                            <span className="text-sm text-[var(--text)] bg-[var(--hover)] px-3 py-1 rounded-full">
                              {op.containerCount} cont.
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;









