import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

interface User {
  name: string;
  role: string;
}

interface ContainerInfo {
  quantidade: string;
  tara: string;
  pesoBruto: string;
  pesoLiquido: string;
  lacreAgencia: string;
  dataRetirada: string;
  lacreOutros: string;
}

interface ImageItem {
  file?: File;
  url: string;
}

const initialInfo: ContainerInfo = {
  quantidade: '540',
  tara: '2220',
  pesoBruto: '27081',
  pesoLiquido: '27000',
  lacreAgencia: 'MQ45314',
  dataRetirada: '2025-07-01',
  lacreOutros: 'Múltiplos lacres'
};

const initialImages: ImageItem[] = [
  { url: 'https://via.placeholder.com/200?text=Container+1' },
  { url: 'https://via.placeholder.com/200?text=Container+2' },
  { url: 'https://via.placeholder.com/200?text=Container+3' },
  { url: 'https://via.placeholder.com/200?text=Container+4' },
  { url: 'https://via.placeholder.com/200?text=Container+5' },
  { url: 'https://via.placeholder.com/200?text=Container+6' },
  { url: 'https://via.placeholder.com/200?text=Container+7' },
  { url: 'https://via.placeholder.com/200?text=Container+8' },
];

const useCarousel = () => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollLeft = () => ref.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => ref.current?.scrollBy({ left: 300, behavior: 'smooth' });
  return { ref, scrollLeft, scrollRight };
};

const ContainerDetails: React.FC = () => {
  const { containerId, operationId } = useParams();
  const decodedContainerId = containerId ? decodeURIComponent(containerId) : '';
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const [info, setInfo] = useState<ContainerInfo>(initialInfo);
  const [images, setImages] = useState<ImageItem[]>(initialImages);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const carousel1 = useCarousel();
  const carousel2 = useCarousel();
  const carousel3 = useCarousel();
  const carousel4 = useCarousel();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const openViewer = (index: number) => {
    setCurrentImage(index);
    setViewerOpen(true);
  };

  const closeViewer = () => setViewerOpen(false);
  const nextImage = () => setCurrentImage(prev => (prev + 1) % images.length);
  const prevImage = () => setCurrentImage(prev => (prev - 1 + images.length) % images.length);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    if (!isEditing) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      setImages(prev => [
        ...prev,
        ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
      ]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!isEditing) return;
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [
        ...prev,
        ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
      ]);
    }
  };

  const handleImageButtonClick = (): void => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleRemoveImage = (index: number): void => {
    if (!isEditing) return;
    setImages(prev => {
      const newImages = [...prev];
      const [removed] = newImages.splice(index, 1);
      if (removed?.file) {
        URL.revokeObjectURL(removed.url);
      }
      return newImages;
    });
  };

  const handleCancel = (): void => {
    setInfo(initialInfo);
    setImages(initialImages);
    setIsEditing(false);
  };

  const handleSave = (): void => {
    alert('Salvar informações em breve!');
    setIsEditing(false);
  };

  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Administrador'
  };

  const handlePageChange = (pageId: string): void => {
    switch(pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':
        navigate('/operations');
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setInfo(prev => ({ ...prev, [name]: value }));
  };

  const formatWeight = (value: string) => {
    const num = parseFloat(value.replace(/\D/g, ''));
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage="operations" onPageChange={handlePageChange} user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Container {decodedContainerId}</h1>
              <p className="text-sm text-gray-600">Operação {decodedOperationId}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors">
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
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Dados do Container */}
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Dados do Container</h2>
            </div>

            <div className="p-6">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de Sacaria</label>
                    <input
                      type="text"
                      name="quantidade"
                      value={info.quantidade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tara (kg)</label>
                    <input
                      type="text"
                      name="tara"
                      value={info.tara}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Peso Líquido (kg)</label>
                    <input
                      type="text"
                      name="pesoLiquido"
                      value={info.pesoLiquido}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Peso Bruto (kg)</label>
                    <input
                      type="text"
                      name="pesoBruto"
                      value={info.pesoBruto}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lacre Agência</label>
                    <input
                      type="text"
                      name="lacreAgencia"
                      value={info.lacreAgencia}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Retirada Terminal</label>
                    <input
                      type="text"
                      name="dataRetirada"
                      value={info.dataRetirada}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lacres Outros</label>
                    <textarea
                      name="lacreOutros"
                      value={info.lacreOutros}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                  <div>
                    <span className="text-gray-500 block">Quantidade de Sacaria</span>
                    <span className="text-gray-900 font-medium">{formatWeight(info.quantidade)} sacas</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Tara</span>
                    <span className="text-gray-900 font-medium">{formatWeight(info.tara)} kg</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Peso Líquido</span>
                    <span className="text-gray-900 font-medium">{formatWeight(info.pesoLiquido)} kg</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Peso Bruto</span>
                    <span className="text-gray-900 font-medium">{formatWeight(info.pesoBruto)} kg</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Lacre Agência</span>
                    <span className="text-gray-900 font-medium">{info.lacreAgencia}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Data Retirada Terminal</span>
                    <span className="text-gray-900 font-medium">{formatDate(info.dataRetirada)}</span>
                  </div>
                  <div className="lg:col-span-3">
                    <span className="text-gray-500 block">Lacres Outros</span>
                    <span className="text-gray-900 font-medium">{info.lacreOutros}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Imagens */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">VAZIO/FORRADO</h2>
            <span className="text-sm font-normal text-gray-500">
              {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
            </span>
          </div>

          <div className="p-6">
            {isEditing ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              >
                {images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-5 9 5M3 7h18" />
                    </svg>
                    <p className="text-sm">
                      Faça upload das imagens
                      <br />
                      Arraste e solte imagens aqui ou clique para selecionar
                    </p>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Selecionar Imagens
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-xs text-gray-600 hover:bg-red-100 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Adicionar Mais Imagens
                    </button>
                  </div>
                )}
              </div>
            ) : (
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={carousel1.scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ‹
                  </button>
                  <div
                    ref={carousel1.ref}
                    className="flex w-full overflow-x-auto space-x-4 hide-scrollbar"
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="flex-none w-64">
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-48 object-cover cursor-pointer"
                            onClick={() => openViewer(idx)}
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-600 text-center">Imagem {idx + 1}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={carousel1.scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ›
                  </button>
                </div>
              ))}
              </div>
            )}
          </div>
          </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">FIADA</h2>
            <span className="text-sm font-normal text-gray-500">
              {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
            </span>
          </div>

          <div className="p-6">
            {isEditing ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              >
                {images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-5 9 5M3 7h18" />
                    </svg>
                    <p className="text-sm">
                      Faça upload das imagens
                      <br />
                      Arraste e solte imagens aqui ou clique para selecionar
                    </p>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Selecionar Imagens
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-xs text-gray-600 hover:bg-red-100 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Adicionar Mais Imagens
                    </button>
                  </div>
                )}
              </div>
            ) : (
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={carousel2.scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ‹
                  </button>
                  <div
                    ref={carousel2.ref}
                    className="flex w-full overflow-x-auto space-x-4 hide-scrollbar"
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="flex-none w-64">
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-48 object-cover cursor-pointer"
                            onClick={() => openViewer(idx)}
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-600 text-center">Imagem {idx + 1}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={carousel2.scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ›
                  </button>
                </div>
              ))}
              </div>
            )}
          </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              MEIA PORTA
              <span className="ml-auto text-sm font-normal text-gray-500">
                {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
              </span>
            </h2>
          </div>
          
          <div className="p-8">
            {isEditing ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              >
                {images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-5 9 5M3 7h18" />
                    </svg>
                    <p className="text-sm">
                      Faça upload das imagens
                      <br />
                      Arraste e solte imagens aqui ou clique para selecionar
                    </p>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Selecionar Imagens
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-xs text-gray-600 hover:bg-red-100 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Adicionar Mais Imagens
                    </button>
                  </div>
                )}
              </div>
            ) : (
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={carousel3.scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ‹
                  </button>
                  <div
                    ref={carousel3.ref}
                    className="flex w-full overflow-x-auto space-x-4 hide-scrollbar"
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="flex-none w-64">
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-48 object-cover cursor-pointer"
                            onClick={() => openViewer(idx)}
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-600 text-center">Imagem {idx + 1}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={carousel3.scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ›
                  </button>
                </div>
              ))}
              </div>
            )}
          </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              CHEIO/ABERTO
              <span className="ml-auto text-sm font-normal text-gray-500">
                {images.length} {images.length === 1 ? 'imagem' : 'imagens'}
              </span>
            </h2>
          </div>
          
          <div className="p-8">
            {isEditing ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              >
                {images.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <svg
                      className="w-10 h-10 text-gray-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v13a2 2 0 002 2h14a2 2 0 002-2V7M3 7l9-5 9 5M3 7h18" />
                    </svg>
                    <p className="text-sm">
                      Faça upload das imagens
                      <br />
                      Arraste e solte imagens aqui ou clique para selecionar
                    </p>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="mt-4 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Selecionar Imagens
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-white bg-opacity-80 rounded-full p-1 text-xs text-gray-600 hover:bg-red-100 hover:text-red-500"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleImageButtonClick}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Adicionar Mais Imagens
                    </button>
                  </div>
                )}
              </div>
            ) : (
                <div className="relative w-full">
                  <button
                    type="button"
                    onClick={carousel4.scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ‹
                  </button>
                  <div
                    ref={carousel4.ref}
                    className="flex w-full overflow-x-auto space-x-4 hide-scrollbar"
                  >
                    {images.map((img, idx) => (
                      <div key={idx} className="flex-none w-64">
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={img.url}
                            alt={`Imagem ${idx + 1}`}
                            className="w-full h-48 object-cover cursor-pointer"
                            onClick={() => openViewer(idx)}
                          />
                        </div>
                        <p className="mt-2 text-sm text-gray-600 text-center">Imagem {idx + 1}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={carousel4.scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow p-2"
                  >
                    ›
                  </button>
                </div>
              ))}
              </div>
            )}
          </div>
          </div>
          {viewerOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
              <button onClick={closeViewer} className="absolute top-4 right-4 text-white text-2xl">×</button>
              <button onClick={prevImage} className="absolute left-4 text-white text-4xl">‹</button>
              <img src={images[currentImage].url} alt={`Imagem ${currentImage + 1}`} className="max-h-[90%] max-w-[90%] object-contain" />
              <button onClick={nextImage} className="absolute right-4 text-white text-4xl">›</button>
            </div>
          )}
          {/* Botões de Ação */}
          <div className="flex justify-end gap-4">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar Container
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Container
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ContainerDetails;
