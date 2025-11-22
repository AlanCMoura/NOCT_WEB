import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import {
  CalendarDays,
  BarChart3,
  TrendingUp,
  Timer,
  Download,
  RefreshCw,
  Rocket,
  Search
} from 'lucide-react';

interface User { name: string; role: string }

interface ReportItem {
  id: string;
  title: string;
  createdAt: string; // ISO or human
  icon: React.ReactNode;
  records?: number;
}

const seedReports: ReportItem[] = [
  {
    id: 'rpt-msc-fantasia',
    title: 'Containers MSC Fantasia',
    createdAt: '08/09/2025 às 09:15',
    icon: <span className="text-amber-600">📦</span>,
    records: 123,
  },
  {
    id: 'rpt-equipe-perf',
    title: 'Performance Equipe',
    createdAt: '07/09/2025 às 16:45',
    icon: <span className="text-orange-500">⚡</span>,
    records: 24,
  },
];

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const currentUser = useSessionUser({ role: 'Gerente' });

  const [search, setSearch] = useState('');
  const [reports] = useState<ReportItem[]>(seedReports);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(r => r.title.toLowerCase().includes(q));
  }, [reports, search]);

  const gotoBuilder = (preset?: string) => {
    navigate(preset ? `/reports/generate?preset=${encodeURIComponent(preset)}` : '/reports/generate');
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={currentUser} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Relatórios</h1>
              <p className="text-sm text-[var(--muted)]">Geração e histórico de relatórios</p>
            </div>
            <div className="flex items-center gap-3">
              <div onClick={() => changePage('perfil')} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{currentUser.name}</div>
                  <div className="text-xs text-[var(--muted)]">{currentUser.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">

          {/* Quick actions */}
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Ações Rápidas</h2>
              <button onClick={() => gotoBuilder()} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90 transition-colors">
                <Rocket className="w-4 h-4 mr-2" /> Relatório Personalizado
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button onClick={() => gotoBuilder('hoje')} className="group flex items-center gap-4 p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--hover)] transition-colors text-left">
                <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text)]">Operações Hoje</div>
                  <div className="text-sm text-[var(--muted)]">Relatório do dia atual</div>
                </div>
              </button>

              <button onClick={() => gotoBuilder('semana')} className="group flex items-center gap-4 p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--hover)] transition-colors text-left">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text)]">Resumo Semanal</div>
                  <div className="text-sm text-[var(--muted)]">Últimos 7 dias</div>
                </div>
              </button>

              <button onClick={() => gotoBuilder('mes')} className="group flex items-center gap-4 p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--hover)] transition-colors text-left">
                <div className="p-3 rounded-lg bg-violet-50 text-violet-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text)]">Mensal Completo</div>
                  <div className="text-sm text-[var(--muted)]">Mês atual</div>
                </div>
              </button>

              <button onClick={() => gotoBuilder('pendencias')} className="group flex items-center gap-4 p-4 border border-[var(--border)] rounded-xl hover:bg-[var(--hover)] transition-colors text-left">
                <div className="p-3 rounded-lg bg-fuchsia-50 text-fuchsia-600">
                  <Timer className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold text-[var(--text)]">Pendências</div>
                  <div className="text-sm text-[var(--muted)]">Operações em aberto</div>
                </div>
              </button>
            </div>
          </section>

          {/* Recent reports */}
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Relatórios Recentes</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar relatório..."
                    className="w-full sm:w-64 pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <button onClick={() => gotoBuilder()} className="text-teal-700 hover:text-teal-800 text-sm">Ver Todos</button>
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {filtered.map((r) => (
                <div key={r.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[var(--hover)] flex items-center justify-center">
                      {r.icon}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--text)]">{r.title}</div>
                      <div className="text-xs text-[var(--muted)]">Gerado em {r.createdAt}{typeof r.records === 'number' ? ` • ${r.records} registros` : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)]">
                      <Download className="w-4 h-4 mr-2" /> Baixar
                    </button>
                    <button onClick={() => gotoBuilder(r.id)} className="inline-flex items-center px-3 py-1.5 text-sm rounded-lg bg-gray-700 text-white hover:opacity-90">
                      <RefreshCw className="w-4 h-4 mr-2" /> Regerar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Reports;
