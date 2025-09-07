import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Download, Upload, FileText } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';

interface User { name: string; role: string; }
type OperationStatus = 'Aberta' | 'Fechada';

interface Operation {
  id: string;
  Reserva: string;
  shipName: string;
  date: string; // ISO
  status: OperationStatus;
}

const mockOperations: Operation[] = [
  { id: 'AMV-12345/25', Reserva: 'COD123', shipName: 'MSC Fantasia', date: '2025-08-15T14:30:00Z', status: 'Aberta' },
  { id: 'AMV-12346/25', Reserva: 'COD123', shipName: 'Maersk Line', date: '2025-08-15T10:15:00Z', status: 'Aberta' },
  { id: 'AMV-12344/25', Reserva: 'COD123', shipName: 'Hamburg Süd', date: '2025-08-14T16:45:00Z', status: 'Fechada' },
  { id: 'AMV-12343/25', Reserva: 'COD123', shipName: 'CMA CGM', date: '2025-08-14T09:20:00Z', status: 'Fechada' },
  { id: 'AMV-12342/25', Reserva: 'COD123', shipName: 'Evergreen Marine', date: '2025-08-13T15:10:00Z', status: 'Aberta' },
  { id: 'AMV-12341/25', Reserva: 'COD123', shipName: 'COSCO Shipping', date: '2025-08-13T11:30:00Z', status: 'Aberta' },
];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

const StatusBadge: React.FC<{ status: OperationStatus }> = ({ status }) => {
  const map = {
    Aberta: { label: 'Aberta', className: 'bg-green-100 text-green-800' },
    Fechada: { label: 'Fechada', className: 'bg-blue-100 text-blue-800' },
  } as const;
  const cfg = map[status];
  return <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${cfg.className}`}>{cfg.label}</span>;
};

const Operations: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user: User = { name: 'Carlos Oliveira', role: 'Administrador' };

  const [loading, setLoading] = useState(true);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setOperations(mockOperations);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter((op) =>
      op.id.toLowerCase().includes(q) || op.shipName.toLowerCase().includes(q) || op.Reserva.toLowerCase().includes(q)
    );
  }, [operations, search]);

  const handleNew = () => navigate('/operations/new');
  const handleView = (id: string) => navigate(`/operations/${encodeURIComponent(id)}`);

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Operações</h1>
              <p className="text-sm text-[var(--muted)]">Gerencie as operações portuárias e inspeções</p>
            </div>
            <div className="flex items-center gap-4">
              <div onClick={() => changePage('perfil')} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {/* Barra de ações */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[var(--border)] rounded-lg text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-[var(--surface)] text-[var(--text)]"
                placeholder="Pesquisar por AMV, reserva ou navio..."
              />
            </div>
            <div className="flex gap-3">
              <button className="inline-flex items-center px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">
                <Filter className="w-4 h-4" />
              </button>
              <button className="inline-flex items-center px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] transition-colors">
                <Download className="w-4 h-4 mr-2" /> Importar
              </button>
              <button onClick={handleNew} className="inline-flex items-center px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90 transition-colors">
                <Upload className="w-4 h-4 mr-2" /> Nova Operação
              </button>
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">

            {loading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-[var(--hover)] rounded w-1/3"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-[var(--border)] p-4">
                        <div className="h-4 bg-[var(--hover)] rounded w-3/4 mb-3"></div>
                        <div className="h-3 bg-[var(--hover)] rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-[var(--hover)] rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-[var(--muted)] mb-4" />
                <p className="text-[var(--muted)]">Nenhuma operação encontrada</p>
                <p className="text-sm text-[var(--muted)] mt-1">Tente ajustar os filtros ou buscar por outros termos</p>
              </div>
            ) : (
              <table className="w-full text-center">
                <thead className="bg-[var(--hover)]">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">AMV</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Reserva</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Navio</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                  {filtered.map((op) => (
                    <tr key={op.id} className="hover:bg-[var(--hover)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{op.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{op.Reserva}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{op.shipName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{formatDate(op.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={op.status} /></td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm ">
                        <button onClick={() => handleView(op.id)} className="text-teal-600 hover:text-teal-800 transition-colors font-medium">Ver Detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginação */}
          {filtered.length > 0 && (
            <div className="px-6 py-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--muted)]">
                  Mostrando <span className="font-medium">1</span> a <span className="font-medium">{Math.min(10, filtered.length)}</span> de <span className="font-medium">{filtered.length}</span> resultados
                </div>
                <div className="flex gap-2">
                  <button disabled className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Anterior
                  </button>
                  <button disabled className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    Próximo
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Operations;
