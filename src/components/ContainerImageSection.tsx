import React, { useEffect, useState } from 'react';

import LazyImage from './LazyImage';

export interface ImageItem {
  file?: File;
  url: string;
  localId?: string | number;
  id?: number;
}

interface Props {
  title: string;
  images: ImageItem[];
  isEditing: boolean;
  startIndex: number;
  imagesPerView: number;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onSelectImages: () => void;
  onRemoveImage: (index: number) => void;
  onOpenModal: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  actions?: React.ReactNode;
  footerActions?: React.ReactNode;
  onReorderImage?: (fromIdx: number, toIdx: number) => void;
  isRemovingMap?: Record<number, boolean>;
}

const Spinner: React.FC = () => (
  <svg className="w-6 h-6 text-[var(--muted)] animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const ContainerImageSection: React.FC<Props> = ({
  title,
  images,
  isEditing,
  startIndex,
  imagesPerView,
  onDrop,
  onSelectImages,
  onRemoveImage,
  onOpenModal,
  onPrev,
  onNext,
  actions,
  footerActions,
  onReorderImage,
  isRemovingMap,
}) => {
  const visibleImages = images.slice(startIndex, startIndex + imagesPerView);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + imagesPerView < images.length;
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});

  const imageKey = (img: ImageItem, idx: number): string => {
    const base = img.localId ?? `${img.url || 'img'}-${idx}`;
    const fileKey = img.file ? `${img.file.name}-${img.file.lastModified}` : '';
    return `${base}::${fileKey}`;
  };

  useEffect(() => {
    // Mantem status carregado das imagens que ainda existem para evitar flicker/spinner infinito
    setLoadedMap((prev) => {
      const next: Record<string, boolean> = {};
      images.forEach((img, idx) => {
        const key = imageKey(img, idx);
        if (prev[key]) next[key] = true;
      });
      return next;
    });
  }, [images]);

  const markLoaded = (key: string) => {
    setLoadedMap((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] mb-6">
      <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-normal text-[var(--muted)]">
            {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
          </span>
          {actions}
        </div>
      </div>

      <div className="p-6">
        {isEditing ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-[var(--border)] rounded-lg p-4 text-center min-h-48 relative"
          >
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-[var(--muted)] h-32">
                <svg
                  className="w-12 h-12 text-[var(--muted)] mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm font-medium mb-2">Faca upload das imagens</p>
                <p className="text-xs text-[var(--muted)] mb-4">
                  Arraste e solte imagens aqui ou clique para selecionar
                </p>
                <button
                  type="button"
                  onClick={onSelectImages}
                  className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                >
                  Selecionar Imagens
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {images.map((img, idx) => {
                    const key = imageKey(img, idx);
                    const isLoaded = !!loadedMap[key];
                    return (
                      <div
                        key={key}
                        className="relative group"
                        draggable={isEditing}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('fromIdx', idx.toString());
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const hasFiles = e.dataTransfer?.files && e.dataTransfer.files.length > 0;
                          if (hasFiles) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const fromIdx = Number(e.dataTransfer.getData('fromIdx'));
                          if (fromIdx === idx) return;
                          if (typeof onReorderImage === 'function') {
                            onReorderImage(fromIdx, idx);
                          }
                        }}
                      >
                        <div className="relative">
                          <LazyImage
                            src={img.url}
                            alt={`${title} - Imagem ${idx + 1}`}
                            className="w-full h-48 max-h-72 max-w-full object-contain rounded-lg border border-[var(--border)] bg-[var(--hover)] cursor-pointer transition-opacity duration-300"
                            width={400}
                            height={300}
                            onClick={() => onOpenModal(idx)}
                            onLoad={() => markLoaded(key)}
                            style={{ opacity: isLoaded ? 1 : 0.2 }}
                          />
                          {!isLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]/40 rounded-lg">
                              <Spinner />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-60"
                          disabled={typeof img.id === 'number' && isRemovingMap?.[img.id]}
                        >
                          {typeof img.id === 'number' && isRemovingMap?.[img.id] ? (
                            <Spinner />
                          ) : (
                            'x'
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={onSelectImages}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                >
                  + Adicionar Mais Imagens
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative overflow-hidden">
            {visibleImages.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[var(--muted)] text-sm">
                Nenhuma imagem cadastrada.
              </div>
            ) : (
              <div className="rounded-lg border-[var(--border)]">
                <div className="overflow-hidden">
                  <div
                    className="grid gap-3 transition-all duration-500"
                    style={{ gridTemplateColumns: `repeat(${Math.max(1, imagesPerView)}, minmax(0, 1fr))` }}
                  >
                    {visibleImages.map((img, idx) => {
                      const originalIndex = startIndex + idx;
                      const key = imageKey(img, originalIndex);
                      const isLoaded = !!loadedMap[key];
                      return (
                        <div
                          key={key}
                          className="relative group transform transition-all duration-300 ease-out cursor-pointer"
                          style={{
                            animationDelay: `${idx * 50}ms`,
                            animation: `fadeInSlide 0.4s ease-out forwards`,
                          }}
                          onClick={() => onOpenModal(originalIndex)}
                        >
                          <div className="relative">
                            <LazyImage
                              src={img.url}
                              alt={`${title} - Imagem ${originalIndex + 1}`}
                              className="w-full h-64 max-h-80 max-w-full object-contain cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg rounded bg-[var(--hover)]"
                              width={400}
                              height={300}
                              onLoad={() => markLoaded(key)}
                              style={{ opacity: isLoaded ? 1 : 0.1 }}
                            />
                            {!isLoaded && (
                              <div className="absolute inset-0 flex items-center justify-center bg-[var(--surface)]/40 rounded">
                                <Spinner />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center rounded">
                            <div className="bg-[var(--surface)] rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                              <svg className="w-5 h-5 text-[var(--text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {images.length > imagesPerView && visibleImages.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!canGoPrev}
                  className={`absolute top-1/2 left-2 -translate-y-1/2 z-10 bg-[var(--surface)] ring-1 ring-[var(--border)] rounded-full p-2 shadow-lg transition-all duration-300 ${
                    canGoPrev
                      ? 'hover:bg-[var(--hover)] hover:scale-110 hover:shadow-xl text-[var(--text)] transform hover:translate-x-1'
                      : 'text-[var(--muted)] cursor-not-allowed opacity-50'
                  }`}
                >
                  <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canGoNext}
                  className={`absolute top-1/2 right-2 -translate-y-1/2 z-10 bg-[var(--surface)] ring-1 ring-[var(--border)] rounded-full p-2 shadow-lg transition-all duration-300 ${
                    canGoNext
                      ? 'hover:bg-[var(--hover)] hover:scale-110 hover:shadow-xl text-[var(--text)] transform hover:-translate-x-1'
                      : 'text-[var(--muted)] cursor-not-allowed opacity-50'
                  }`}
                >
                  <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {footerActions && (
        <div className="px-6 py-4 border-[var(--border)] flex justify-end gap-2">
          {footerActions}
        </div>
      )}
    </div>
  );
};

export default ContainerImageSection;
