import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCcw,
  Ship,
  TrendingUp,
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { listOperations, type ApiOperation } from '../services/operations';
import { getContainersByOperation } from '../services/containers';

type OperationStatus = 'Aberta' | 'Fechada';
type TrendSemester = 'H1' | 'H2';

interface OperationResume {
  id: string; // usado para chaves/rotas (fallback para exibição)
  backendId?: string | number; // id real para chamadas de API
  shipName: string;
  status: OperationStatus;
  createdAt: string;
  containerCount?: number;
  terminal?: string;
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

const parseDateValue = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'number') return new Date(value).toISOString();
  if (typeof value === 'string') return value;
  return '';
};

const normalizeStatus = (value: unknown): OperationStatus => {
  const text = String(value ?? '').toUpperCase();
  if (text === 'COMPLETED' || text.includes('FINAL') || text.includes('FECH')) return 'Fechada';
  return 'Aberta';
};

const mapOperation = (op: ApiOperation): OperationResume => {
  const backendId = op.id ?? op.code ?? op.bookingCode ?? op.booking ?? op.reservation ?? op.reserva;

  const displayId =
    op.ctv ??
    op.amv ??
    op.code ??
    op.booking ??
    op.bookingCode ??
    op.reserva ??
    op.reservation ??
    backendId ??
    `op-${Date.now()}`;

  const createdAt =
    parseDateValue(op.createdAt) ||
    parseDateValue(op.updatedAt) ||
    parseDateValue(op.arrivalDate) ||
    parseDateValue(op.deadline) ||
    parseDateValue(op.deadlineDraft) ||
    parseDateValue(op.loadDeadline) ||
    '';

  const containerCount =
    op.containerCount ??
    (Array.isArray(op.containers) ? op.containers.length : undefined) ??
    (Array.isArray(op.containerList) ? op.containerList.length : undefined);

  return {
    id: String(displayId),
    backendId,
    shipName: String(op.shipName ?? op.ship ?? op.vesselName ?? op.vessel ?? op.navio ?? '-'),
    status: normalizeStatus(op.status),
    createdAt,
    containerCount,
    terminal: op.terminal ? String(op.terminal) : undefined,
    reservation: op.reserva
      ? String(op.reserva)
      : op.reservation
        ? String(op.reservation)
        : op.booking
          ? String(op.booking)
          : op.bookingCode
            ? String(op.bookingCode)
            : undefined,
    ctv: op.ctv ? String(op.ctv) : undefined,
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

  const operationsColor = 'var(--accent-blue)';
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
            Operacoes
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

const TerminalBars: React.FC<{ data: { label: string; value: number }[] }> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-[var(--text)]">{item.label}</span>
            <span className="text-[var(--muted)]">{item.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--hover)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-blue)] to-[var(--primary)]"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operations, setOperations] = useState<OperationResume[]>([]);
  const [totalOperations, setTotalOperations] = useState(0);

  const PAGE_SIZE = 100;
  const MAX_PAGES = 10; // evita loop infinito caso a API retorne paginação inesperada

  const ensureContainerCounts = useCallback(async (ops: OperationResume[]): Promise<OperationResume[]> => {
    const missing = ops.filter((op) => (op.containerCount === undefined || op.containerCount === null) && op.backendId);
    if (!missing.length) return ops;

    const fetched = new Map<string | number, number>();
    const CHUNK = 4; // limita requisições simultâneas

    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map(async (op) => {
          try {
            const pageData = await getContainersByOperation(op.backendId as string | number, { page: 0, size: 1 });
            const count =
              pageData?.totalElements ??
              (Array.isArray(pageData?.content) ? pageData.content.length : 0) ??
              0;
            fetched.set(op.backendId as string | number, count);
          } catch (error) {
            console.warn(`Não foi possível obter contagem de containers para operação ${op.backendId}`, error);
          }
        })
      );
    }

    return ops.map((op) => {
      if (op.containerCount !== undefined && op.containerCount !== null) return op;
      if (op.backendId === undefined || op.backendId === null) return op;
      const count = fetched.get(op.backendId);
      if (count !== undefined) {
        return { ...op, containerCount: count };
      }
      return { ...op, containerCount: 0 };
    });
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let page = 0;
      let totalElements = 0;
      let totalPages = 1;
      const aggregated: ApiOperation[] = [];

      while (page < totalPages && page < MAX_PAGES) {
        const data = await listOperations({
          page,
          size: PAGE_SIZE,
          sortBy: 'createdAt',
          sortDirection: 'DESC',
        });

        totalElements = data?.totalElements ?? totalElements;
        totalPages = data?.totalPages ?? totalPages;

        if (Array.isArray(data?.content) && data.content.length) {
          aggregated.push(...data.content);
        }

        if (!data?.content?.length) break;
        page += 1;
      }

      const mapped = aggregated.map(mapOperation);
      const withCounts = await ensureContainerCounts(mapped);

      setOperations(withCounts);
      setTotalOperations(totalElements || withCounts.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Não foi possível carregar os dados.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [ensureContainerCounts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusSegments = useMemo<ChartSegment[]>(() => {
    const open = operations.filter((op) => op.status === 'Aberta').length;
    const closed = operations.filter((op) => op.status === 'Fechada').length;
    return [
      { label: 'Abertas', value: open, color: 'var(--accent-blue)' },
      { label: 'Fechadas', value: closed, color: 'var(--accent-green)' },
    ];
  }, [operations]);

  const totalContainers = useMemo(
    () =>
      operations.reduce((sum, op) => {
        const value = typeof op.containerCount === 'number' ? op.containerCount : 0;
        return sum + value;
      }, 0),
    [operations]
  );

  const currentMonth = new Date().getMonth();
  const initialSemester: TrendSemester = currentMonth < 6 ? 'H1' : 'H2';
  const [trendSemester, setTrendSemester] = useState<TrendSemester>(initialSemester);

  const monthlyTrend = useMemo<TrendPoint[]>(() => {
    const now = new Date();
    const years = operations
      .map((op) => {
        const d = new Date(op.createdAt);
        return Number.isNaN(d.getTime()) ? null : d.getFullYear();
      })
      .filter((y): y is number => y !== null);
    const currentYear = now.getFullYear();
    const targetYear = years.length ? Math.max(...years) : currentYear;

    const start = trendSemester === 'H1' ? 0 : 6;
    const range = Array.from({ length: 6 }, (_, idx) => {
      const m = start + idx;
      const label = new Date(targetYear, m, 1)
        .toLocaleString('pt-BR', { month: 'short' })
        .replace('.', '')
        .toUpperCase();
      return { month: m, year: targetYear, label };
    });

    return range.map(({ month, year, label }) => {
      let operationsCount = 0;
      let containersCount = 0;

      operations.forEach((op) => {
        const date = new Date(op.createdAt);
        if (date.getFullYear() === year && date.getMonth() === month) {
          operationsCount += 1;
          containersCount += typeof op.containerCount === 'number' ? op.containerCount : 0;
        }
      });

      return { label, operations: operationsCount, containers: containersCount };
    });
  }, [operations, trendSemester]);

  const recentOperations = useMemo(() => operations.slice(0, 6), [operations]);

  const topTerminals = useMemo(() => {
    const counts: Record<string, number> = {};
    operations.forEach((op) => {
      const label = op.terminal?.trim() || 'Sem terminal';
      counts[label] = (counts[label] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, value]) => ({ label, value }));
  }, [operations]);

  const avgContainers = useMemo(() => {
    if (!operations.length) return 0;
    return +(totalContainers / operations.length).toFixed(1);
  }, [operations.length, totalContainers]);

  const completionRate = useMemo(() => {
    if (!totalOperations) return 0;
    const closed = statusSegments.find((seg) => seg.label === 'Fechadas')?.value ?? 0;
    return Math.round((closed / totalOperations) * 100);
  }, [statusSegments, totalOperations]);

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
                  helper="Total retornado pelo backend"
                  icon={<Activity className="w-5 h-5 text-[var(--accent-green)]" />}
                  accent="bg-[rgba(23,191,160,0.12)] text-[var(--accent-green)] border border-[rgba(23,191,160,0.3)]"
                />
                <StatCard
                  title="Operações abertas"
                  value={statusSegments.find((s) => s.label === 'Abertas')?.value ?? 0}
                  helper="Em andamento"
                  icon={<Clock3 className="w-5 h-5 text-[var(--accent-green)]" />}
                  accent="bg-[rgba(23,191,160,0.12)] text-[var(--accent-green)] border border-[rgba(23,191,160,0.3)]"
                />
                <StatCard
                  title="Operações fechadas"
                  value={statusSegments.find((s) => s.label === 'Fechadas')?.value ?? 0}
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
                      <p className="text-sm text-[var(--muted)]">Volume (operacoes x containers)</p>
                      <p className="text-lg font-semibold text-[var(--text)]">Tendencia</p>
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

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
                              {op.shipName}
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {op.reservation ? `Reserva: ${op.reservation}` : 'Sem reserva'} • {formatDate(op.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                op.status === 'Fechada'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
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

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm text-[var(--muted)]">Terminais frequentes</p>
                      <p className="text-lg font-semibold text-[var(--text)]">Distribuição</p>
                    </div>
                    <MapPin className="w-5 h-5 text-[var(--accent-green)]" />
                  </div>
                  {topTerminals.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">Sem terminais informados.</p>
                  ) : (
                    <TerminalBars data={topTerminals} />
                  )}
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









