import React, {useRef, useState} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Plus,Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ContainerImageSection, { ImageItem as SectionImageItem } from '../components/ContainerImageSection';

interface User {
  name: string;
  role: string;
}

interface OperationInfo {
  id: string;
  local: string;
  reserva: string;
  deadline: string;
  ship: string;
  cliente: string;
  exporter: string;
  destination: string;
  navio: string;
  data: string;
  entrega: string;
}

interface Container {
  id: string;
  status: 'Aberto' | 'Fechado';
  pesoBruto: string;
  lacreAgencia?: string;
  lacrePrincipal?: string;
  lacreOutros?: string;
  qtdSacarias?: number;
  terminal?: string;
  data?: string; // yyyy-mm-dd
}

const mockOperation: OperationInfo = {
  id: 'OP-01',
  local: 'Terminal PortuÃ¡rio Santos',
  reserva: 'COD123',
  cliente: 'MSC',
  deadline: '20/07/2025',
  ship: 'AMV-12345/25',
  exporter: 'Empresa Exportadora S.A.',
  destination: 'Destino',
  navio: 'MSC Fantasia',
  data: '15/09/2025',
  entrega: '20/08/2025'
};  

const defaultContainers: Container[] = [
  { id: 'ABCD 123456-1', status: 'Aberto', pesoBruto: '27081kg', lacreAgencia: 'AG-1001', lacrePrincipal: 'LP-2001', lacreOutros: '', qtdSacarias: 10, terminal: 'Terminal 1', data: '2025-09-15' },
  { id: 'EFGH 789012-3', status: 'Fechado', pesoBruto: '28959kg', lacreAgencia: 'AG-1002', lacrePrincipal: 'LP-2002', lacreOutros: 'ALT-9', qtdSacarias: 8, terminal: 'Terminal 2', data: '2025-09-16' },
];

const OperationDetails: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const [opInfo, setOpInfo] = useState<OperationInfo>(mockOperation);
  const [containers, setContainers] = useState<Container[]>(defaultContainers);
  const opBackupRef = useRef<OperationInfo>(mockOperation);

  // Sacaria - imagens e navegaÃ§Ã£o do carrossel
  const [sacariaImages, setSacariaImages] = useState<SectionImageItem[]>([
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1976d2?text=Sacaria+1' },
    { url: 'https://via.placeholder.com/400x300/e8f5e9/4caf50?text=Sacaria+2' },
    { url: 'https://via.placeholder.com/400x300/fff3e0/ff9800?text=Sacaria+3' },
    { url: 'https://via.placeholder.com/400x300/fce4ec/e91e63?text=Sacaria+4' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/9c27b0?text=Sacaria+5' },
    { url: 'https://via.placeholder.com/400x300/e0f2f1/00695c?text=Sacaria+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/f57f17?text=Sacaria+7' },
    { url: 'https://via.placeholder.com/400x300/ffebee/c62828?text=Sacaria+8' }
  ]);
  const [sacariaIndex, setSacariaIndex] = useState<number>(0);
  const SACARIA_PER_VIEW = 5;
  const sacariaInputRef = useRef<HTMLInputElement | null>(null);

  const nextSacaria = () => {
    const maxIndex = Math.max(0, sacariaImages.length - SACARIA_PER_VIEW);
    setSacariaIndex(prev => Math.min(prev + SACARIA_PER_VIEW, maxIndex));
  };

  const prevSacaria = () => {
    setSacariaIndex(prev => Math.max(0, prev - SACARIA_PER_VIEW));
  };

  const handleSacariaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setSacariaImages(prev => ([...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))]));
    }
  };

  const handleSacariaSelect = () => {
    if (!isEditing) return;
    sacariaInputRef.current?.click();
  };

  const handleSacariaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing || !e.target.files) return;
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setSacariaImages(prev => ([...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))]));
    }
    e.target.value = '';
  };

  const handleSacariaRemove = (index: number) => {
    if (!isEditing) return;
    setSacariaImages(prev => {
      const list = [...prev];
      const [removed] = list.splice(index, 1);
      if (removed && (removed as any).file) URL.revokeObjectURL(removed.url);
      return list;
    });
  };

  const startEdit = () => {
    opBackupRef.current = opInfo;
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setOpInfo(opBackupRef.current);
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

  const handleContainerClick = (containerId: string): void => {
    navigate(
      `/operations/${encodeURIComponent(decodedOperationId)}/containers/${encodeURIComponent(containerId)}`
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentPage="operations" onPageChange={handlePageChange} user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Operação {decodedOperationId}</h1>
              <p className="text-sm text-gray-600">Detalhes da Operação</p>
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
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className=" border-b border-gray-100 flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              {/* BotÃµes de Ação */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between gap-4">
                   <h2 className="mt-1 text-lg font-semibold text-gray-900">Informações da operação</h2>
            </div>
            
            </div>
            <div className="px-6 pt-4 justify-end gap-2 hidden">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2 ${isEditing ? 'hidden' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Operação
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${isEditing ? '' : 'hidden'}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { alert('Opera��o atualizada!'); setIsEditing(false); }}
                className={`px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors ${isEditing ? '' : 'hidden'}`}
              >
                Salvar Operação
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir a Operação ${decodedOperationId}?`)) {
                    alert(`Opera��o ${decodedOperationId} excluída!`);
                    navigate('/operations');
                  }
                }}
                className={`px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 ${isEditing ? 'hidden' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                Excluir Operação
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-gray-500 block">ID</span>
                <span className="text-gray-900 font-medium">{opInfo.id}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Operação</span>
                {isEditing ? (
                  <input value={opInfo.ship} onChange={e=>setOpInfo({...opInfo, ship: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.ship}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Reserva</span>
                {isEditing ? (
                  <input value={opInfo.reserva} onChange={e=>setOpInfo({...opInfo, reserva: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.reserva}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Local (Terminal)</span>
                {isEditing ? (
                  <input value={opInfo.local} onChange={e=>setOpInfo({...opInfo, local: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.local}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Destino</span>
                {isEditing ? (
                  <input value={opInfo.destination} onChange={e=>setOpInfo({...opInfo, destination: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.destination}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Navio</span>
                {isEditing ? (
                  <input value={opInfo.navio} onChange={e=>setOpInfo({...opInfo, navio: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.navio}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Exportador</span>
                {isEditing ? (
                  <input value={opInfo.exporter} onChange={e=>setOpInfo({...opInfo, exporter: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.exporter}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Deadline Draft</span>
                {isEditing ? (
                  <input value={opInfo.deadline} onChange={e=>setOpInfo({...opInfo, deadline: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.deadline}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Data</span>
                {isEditing ? (
                  <input value={opInfo.data} onChange={e=>setOpInfo({...opInfo, data: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.data}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Deadline de Entrega</span>
                {isEditing ? (
                  <input value={opInfo.entrega} onChange={e=>setOpInfo({...opInfo, entrega: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.entrega}</span>
                )}
              </div>
              <div>
                <span className="text-gray-500 block">Cliente</span>
                {isEditing ? (
                  <input value={opInfo.cliente} onChange={e=>setOpInfo({...opInfo, cliente: e.target.value})} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-gray-900 font-medium">{opInfo.cliente}</span>
                )}
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2 ${isEditing ? 'hidden' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar Operação
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${isEditing ? '' : 'hidden'}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { alert('Operação atualizada!'); setIsEditing(false); }}
                className={`px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors ${isEditing ? '' : 'hidden'}`}
              >
                Salvar Operação
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir a Operação ${decodedOperationId}?`)) {
                    alert(`Opera??o ${decodedOperationId} exclu?da!`);
                    navigate('/operations');
                  }
                }}
                className={`px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 ${isEditing ? 'hidden' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                Excluir Operação
              </button>
            </div>
            </div>
          </section>
          <input
            type="file"
            ref={sacariaInputRef}
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleSacariaUpload}
          />


          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Containers da Operação</h2>
              <div className="flex flex-1 sm:flex-initial gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar container..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/overview`)}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Overview
                </button>
                <button
                  onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/containers/new`)}
                  className="inline-flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Container
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {/* Item especial: Sacaria (como se fosse um container) */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer transition-colors bg-teal-50/60 hover:bg-teal-50 border-l-4 border-teal-500"
                onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/sacaria`)}
              >
                <div>
                  <div className="text-sm font-semibold text-teal-800">Sacaria</div>
                  <div className="text-xs text-gray-500">Carrossel de imagens da sacaria</div>
                </div>
              </div>
              {containers.map(container => (
                <div
                  key={container.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleContainerClick(container.id)}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{container.id}</div>
                    <div className="text-xs text-gray-500">{container.pesoBruto} Peso Bruto</div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      container.status === 'Aberto'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {container.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Overview modal removido: navegação para página dedicada */}
        </main>
      </div>
    </div>
  );
};

export default OperationDetails;

