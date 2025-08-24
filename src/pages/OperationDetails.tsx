import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface User {
  name: string;
  role: string;
}

interface OperationInfo {
  rfid: string;
  local: string;
  deadline: string;
  ship: string;
  exporter: string;
  origin: string;
  destination: string;
  navio: string;
  data: string;
}

interface Container {
  id: string;
  status: 'Pendente' | 'Inspecionado';
  pesoBruto: string;
}

const mockOperation: OperationInfo = {
  rfid: 'RF010',
  local: 'Terminal Portuário Santos',
  deadline: '20/07/2025',
  ship: 'AMV-12345/25',
  exporter: 'Empresa Exportadora S.A.',
  origin: 'Porto de Roterdã',
  destination: 'Destino',
  navio: 'MSC Fantasia',
  data: '15/09/2025'
};

const mockContainers: Container[] = [
  { id: 'ABCD 123456-1', status: 'Pendente', pesoBruto: '27081kg' },
  { id: 'EFGH 789012-3', status: 'Inspecionado', pesoBruto: '28959kg' }
];

const OperationDetails: React.FC = () => {
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();

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
    <div className="flex h-screen bg-gray-50">
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
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Informações da Operação</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-gray-500 block">RFID</span>
                <span className="text-gray-900 font-medium">{mockOperation.rfid}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Local (Terminal)</span>
                <span className="text-gray-900 font-medium">{mockOperation.local}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Deadline Draft</span>
                <span className="text-gray-900 font-medium">{mockOperation.deadline}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Operação</span>
                <span className="text-gray-900 font-medium">{mockOperation.ship}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Exportador</span>
                <span className="text-gray-900 font-medium">{mockOperation.exporter}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Origem</span>
                <span className="text-gray-900 font-medium">{mockOperation.origin}</span>
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
                <span className="text-gray-500 block">Data</span>
                <span className="text-gray-900 font-medium">{mockOperation.data}</span>
              </div>
            </div>
          </section>

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
                      container.status === 'Pendente'
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