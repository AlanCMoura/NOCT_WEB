import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Search, ArrowLeft, Edit } from 'lucide-react';

interface User {
  name: string;
  role: string;
}

interface ContainerRow {
  id: string;
  lacreAgencia?: string;
  lacrePrincipal?: string;
  lacreOutros?: string;
  qtdSacarias?: number;
  terminal?: string;
  data?: string; // yyyy-mm-dd
}

const seedRows: ContainerRow[] = [
  { id: 'ABCD 123456-1', lacreAgencia: 'AG-1001', lacrePrincipal: 'LP-2001', lacreOutros: '', qtdSacarias: 10, terminal: 'Terminal 1', data: '2025-09-15' },
  { id: 'EFGH 789012-3', lacreAgencia: 'AG-1002', lacrePrincipal: 'LP-2002', lacreOutros: 'ALT-9', qtdSacarias: 8, terminal: 'Terminal 2', data: '2025-09-16' },
];

const OperationOverview: React.FC = () => {
  const navigate = useNavigate();
  const { operationId } = useParams();
  const decodedOperationId = useMemo(() => operationId ? decodeURIComponent(operationId) : '', [operationId]);

  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Administrador'
  };

  const [rows, setRows] = useState<ContainerRow[]>(seedRows);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContainerRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.id.toLowerCase().includes(q));
  }, [rows, search]);

  const startEdit = (containerId: string) => {
    const current = rows.find(r => r.id === containerId);
    if (current) {
      setEditingId(containerId);
      setDraft({ ...current });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveEdit = () => {
    if (!editingId || !draft) return;
    setRows(prev => prev.map(r => (r.id === editingId ? { ...draft } : r)));
    setEditingId(null);
    setDraft(null);
  };

  const handleBack = () => {
    navigate(`/operations/${encodeURIComponent(decodedOperationId)}`);
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

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentPage="operations" onPageChange={handlePageChange} user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Overview de Containers</h1>
              <p className="text-sm text-gray-600">Operação {decodedOperationId}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleBack} className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="Pesquisar por ID do container..."
              />
            </div>
          </div>

          {/* Table (estilo seguindo registro de operações) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Containers da Operação</h2>
                <span className="text-sm text-gray-500">{filtered.length} itens</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ID Container</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Lacre Agência</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Lacre Principal</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Lacre Outros</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd Sacarias</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Terminal</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.id}</td>
                      {/* Colunas editáveis */}
                      {editingId === row.id ? (
                        <>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacreAgencia || ''}
                              onChange={(e) => setDraft(prev => prev ? { ...prev, lacreAgencia: e.target.value } : prev)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="AG-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacrePrincipal || ''}
                              onChange={(e) => setDraft(prev => prev ? { ...prev, lacrePrincipal: e.target.value } : prev)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="LP-xxxx"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.lacreOutros || ''}
                              onChange={(e) => setDraft(prev => prev ? { ...prev, lacreOutros: e.target.value } : prev)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Outros"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="number"
                              min={0}
                              value={draft?.qtdSacarias ?? 0}
                              onChange={(e) => setDraft(prev => prev ? { ...prev, qtdSacarias: Number(e.target.value) } : prev)}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="text"
                              value={draft?.terminal || ''}
                              onChange={(e) => setDraft(prev => prev ? { ...prev, terminal: e.target.value } : prev)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              placeholder="Terminal"
                            />
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-sm">
                            <input
                              type="date"
                              value={draft?.data || ''}
                              onChange={(e) => setDraft(prev => prev ? { ...prev, data: e.target.value } : prev)}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.lacreAgencia || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.lacrePrincipal || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.lacreOutros || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.qtdSacarias ?? 0}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.terminal || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.data || '-'}</td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingId === row.id ? (
                          <div className="flex items-center gap-3 justify-center">
                            <button onClick={cancelEdit} className="text-gray-600 hover:text-gray-800 transition-colors font-medium">Cancelar</button>
                            <button onClick={saveEdit} className="text-teal-600 hover:text-teal-800 transition-colors font-medium">Salvar</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(row.id)}
                            className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 transition-colors font-medium"
                          >
                            <Edit className="w-4 h-4" /> Editar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button onClick={handleBack} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">Voltar</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default OperationOverview;
