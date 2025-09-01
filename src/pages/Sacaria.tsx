import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
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

  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Supervisor'
  };

  const [images] = useState<SectionImageItem[]>(initialSacaria);
  const [startIndex, setStartIndex] = useState<number>(0);

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

  const handlePageChange = (pageId: string): void => {
    switch (pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':
        navigate('/operations');
        break;
      case 'perfil':
        navigate('/profile');
        break;
      case 'usuarios':
        navigate('/users');
        break;
      case 'relatorios':
        navigate('/reports');
        break;
      case 'cadastrar':
        navigate('/register-inspector');
        break;
      case 'logout':
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentPage="operations" onPageChange={handlePageChange} user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sacaria • Operação {decodedOperationId}</h1>
              <p className="text-sm text-gray-600">Carrossel de imagens</p>
            </div>
            <div className="flex items-center gap-4">
              <div onClick={() => navigate('/profile')} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          <ContainerImageSection
            title="Sacaria"
            images={images}
            isEditing={false}
            startIndex={startIndex}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => { e.preventDefault(); }}
            onSelectImages={() => { /* noop */ }}
            onRemoveImage={(_idx) => { /* noop */ }}
            onOpenModal={(idx) => openModal(idx)}
            onPrev={prev}
            onNext={next}
          />
        </main>
      </div>

      {/* Modal de Imagem */}
      {modal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {images.length > 1 && modal.index > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prevInModal(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            <img
              src={images[modal.index]?.url}
              alt={`Sacaria - Imagem ${modal.index + 1}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {images.length > 1 && modal.index < images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextInModal(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center bg-black bg-opacity-50 rounded-lg px-4 py-2">
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
