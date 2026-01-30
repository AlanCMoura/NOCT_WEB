import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import ContainerImageSection, { ImageItem as SectionImageItem } from '../components/ContainerImageSection';
import { deleteSackImage, getSackImages, uploadSackImages, getOperationById } from '../services/operations';

type SackImageItem = SectionImageItem & { id?: string | number };

const IMAGES_PER_VIEW = 3;

const Sacaria: React.FC = () => {
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Supervisor' });

  const [images, setImages] = useState<SackImageItem[]>([]);
  const [startIndex, setStartIndex] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<(string | number)[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [modal, setModal] = useState<{ index: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [operationCtv, setOperationCtv] = useState<string>('');
  const [operationLabelLoading, setOperationLabelLoading] = useState<boolean>(true);
  const operationLabel = operationCtv || decodedOperationId;

  const mapImages = (list: any[]): SackImageItem[] =>
    list
      .map((img) => {
        const url = img?.url ?? img?.imageUrl ?? img?.signedUrl ?? '';
        if (!url) return null;
        return { id: img?.id, url, localId: img?.id ?? url } as SackImageItem;
      })
      .filter((x): x is SackImageItem => Boolean(x));

  const loadImages = useCallback(async () => {
    if (!operationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getSackImages(operationId);
      setImages(mapImages(data));
      setStartIndex(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nao foi possivel carregar a sacaria.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [operationId]);

  useEffect(() => {
    loadImages();
  }, [operationId, loadImages]);

  useEffect(() => {
    let active = true;
    const loadOperation = async () => {
      if (!operationId) {
        setOperationCtv('');
        setOperationLabelLoading(false);
        return;
      }
      setOperationLabelLoading(true);
      try {
        const op = await getOperationById(operationId);
        if (!active) return;
        const ctv = String(
          op.ctv ??
            op.amv ??
            op.code ??
            op.booking ??
            op.bookingCode ??
            op.reserva ??
            op.reservation ??
            operationId
        );
        setOperationCtv(ctv);
      } catch {
        if (active) setOperationCtv(operationId);
      } finally {
        if (active) setOperationLabelLoading(false);
      }
    };
    loadOperation();
    return () => {
      active = false;
    };
  }, [operationId]);

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

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const previews: SackImageItem[] = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    }));
    setImages((prev) => [...prev, ...previews]);
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleSelectImages = () => {
    if (!isEditing) return;
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing || !e.target.files) return;
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (!files.length) return;
    const previews: SackImageItem[] = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      localId: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    }));
    setImages((prev) => [...prev, ...previews]);
    setPendingFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = async (index: number) => {
    if (!isEditing) return;
    const target = images[index];
    if (!target) return;
    // se for apenas preview local, removemos das filas locais
    if (target.id === undefined || target.id === null) {
      setImages((prev) => prev.filter((_, i) => i !== index));
      setPendingFiles((prev) => prev.filter((file) => file !== target.file));
      return;
    }
    // marca para deleção e remove da visualização, envio ocorrerá ao salvar
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPendingDeletes((prev) => [...prev, target.id as string | number]);
  };

  const saveEdit = async () => {
    if (!operationId) return;
    if (!pendingFiles.length && !pendingDeletes.length) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // processa deleções pendentes primeiro
      for (const id of pendingDeletes) {
        await deleteSackImage(operationId, id);
      }
      if (pendingFiles.length) {
        await uploadSackImages(operationId, pendingFiles);
      }
      await loadImages();
      setPendingFiles([]);
      setPendingDeletes([]);
      setIsEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar imagens.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  const startEdit = () => setIsEditing(true);
  const cancelEdit = () => {
    setIsEditing(false);
    setPendingFiles([]);
    setPendingDeletes([]);
    loadImages();
  };

  const deleteSacaria = async () => {
    if (!operationId) return;
    if (!window.confirm('Tem certeza que deseja excluir todas as imagens da sacaria?')) return;
    setLoading(true);
    setError(null);
    try {
      for (const img of images) {
        if (img.id === undefined || img.id === null) continue;
        await deleteSackImage(operationId, img.id);
      }
      await loadImages();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir sacaria.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">
                Sacaria - Operação{' '}
                {operationLabelLoading ? (
                  <span className="inline-block w-28 h-6 bg-[var(--hover)] rounded animate-pulse align-middle"></span>
                ) : (
                  operationLabel
                )}
              </h1>
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

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

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
          isRemovingMap={{}}
          actions={
            <button
              type="button"
                onClick={() => openModal(0)}
                disabled={!images.length}
                className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs font-medium text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Ver em tela cheia
              </button>
            }
            onReorderImage={(fromIdx, toIdx) => {
              setImages((prev) => {
                if (
                  fromIdx === toIdx ||
                  fromIdx < 0 ||
                  toIdx < 0 ||
                  fromIdx >= prev.length ||
                  toIdx >= prev.length
                )
                  return prev;
                const arr = prev.slice();
                const item = arr[fromIdx];
                arr.splice(fromIdx, 1);
                arr.splice(toIdx, 0, item);
                return arr;
              });
            }}
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
                  disabled={loading}
                >
                  Salvar Sacaria
                </button>
                <button
                  type="button"
                  onClick={deleteSacaria}
                  className={`px-4 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 ${
                    isEditing ? 'hidden' : ''
                  }`}
                  disabled={loading || images.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Sacaria
                </button>
              </>
            }
          />

          {/* input oculto para upload */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />

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
              <p className="text-sm opacity-75">
                {modal.index + 1} de {images.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sacaria;
