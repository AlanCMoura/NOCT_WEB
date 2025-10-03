import React from 'react';
import SkeletonPlaceholder from './SkeletonPlaceholder';

type PageLoadingVariant = 'grid' | 'table' | 'form' | 'center' | 'section';

interface PageLoadingStateProps {
  variant?: PageLoadingVariant;
  sections?: number;
  rows?: number;
  withHeader?: boolean;
  className?: string;
}

const PageLoadingState: React.FC<PageLoadingStateProps> = ({
  variant = 'grid',
  sections = 3,
  rows = 5,
  withHeader = true,
  className = ''
}) => {
  const containerClass = ['animate-pulse', className].filter(Boolean).join(' ');

  if (variant === 'center') {
    return (
      <div className={containerClass}>
        <div className="h-full flex items-center justify-center">
          <div className="w-full max-w-3xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-8 space-y-6 text-center">
            <SkeletonPlaceholder className="h-16 w-16 mx-auto rounded-2xl" />
            <SkeletonPlaceholder className="h-6 w-1/2 mx-auto" />
            <SkeletonPlaceholder className="h-4 w-3/4 mx-auto" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SkeletonPlaceholder className="h-10" />
              <SkeletonPlaceholder className="h-10" />
            </div>
            <SkeletonPlaceholder className="h-4 w-1/3 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={containerClass}>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm p-6 space-y-6">
          {withHeader && (
            <div className="space-y-2">
              <SkeletonPlaceholder className="h-6 w-40" />
              <SkeletonPlaceholder className="h-4 w-64" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: sections * 3 }).map((_, idx) => (
              <SkeletonPlaceholder key={idx} className="h-12" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: Math.max(1, sections) }).map((_, idx) => (
              <SkeletonPlaceholder key={idx} className="h-32" />
            ))}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <SkeletonPlaceholder className="h-10 w-24" />
            <SkeletonPlaceholder className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={containerClass}>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <SkeletonPlaceholder className="h-6 w-40" />
            <div className="flex gap-3 w-full sm:w-auto">
              <SkeletonPlaceholder className="h-10 flex-1 sm:w-64" />
              <SkeletonPlaceholder className="h-10 w-28" />
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: rows }).map((_, idx) => (
              <div key={idx} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <SkeletonPlaceholder className="h-4 w-1/3" />
                <SkeletonPlaceholder className="h-4 w-24" />
                <SkeletonPlaceholder className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <SkeletonPlaceholder className="h-4 w-32" />
            <div className="flex gap-2">
              <SkeletonPlaceholder className="h-8 w-20" />
              <SkeletonPlaceholder className="h-8 w-20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'section') {
    return (
      <div className={containerClass}>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm p-6 space-y-4">
          {Array.from({ length: Math.max(3, sections) }).map((_, idx) => (
            <SkeletonPlaceholder key={idx} className="h-4 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      {withHeader && (
        <div className="space-y-2 mb-4">
          <SkeletonPlaceholder className="h-6 w-40" />
          <SkeletonPlaceholder className="h-4 w-64" />
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: sections }).map((_, idx) => (
          <div key={idx} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
            <SkeletonPlaceholder className="h-4 w-1/2" />
            <SkeletonPlaceholder className="h-6 w-1/3" />
            <SkeletonPlaceholder className="h-20 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageLoadingState;
