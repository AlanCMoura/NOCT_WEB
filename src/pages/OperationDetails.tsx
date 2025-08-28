import React, {useState} from 'react';
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
}

const mockOperation: OperationInfo = {
  id: 'OP-01',
  local: 'Terminal Portuário Santos',
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

const mockContainers: Container[] = [
  { id: 'ABCD 123456-1', status: 'Aberto', pesoBruto: '27081kg' },
  { id: 'EFGH 789012-3', status: 'Fechado', pesoBruto: '28959kg' }
];

const OperationDetails: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();

  // Sacaria - imagens e navegação do carrossel
  const [sacariaImages] = useState<SectionImageItem[]>([
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

  const nextSacaria = () => {
    const maxIndex = Math.max(0, sacariaImages.length - SACARIA_PER_VIEW);
    setSacariaIndex(prev => Math.min(prev + SACARIA_PER_VIEW, maxIndex));
  };

  const prevSacaria = () => {
    setSacariaIndex(prev => Math.max(0, prev - SACARIA_PER_VIEW));
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
              <p className="text-sm text-gray-600">Detalhes da operação portuária</p>
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
          <section className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className=" border-b border-gray-100 flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              {/* Botões de Ação */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between gap-4">
                   <h2 className="mt-1 text-lg font-semibold text-gray-900">Informações da Operação</h2>
            </div>
            
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-gray-500 block">ID</span>
                <span className="text-gray-900 font-medium">{mockOperation.id}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Operação</span>
                <span className="text-gray-900 font-medium">{mockOperation.ship}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Reserva</span>
                <span className="text-gray-900 font-medium">{mockOperation.reserva}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Local (Terminal)</span>
                <span className="text-gray-900 font-medium">{mockOperation.local}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Destino</span>
                <span className="text-gray-900 font-medium">{mockOperation.destination}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Navio</span>
                <span className="text-gray-900 font-medium">{mockOperation.navio}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Exportador</span>
                <span className="text-gray-900 font-medium">{mockOperation.exporter}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Deadline Draft</span>
                <span className="text-gray-900 font-medium">{mockOperation.deadline}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Data</span>
                <span className="text-gray-900 font-medium">{mockOperation.data}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Deadline de Entrega</span>
                <span className="text-gray-900 font-medium">{mockOperation.entrega}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Cliente</span>
                <span className="text-gray-900 font-medium">{mockOperation.cliente}</span>
              </div>
            </div>
            </div>
          </section>

          {/* Carrossel Sacaria */}
          <ContainerImageSection
            title="Sacaria"
            images={sacariaImages}
            isEditing={false}
            startIndex={sacariaIndex}
            imagesPerView={SACARIA_PER_VIEW}
            onDrop={() => {}}
            onSelectImages={() => {}}
            onRemoveImage={() => {}}
            onOpenModal={() => {}}
            onPrev={prevSacaria}
            onNext={nextSacaria}
            footerActions={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Operação
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Tem certeza que deseja excluir a operação ${decodedOperationId}?`)) {
                      alert(`Operação ${decodedOperationId} excluída!`);
                      navigate('/operations');
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-400 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Operação
                </button>
              </div>
            }
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
                  onClick={() => alert('Funcionalidade de novo container em breve!')}
                  className="inline-flex items-center px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Container
                </button>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {mockContainers.map(container => (
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
        </main>
      </div>
    </div>
  );
};

export default OperationDetails;
