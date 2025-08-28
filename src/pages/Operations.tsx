import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Upload, Plus, MoreVertical, FileText, Trash2, Edit } from 'lucide-react';
import Sidebar from '../components/Sidebar';

// Interfaces
interface User {
  name: string;
  role: string;
}

interface Operation {
  id: string;
  shipName: string;
  Reserva: string;
  date: string;
  status: 'Aberta' | 'Fechada' | 'Parcial';
  totalPhotos: number;
  requiredPhotos: number;
}

interface Filters {
  status: string;
  startDate: string;
  endDate: string;
}

// Mock de dados
const mockOperations: Operation[] = [
  {
    id: "AMV-12345/25",
    Reserva: "COD123",
    shipName: "MSC Fantasia",
    date: "2025-08-15T14:30:00Z",
    status: "Aberta",
    totalPhotos: 8,
    requiredPhotos: 6
  },
  {
    id: "AMV-12346/25",
    Reserva: "COD123",
    shipName: "Maersk Line",
    date: "2025-08-15T10:15:00Z",
    status: "Parcial",
    totalPhotos: 4,
    requiredPhotos: 6
  },
  {
    id: "AMV-12344/25",
    Reserva: "COD123",
    shipName: "Hamburg Süd",
    date: "2025-08-14T16:45:00Z",
    status: "Fechada",
    totalPhotos: 6,
    requiredPhotos: 6
  },
  {
    id: "AMV-12343/25",
    Reserva: "COD123",
    shipName: "CMA CGM",
    date: "2025-08-14T09:20:00Z",
    status: "Fechada",
    totalPhotos: 6,
    requiredPhotos: 6
  },
  {
    id: "AMV-12342/25",
    Reserva: "COD123",
    shipName: "Evergreen Marine",
    date: "2025-08-13T15:10:00Z",
    status: "Aberta",
    totalPhotos: 5,
    requiredPhotos: 6
  },
  {
    id: "AMV-12341/25",
    shipName: "COSCO Shipping",
    Reserva: "COD123",
    date: "2025-08-13T11:30:00Z",
    status: "Parcial",
    totalPhotos: 3,
    requiredPhotos: 6
  }
];

// Função para formatar data
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

// Componente de Badge de Status
const StatusBadge: React.FC<{ status: Operation['status'] }> = ({ status }) => {
  const statusConfig = {
    Aberta: {
      label: 'Aberta',
      className: 'bg-green-100 text-green-800'
    },
    Parcial: {
      label: 'Parcial',
      className: 'bg-yellow-100 text-yellow-800'
    },
    Fechada: {
      label: 'Fechada',
      className: 'bg-blue-100 text-blue-800'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
};

// Componente Modal de Filtros
const FilterModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  currentFilters: Filters;
}> = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [filters, setFilters] = useState<Filters>(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-xl transform transition-all">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="Aberta">Aberta</option>
                <option value="Parcial">Parcial</option>
                <option value="Fechada">Fechada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                const cleanFilters = { status: '', startDate: '', endDate: '' };
                setFilters(cleanFilters);
                onApply(cleanFilters);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Limpar
            </button>
            <button
              onClick={() => onApply(filters)}
              className="flex-1 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook customizado para operações
const useOperations = () => {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<Filters>({
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setOperations(mockOperations);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const filteredOperations = useMemo(() => {
    let filtered = [...operations];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(op =>
        op.id.toLowerCase().includes(query) ||
        op.shipName.toLowerCase().includes(query)
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(op =>
        op.id.toLowerCase().includes(query) ||
        op.Reserva.toLowerCase().includes(query)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(op => op.status === filters.status);
    }

    if (filters.startDate) {
      filtered = filtered.filter(op => 
        new Date(op.date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(op => 
        new Date(op.date) <= new Date(filters.endDate + 'T23:59:59')
      );
    }

    return filtered;
  }, [operations, searchQuery, filters]);

  return {
    operations: filteredOperations,
    loading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters
  };
};

// Componente Principal de Operações
const Operations: React.FC = () => {
  const navigate = useNavigate();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  
  const {
    operations,
    loading,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters
  } = useOperations();

  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Administrador'
  };

  // Função para lidar com navegação da Sidebar
  const handlePageChange = (pageId: string): void => {
    switch(pageId) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'operations':  // Corrigido para 'operations' conforme o ID na Sidebar
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
        // Implementar lógica de logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  const handleExport = (): void => {
    console.log('Exportando operações...');
    // Implementar lógica de exportação
    alert('Funcionalidade de exportação será implementada em breve!');
  };

  const handleNewOperation = (): void => {
    console.log('Criando nova operação...');
    // Implementar navegação para tela de nova operação ou abrir modal
    alert('Funcionalidade de nova operação será implementada em breve!');
  };

  const handleViewDetails = (operationId: string): void => {
    navigate(`/operations/${encodeURIComponent(operationId)}`);
  };


  const handleEdit = (operationId: string): void => {
    console.log('Editando operação:', operationId);
    // navigate(`/operations/${operationId}/edit`);
    alert(`Editando operação: ${operationId}`);
    setShowActionsMenu(null);
  };

  const handleDelete = (operationId: string): void => {
    if (window.confirm(`Tem certeza que deseja excluir a operação ${operationId}?`)) {
      console.log('Excluindo operação:', operationId);
      // Implementar lógica de exclusão
      alert(`Operação ${operationId} excluída com sucesso!`);
    }
    setShowActionsMenu(null);
  };

  // Fechar menu de ações ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setShowActionsMenu(null);
    if (showActionsMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showActionsMenu]);

  const activeFiltersCount = Object.values(filters).filter(v => v).length;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar 
        currentPage="operations" 
        onPageChange={handlePageChange}
        user={user}
      />

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Operações</h1>
              <p className="text-sm text-gray-600">Gerencie as operações portuárias e inspeções</p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Perfil do Usuário */}
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

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="Pesquisar por AMV, ou navio..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className="inline-flex items-center px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors relative"
              >
                <Filter className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-teal-500 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Importar
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Exportar
              </button>
              
              <button
                onClick={() => navigate('/operations/new')}
                className="inline-flex items-center px-4 py-2.5 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Operação
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Operações</h2>
                <span className="text-sm text-gray-500">
                  {operations.length} {operations.length === 1 ? 'operação' : 'operações'}
                </span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8">
                  <div className="animate-pulse space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : operations.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Nenhuma operação encontrada</p>
                  <p className="text-sm text-gray-400 mt-1">Tente ajustar os filtros ou buscar por outros termos</p>
                </div>
              ) : (
                <table className="w-full text-center">
                  <thead className="bg-gray-50">
                    <tr>
                       <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">AMV</th>
                       <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reserva</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Navio</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {operations.map((operation) => (
                      <tr key={operation.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {operation.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {operation.Reserva}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {operation.shipName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(operation.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={operation.status} />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm ">
                          <div className="flex items-center gap-2 justify-center">
                            <button 
                              onClick={() => handleViewDetails(operation.id)}
                              className="text-teal-600 hover:text-teal-800 transition-colors font-medium"
                            >
                              Ver Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {operations.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Mostrando <span className="font-medium">1</span> a{' '}
                    <span className="font-medium">{Math.min(10, operations.length)}</span> de{' '}
                    <span className="font-medium">{operations.length}</span> resultados
                  </div>
                  <div className="flex gap-2">
                    <button 
                      disabled={true}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Anterior
                    </button>
                    <button 
                      disabled={operations.length <= 10}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Filter Modal */}
        <FilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setIsFilterModalOpen(false);
          }}
          currentFilters={filters}
        />
      </div>
    </div>
  );
};

export default Operations;
