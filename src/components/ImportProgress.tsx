import React from 'react';

interface ImportProgressProps {
  phase: string;
  processed: number;
  total: number;
  created: number;
  errors: number;
  active?: boolean;
}

const ImportProgress: React.FC<ImportProgressProps> = ({
  phase,
  processed,
  total,
  created,
  errors,
  active = false,
}) => {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : active ? 8 : 0;
  const current = total > 0 ? `${processed}/${total}` : active ? 'Preparando...' : '0/0';

  return (
    <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--hover)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--text)]">{phase}</p>
        <span className="text-xs text-[var(--muted)]">{current}</span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--surface)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label="Progresso da importação"
      >
        <div
          className="h-full rounded-full bg-[var(--primary)] transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <span>{percentage}% concluido</span>
        <span>Criados: {created}</span>
        <span>Erros: {errors}</span>
      </div>
    </div>
  );
};

export default ImportProgress;
