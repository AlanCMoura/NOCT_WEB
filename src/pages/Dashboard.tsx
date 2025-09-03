import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Package, Eye } from 'lucide-react';
import Sidebar from '../components/Sidebar';

interface User {
  name: string;
  role: string;
}

interface StatData {
  icon: React.ReactNode;
  value: string;
  label: string;
  change: string;
  changeColor: string;
}

interface Operation {
  ctv: string;
  navio: string;
  data: string;
  status: string;
  statusColor: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('7 dias');

  const user: User = { name: 'Carlos Oliveira', role: 'Administrador' };

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
      case 'logout':
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        break;
      default:
        break;
    }
  };

  const statsData: StatData[] = [
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-500" />,
      value: '24',
      label: 'Operações Ativas',
      change: '↑ 12% vs mês anterior',
      changeColor: 'text-green-500',
    },
    {
      icon: <Package className="w-8 h-8 text-orange-500" />,
      value: '486',
      label: 'Containers Inspecionados',
      change: '↑ 8% vs mês anterior',
      changeColor: 'text-green-500',
    },
    {
      icon: <Eye className="w-8 h-8 text-purple-500" />,
      value: '3.2k',
      label: 'Fotos Capturadas',
      change: '↑ 23% vs mês anterior',
      changeColor: 'text-green-500',
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-green-500" />,
      value: '98.5%',
      label: 'Taxa de Conclusão',
      change: '↓ 0,5% vs mês anterior',
      changeColor: 'text-red-500',
    },
  ];

  const recentOperations: Operation[] = [
    { ctv: 'CTV-12345/25', navio: 'MSC Fantasia', data: '15/08/2025 14:30', status: 'Ativo', statusColor: 'bg-green-100 text-green-800' },
    { ctv: 'CTV-12346/25', navio: 'Maersk Line', data: '15/08/2025 10:15', status: 'Pendente', statusColor: 'bg-yellow-100 text-yellow-800' },
    { ctv: 'CTV-12344/25', navio: 'Hamburg Süd', data: '14/08/2025 16:45', status: 'Finalizado', statusColor: 'bg-blue-100 text-blue-800' },
    { ctv: 'CTV-12343/25', navio: 'CMA CGM', data: '14/08/2025 09:20', status: 'Finalizado', statusColor: 'bg-blue-100 text-blue-800' },
  ];

  return (
    <div className="flex h-screen bg-app">
      <Sidebar currentPage="dashboard" onPageChange={handlePageChange} user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
              <p className="text-sm text-[var(--muted)]">Monitoramento centralizado</p>
            </div>
            <div className="flex items-center gap-4">
              <div onClick={() => navigate('/profile')} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat, index) => (
              <div key={index} className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-2xl font-bold text-[var(--text)] mb-1">{stat.value}</div>
                    <div className="text-sm text-[var(--muted)] mb-2">{stat.label}</div>
                    <div className={`text-xs ${stat.changeColor}`}>{stat.change}</div>
                  </div>
                  <div className="p-2 bg-[var(--hover)] rounded-lg">{stat.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[var(--text)]">Operações Recentes</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center">
                <thead className="bg-[var(--hover)]">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">CTV</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Navio</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--surface)] divide-y divide-[var(--border)]">
                  {recentOperations.map((operation, index) => (
                    <tr key={index} className="hover:bg-[var(--hover)]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{operation.ctv}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{operation.navio}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{operation.data}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${operation.statusColor}`}>{operation.status}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-teal-600 cursor-pointer hover:text-teal-800">Ver Detalhes</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--text)]">Operações por Dia</h3>
                  <div className="flex gap-2">
                    {['7 dias', '30 dias', '90 dias'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`px-3 py-1 text-sm rounded-lg ${selectedPeriod === period ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-[var(--hover)] text-[var(--muted)] hover:bg-[var(--hover)]'}`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-64 flex items-center justify-center text-[var(--muted)]">
                  <BarChart3 className="w-16 h-16 mb-4" />
                </div>
              </div>
            </div>

            <div>
              <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Atividade Recente</h3>
                <div className="space-y-4">
                  <div className="text-sm text-[var(--muted)]">
                    <div className="font-medium text-[var(--text)]">João Silva adicionou 6 fotos</div>
                    <div className="text-[var(--muted)]">há 2 minutos</div>
                  </div>
                  <div className="text-sm text-[var(--muted)]">
                    <div className="font-medium text-[var(--text)]">Nova inspeção iniciada</div>
                    <div className="text-[var(--muted)]">há 15 minutos</div>
                  </div>
                  <div className="text-sm text-[var(--muted)]">
                    <div className="font-medium text-[var(--text)]">Relatório CTV-12344/25 finalizado</div>
                    <div className="text-[var(--muted)]">há 1 hora</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

