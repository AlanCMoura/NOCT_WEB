import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import ContainerImageSection, { ImageItem as SectionImageItem } from '../components/ContainerImageSection';

interface User {
  name: string;
  role: string;
}

const initialSacaria: SectionImageItem[] = [
  { url: 'https://via.placeholder.com/400x300/e3f2fd/1976d2?text=Sacaria+1' },
  { url: 'https://via.placeholder.com/400x300/e8f5e9/4caf50?text=Sacaria+2' },
  { url: 'https://via.placeholder.com/400x300/fff3e0/ff9800?text=Sacaria+3' },
  { url: 'https://via.placeholder.com/400x300/fce4ec/e91e63?text=Sacaria+4' },
  { url: 'https://via.placeholder.com/400x300/f3e5f5/9c27b0?text=Sacaria+5' },
  { url: 'https://via.placeholder.com/400x300/e0f2f1/00695c?text=Sacaria+6' },
  { url: 'https://via.placeholder.com/400x300/fff8e1/f57f17?text=Sacaria+7' },
  { url: 'https://via.placeholder.com/400x300/ffebee/c62828?text=Sacaria+8' }
];

const IMAGES_PER_VIEW = 3;

const Sacaria: React.FC = () => {
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const { changePage } = useSidebar();

  const user: User = { name: 'Carlos Oliveira', role: 'Supervisor' };

  const [images, setImages] = useState<SectionImageItem[]>(initialSacaria);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const imagesBackupRef = useRef<SectionImageItem[]>(initialSacaria);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [marcacao, setMarcacao] = useState<string>('');
  const marcacaoBackupRef = useRef<string>('');

  const [modal, setModal] = useState<{ index: number } | null>(null);

  const next = () => {
    const maxIndex = Math.max(0, images.length - IMAGES_PER_VIEW);
    setStartIndex((prev) => Math.min(prev + IMAGES_PER_VIEW, maxIndex));
  };

  const prev = () => {
    setStartIndex((prev) => Math.max(0, prev - IMAGES_PER_VIEW));
  };

  const openModal = (index: number) => setModal({ index });
  const closeModal = () => setModal(null);
  const prevInModal = () => setModal((m) => (m ? { index: Math.max(0, m.index - 1) } : m));
  const nextInModal = () => setModal((m) => (m ? { index: Math.min(images.length - 1, m.index + 1) } : m));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) setImages((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  const handleSelectImages = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing || !e.target.files) return;
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) setImages((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    if (!isEditing) return;
    setImages((prev) => {
      const list = [...prev];
      const [removed] = list.splice(index, 1);
      if (removed && (removed as any).file) URL.revokeObjectURL(removed.url);
      return list;
    });
  };

  const saveEdit = () => {
    alert('Sacaria atualizada!');
    setIsEditing(false);
  };

  const startEdit = () => {
    imagesBackupRef.current = images;
    marcacaoBackupRef.current = marcacao;
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setImages(imagesBackupRef.current);
    setMarcacao(marcacaoBackupRef.current);
    setIsEditing(false);
  };

  const deleteSacaria = () => {
    if (window.confirm('Tem certeza que deseja excluir todas as imagens da sacaria?')) {
      images.forEach((img) => {
        if ((img as any).file) URL.revokeObjectURL(img.url);
      });
      setImages([]);
    alert('Sacaria excluída!');
    }
  };

  

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Sacaria • Operação {decodedOperationId}</h1>
              <p className="text-sm text-[var(--muted)]">Carrossel de imagens</p>
            </div>
            <div className="flex items-center gap-4">
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

          <ContainerImageSection
            title="Sacaria"
            images={images}
            isEditing={isEditing}
            startIndex={startIndex}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={handleDrop}
            onSelectImages={handleSelectImages}
            onRemoveImage={handleRemoveImage}
            onOpenModal={(idx) => openModal(idx)}
            onPrev={prev}
            onNext={next}
            footerActions={
              <>
                <button
                  type="button"
                  onClick={startEdit}
                  className={`px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors ${
                    isEditing ? 'hidden' : ''
                  }`}
                >
                  Editar Sacaria
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className={`px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors ${
                    isEditing ? '' : 'hidden'
                  }`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className={`px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors ${
                    isEditing ? '' : 'hidden'
                  }`}
                >
                  Salvar Sacaria
                </button>
                <button
                  type="button"
                  onClick={deleteSacaria}
                  className={`px-4 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 ${
                    isEditing ? 'hidden' : ''
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Sacaria
                </button>
              </>
            }
          />

          {/* input oculto para upload */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />

          {/* Campo de texto: Marcação da sacaria */}
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6">
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Marcação da sacaria</label>
              {isEditing ? (
                <textarea
                  value={marcacao}
                  onChange={(e) => setMarcacao(e.target.value)}
                  rows={3}
                  placeholder="Digite a marcação da sacaria..."
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="text-sm text-[var(--text)] whitespace-pre-line bg-[var(--hover)] border border-[var(--border)] rounded-lg p-3 min-h-[3.5rem]">
                  {marcacao || 'marca'}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* Modal de Imagem */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {images.length > 1 && modal.index > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevInModal();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <img
              src={images[modal.index]?.url}
              alt={`Sacaria - Imagem ${modal.index + 1}`}
              loading="lazy"
              decoding="async"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && modal.index < images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextInModal();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black/50 rounded-full p-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center bg-black/50 rounded-lg px-4 py-2">
              <p className="text-lg font-medium">Sacaria</p>
              <p className="text-sm opacity-75">{modal.index + 1} de {images.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sacaria;

