import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ContainerImageSection from '../components/ContainerImageSection';

interface User {
  name: string;
  role: string;
}

interface ContainerInfo {
  quantidade: string;
  tara: string;
  pesoBruto: string;
  pesoLiquido: string;
  container: string;
  lacreAgencia: string;
  dataRetirada: string;
  lacreOutros: string;
  dataEstufagem: string;
}

interface ImageItem {
  file?: File;
  url: string;
}

const initialInfo: ContainerInfo = {
  quantidade: '540',
  container: 'ABCD 123456-1',
  tara: '2220',
  pesoBruto: '27081',
  pesoLiquido: '27000',
  lacreAgencia: 'MQ45314',
  dataRetirada: '2025-07-01',
  lacreOutros: 'Múltiplos lacres',
  dataEstufagem: '2025-08-04'
};

// Seções separadas com imagens específicas para cada uma
const imagesSections: Record<string, ImageItem[]> = {
  'Vazio/Forrado': [
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1976d2?text=Vazio+1' },
    { url: 'https://via.placeholder.com/400x300/e8f5e8/4caf50?text=Vazio+2' },
    { url: 'https://via.placeholder.com/400x300/fff3e0/ff9800?text=Vazio+3' },
    { url: 'https://via.placeholder.com/400x300/fce4ec/e91e63?text=Vazio+4' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/9c27b0?text=Vazio+5' },
    { url: 'https://via.placeholder.com/400x300/e0f2f1/00695c?text=Vazio+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/f57f17?text=Vazio+7' }
  ],
  'Fiada': [
    { url: 'https://via.placeholder.com/400x300/ffebee/c62828?text=Fiada+1' },
    { url: 'https://via.placeholder.com/400x300/e1f5fe/0277bd?text=Fiada+2' },
    { url: 'https://via.placeholder.com/400x300/f1f8e9/689f38?text=Fiada+3' },
    { url: 'https://via.placeholder.com/400x300/fafafa/424242?text=Fiada+4' },
    { url: 'https://via.placeholder.com/400x300/e8eaf6/5e35b1?text=Fiada+5' },
    { url: 'https://via.placeholder.com/400x300/fff3e0/ef6c00?text=Fiada+6' }
  ],
  'Meia Porta': [
    { url: 'https://via.placeholder.com/400x300/e0f7fa/00838f?text=Porta+1' },
    { url: 'https://via.placeholder.com/400x300/f9fbe7/827717?text=Porta+2' },
    { url: 'https://via.placeholder.com/400x300/fdf2e9/d84315?text=Porta+3' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/7b1fa2?text=Porta+4' },
    { url: 'https://via.placeholder.com/400x300/e8f5e8/388e3c?text=Porta+5' },
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1565c0?text=Porta+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/fbc02d?text=Porta+7' },
    { url: 'https://via.placeholder.com/400x300/ffebee/d32f2f?text=Porta+8' }
  ],
  'Lacrado/Fechado': [
    { url: 'https://via.placeholder.com/400x300/e0f7fa/00838f?text=Lacrado+1' },
    { url: 'https://via.placeholder.com/400x300/f9fbe7/827717?text=Lacrado+2' },
    { url: 'https://via.placeholder.com/400x300/fdf2e9/d84315?text=Lacrado+3' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/7b1fa2?text=Lacrado+4' },
    { url: 'https://via.placeholder.com/400x300/e8f5e8/388e3c?text=Lacrado+5' },
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1565c0?text=Lacrado+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/fbc02d?text=Lacrado+7' },
    { url: 'https://via.placeholder.com/400x300/ffebee/d32f2f?text=Lacrado+8' }
  ],
  'Lacre Principal': [
    { url: 'https://via.placeholder.com/400x300/e0f7fa/00838f?text=Principal+1' },
    { url: 'https://via.placeholder.com/400x300/f9fbe7/827717?text=Principal+2' },
    { url: 'https://via.placeholder.com/400x300/fdf2e9/d84315?text=Principal+3' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/7b1fa2?text=Principal+4' },
    { url: 'https://via.placeholder.com/400x300/e8f5e8/388e3c?text=Principal+5' },
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1565c0?text=Principal+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/fbc02d?text=Principal+7' },
    { url: 'https://via.placeholder.com/400x300/ffebee/d32f2f?text=Principal+8' }
  ],
  'Lacre Outros': [
    { url: 'https://via.placeholder.com/400x300/e0f7fa/00838f?text=Outros+1' },
    { url: 'https://via.placeholder.com/400x300/f9fbe7/827717?text=Outros+2' },
    { url: 'https://via.placeholder.com/400x300/fdf2e9/d84315?text=Outros+3' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/7b1fa2?text=Outros+4' },
    { url: 'https://via.placeholder.com/400x300/e8f5e8/388e3c?text=Outros+5' },
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1565c0?text=Outros+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/fbc02d?text=Outros+7' },
    { url: 'https://via.placeholder.com/400x300/ffebee/d32f2f?text=Outros+8' }
  ],
  'Cheio/Aberto': [
    { url: 'https://via.placeholder.com/400x300/e0f7fa/00838f?text=Aberto+1' },
    { url: 'https://via.placeholder.com/400x300/f9fbe7/827717?text=Aberto+2' },
    { url: 'https://via.placeholder.com/400x300/fdf2e9/d84315?text=Aberto+3' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/7b1fa2?text=Aberto+4' },
    { url: 'https://via.placeholder.com/400x300/e8f5e8/388e3c?text=Aberto+5' },
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1565c0?text=Aberto+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/fbc02d?text=Aberto+7' },
    { url: 'https://via.placeholder.com/400x300/ffebee/d32f2f?text=Aberto+8' }
  ]
  
};

const ContainerDetails: React.FC = () => {
  const { containerId, operationId } = useParams();
  const decodedContainerId = containerId ? decodeURIComponent(containerId) : '';
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const [info, setInfo] = useState<ContainerInfo>(initialInfo);
  const [imageSections, setImageSections] = useState<Record<string, ImageItem[]>>(imagesSections);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [carouselIndex, setCarouselIndex] = useState<Record<string, number>>({});
  const [selectedImageModal, setSelectedImageModal] = useState<{ 
    section: string; 
    imageIndex: number; 
    images: ImageItem[] 
  } | null>(null);

  const IMAGES_PER_VIEW = 5;

  const nextImages = (section: string): void => {
    const images = imageSections[section] || [];
    if (images.length <= IMAGES_PER_VIEW) return;
    
    setCarouselIndex(prev => {
      const current = prev[section] ?? 0;
      const maxIndex = Math.max(0, images.length - IMAGES_PER_VIEW);
      const newIndex = Math.min(current + IMAGES_PER_VIEW, maxIndex);
      return { ...prev, [section]: newIndex };
    });
  };

  const prevImages = (section: string): void => {
    setCarouselIndex(prev => {
      const current = prev[section] ?? 0;
      const newIndex = Math.max(0, current - IMAGES_PER_VIEW);
      return { ...prev, [section]: newIndex };
    });
  };

  const openImageModal = (section: string, imageIndex: number) => {
    const images = imageSections[section] || [];
    setSelectedImageModal({ section, imageIndex, images });
  };

  const closeImageModal = () => {
    setSelectedImageModal(null);
  };

  const nextImageInModal = () => {
    if (selectedImageModal) {
      const newIndex = (selectedImageModal.imageIndex + 1) % selectedImageModal.images.length;
      setSelectedImageModal({ ...selectedImageModal, imageIndex: newIndex });
    }
  };

  const prevImageInModal = () => {
    if (selectedImageModal) {
      const newIndex = selectedImageModal.imageIndex === 0 
        ? selectedImageModal.images.length - 1 
        : selectedImageModal.imageIndex - 1;
      setSelectedImageModal({ ...selectedImageModal, imageIndex: newIndex });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, section: string): void => {
    e.preventDefault();
    if (!isEditing) return;
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length) {
      setImageSections(prev => ({
        ...prev,
        [section]: [
          ...(prev[section] || []),
          ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
        ]
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, section: string): void => {
    if (!isEditing || !e.target.files) return;
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    setImageSections(prev => ({
      ...prev,
      [section]: [
        ...(prev[section] || []),
        ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
      ]
    }));
    e.target.value = '';
  };

  const handleImageButtonClick = (section: string): void => {
    if (isEditing && fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).dataset.section = section;
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (section: string, index: number): void => {
    if (!isEditing) return;
    setImageSections(prev => {
      const sectionImages = [...(prev[section] || [])];
      const [removed] = sectionImages.splice(index, 1);
      if (removed?.file) {
        URL.revokeObjectURL(removed.url);
      }
      return { ...prev, [section]: sectionImages };
    });
  };

  const handleCancel = (): void => {
    setInfo(initialInfo);
    setImageSections(imagesSections);
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

  const formatWeight = (value: string): string => {
    const num = parseFloat(value.replace(/\D/g, ''));
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex h-screen bg-gray-100">
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

        <main className="flex-1 p-6 overflow-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const section = (e.target as HTMLInputElement).dataset.section || 'VAZIO/FORRADO';
              handleImageUpload(e, section);
            }}
          />

          {/* Dados do Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex p-6 border-b border-gray-100 justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Dados do Container</h2>
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
                    <div className="flex gap-2">
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
                      <button 
                        className="px-6 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-400 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Container
                      </button>
                    </div>
                )}
              </div>
            </div>

            <div className="p-6">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Container</label>
                    <input
                      type="text"
                      name="container"
                      value={info.container}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Estufagem</label>
                    <input
                      type="text"
                      name="container"
                      value={info.dataEstufagem}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 text-sm ">
                  <div>
                    <span className="text-gray-500 block">Container</span>
                    <span className="text-gray-900 font-medium">{info.container}</span>
                  </div>
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
                  <div>
                    <span className="text-gray-500 block">Lacres Outros</span>
                    <span className="text-gray-900 font-medium">{info.lacreOutros}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Data de Estufagem</span>
                    <span className="text-gray-900 font-medium">{info.dataEstufagem}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <ContainerImageSection
            title="Vazio/Forrado"
            images={imageSections['Vazio/Forrado'] || []}
            isEditing={isEditing}
            startIndex={carouselIndex['Vazio/Forrado'] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, 'Vazio/Forrado')}
            onSelectImages={() => handleImageButtonClick('Vazio/Forrado')}
            onRemoveImage={(idx) => handleRemoveImage('Vazio/Forrado', idx)}
            onOpenModal={(idx) => openImageModal('Vazio/Forrado', idx)}
            onPrev={() => prevImages('Vazio/Forrado')}
            onNext={() => nextImages('Vazio/Forrado')}
          />
          <ContainerImageSection
            title="Fiada"
            images={imageSections['Fiada'] || []}
            isEditing={isEditing}
            startIndex={carouselIndex['Fiada'] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, 'Fiada')}
            onSelectImages={() => handleImageButtonClick('Fiada')}
            onRemoveImage={(idx) => handleRemoveImage('Fiada', idx)}
            onOpenModal={(idx) => openImageModal('Fiada', idx)}
            onPrev={() => prevImages('Fiada')}
            onNext={() => nextImages('Fiada')}
          />
          <ContainerImageSection
            title="Meia Porta"
            images={imageSections['Meia Porta'] || []}
            isEditing={isEditing}
            startIndex={carouselIndex['Meia Porta'] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, 'Meia Porta')}
            onSelectImages={() => handleImageButtonClick('Meia Porta')}
            onRemoveImage={(idx) => handleRemoveImage('Meia Porta', idx)}
            onOpenModal={(idx) => openImageModal('Meia Porta', idx)}
            onPrev={() => prevImages('Meia Porta')}
            onNext={() => nextImages('Meia Porta')}
          />
          <ContainerImageSection
            title="Lacrado/Fechado"
            images={imageSections['Lacrado/Fechado'] || []}
            isEditing={isEditing}
            startIndex={carouselIndex['Lacrado/Fechado'] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, 'Lacrado/Fechado')}
            onSelectImages={() => handleImageButtonClick('Lacrado/Fechado')}
            onRemoveImage={(idx) => handleRemoveImage('Lacrado/Fechado', idx)}
            onOpenModal={(idx) => openImageModal('Lacrado/Fechado', idx)}
            onPrev={() => prevImages('Lacrado/Fechado')}
            onNext={() => nextImages('Lacrado/Fechado')}
          />
          <ContainerImageSection
            title="Lacre Principal"
            images={imageSections['Lacre Principal'] || []}
            isEditing={isEditing}
            startIndex={carouselIndex['Lacre Principal'] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, 'Lacre Principal')}
            onSelectImages={() => handleImageButtonClick('Lacre Principal')}
            onRemoveImage={(idx) => handleRemoveImage('Lacre Principal', idx)}
            onOpenModal={(idx) => openImageModal('Lacre Principal', idx)}
            onPrev={() => prevImages('Lacre Principal')}
            onNext={() => nextImages('Lacre Principal')}
          />
          <ContainerImageSection
            title="Lacre Outros"
            images={imageSections['Lacre Outros'] || []}
            isEditing={isEditing}
            startIndex={carouselIndex['Lacre Outros'] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, 'Lacre Outros')}
            onSelectImages={() => handleImageButtonClick('Lacre Outros')}
            onRemoveImage={(idx) => handleRemoveImage('Lacre Outros', idx)}
            onOpenModal={(idx) => openImageModal('Lacre Outros', idx)}
            onPrev={() => prevImages('Lacre Outros')}
            onNext={() => nextImages('Lacre Outros')}
          />
          <ContainerImageSection
            title="Cheio/Aberto"
            images={imageSections['Cheio/Aberto'] || []}
            isEditing={isEditing}
            startIndex={carouselIndex['Cheio/Aberto'] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, 'Cheio/Aberto')}
            onSelectImages={() => handleImageButtonClick('Cheio/Aberto')}
            onRemoveImage={(idx) => handleRemoveImage('Cheio/Aberto', idx)}
            onOpenModal={(idx) => openImageModal('Cheio/Aberto', idx)}
            onPrev={() => prevImages('Cheio/Aberto')}
            onNext={() => nextImages('Cheio/Aberto')}
          /> 
          
       </main>
     </div>

     {/* Modal de Imagem em Tela Cheia */}
     {selectedImageModal && (
       <div 
         className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
         onClick={closeImageModal}
       >
         <div className="relative max-w-5xl w-full h-full flex items-center justify-center">
           {/* Botão Fechar */}
           <button
             onClick={closeImageModal}
             className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>

           {/* Navegação Anterior */}
           {selectedImageModal.images.length > 1 && selectedImageModal.imageIndex > 0 && (
             <button
               onClick={(e) => { e.stopPropagation(); prevImageInModal(); }}
               className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-3"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
               </svg>
             </button>
           )}

           {/* Imagem */}
           <img
             src={selectedImageModal.images[selectedImageModal.imageIndex]?.url}
             alt={`${selectedImageModal.section} - Imagem ${selectedImageModal.imageIndex + 1}`}
             className="max-w-full max-h-full object-contain"
             onClick={(e) => e.stopPropagation()}
           />

           {/* Navegação Próxima */}
           {selectedImageModal.images.length > 1 && selectedImageModal.imageIndex < selectedImageModal.images.length - 1 && (
             <button
               onClick={(e) => { e.stopPropagation(); nextImageInModal(); }}
               className=" right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-3"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
             </button>
           )}

           {/* Informações da Imagem */}
           <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-center bg-black bg-opacity-50 rounded-lg px-4 py-2">
             <p className="text-lg font-medium">{selectedImageModal.section}</p>
             <p className="text-sm opacity-75">
               {selectedImageModal.imageIndex + 1} de {selectedImageModal.images.length}
             </p>
           </div>
         </div>
       </div>
     )}
   </div>
 );
};

export default ContainerDetails;
