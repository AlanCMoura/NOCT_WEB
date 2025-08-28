import React from 'react';

export interface ImageItem {
  file?: File;
  url: string;
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
}

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
  footerActions
}) => {
  const visibleImages = images.slice(startIndex, startIndex + imagesPerView);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex + imagesPerView < images.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm font-normal text-gray-500">
            {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
          </span>
          {actions}
        </div>
      </div>

      <div className="p-6">
        {isEditing ? (
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center min-h-48"
          >
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-gray-500 h-32">
                <svg
                  className="w-12 h-12 text-gray-400 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium mb-2">Faça upload das imagens</p>
                <p className="text-xs text-gray-400 mb-4">
                  Arraste e solte imagens aqui ou clique para selecionar
                </p>
                <button
                  type="button"
                  onClick={onSelectImages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Selecionar Imagens
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.url}
                        alt={`${title} - Imagem ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => onRemoveImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={onSelectImages}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  + Adicionar Mais Imagens
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div className="overflow-hidden rounded-lg border-gray-200">
              <div className="flex gap-3 transition-all duration-500">
                {visibleImages.map((img, idx) => {
                  const originalIndex = startIndex + idx;
                  return (
                    <div
                      key={originalIndex}
                      className="relative group transform transition-all duration-300 ease-out flex-shrink-0"
                      style={{
                        width: 'calc(33.333% - 4px)',
                        animationDelay: `${idx * 50}ms`,
                        animation: `fadeInSlide 0.4s ease-out forwards`
                      }}
                    >
                      <img
                        src={img.url}
                        alt={`${title} - Imagem ${originalIndex + 1}`}
                        className="w-full h-64 object-cover cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:shadow-lg rounded opacity-0"
                        onClick={() => onOpenModal(originalIndex)}
                        onLoad={(e) => {
                          (e.target as HTMLImageElement).style.opacity = '1';
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center rounded">
                        <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {Array.from({ length: Math.max(0, 3 - visibleImages.length) }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="h-48 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center transition-all duration-300 opacity-50 hover:opacity-75 flex-shrink-0"
                    style={{ width: 'calc(33.333% - 4px)' }}
                  >
                    <svg className="w-8 h-8 text-gray-400 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {images.length > imagesPerView && (
              <>
                <button
                  type="button"
                  onClick={onPrev}
                  disabled={!canGoPrev}
                  className={`absolute top-1/3 mt-4 -left-4 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg transition-all duration-300 ${
                    canGoPrev
                      ? 'hover:bg-gray-50 hover:scale-110 hover:shadow-xl text-gray-700 transform hover:-translate-x-1'
                      : 'text-gray-300 cursor-not-allowed opacity-50'
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
                  className={`absolute top-1/3 mt-4 -right-4 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg transition-all duration-300 ${
                    canGoNext
                      ? 'hover:bg-gray-50 hover:scale-110 hover:shadow-xl text-gray-700 transform hover:translate-x-1'
                      : 'text-gray-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {images.length > imagesPerView && (
              <div className="flex justify-center mt-4 space-x-1 transition-all duration-300">
                <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 rounded-full px-3 py-1 transition-colors duration-200 hover:bg-gray-100">
                  <span className="transition-all duration-200">
                    {startIndex + 1} - {Math.min(startIndex + imagesPerView, images.length)} de {images.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {footerActions && (
        <div className="px-6 py-4 border-gray-100 flex justify-end gap-2">
          {footerActions}
        </div>
      )}
    </div>
  );
};

export default ContainerImageSection;
