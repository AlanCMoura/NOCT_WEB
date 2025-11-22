import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Clock, ArrowRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';

interface User { name: string; role: string }

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Dashboard</h1>
              <p className="text-sm text-[var(--muted)]">Em manutenção durante o período de testes</p>
            </div>
            <div className="flex items-center gap-4">
              <div onClick={() => changePage('perfil')} className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="h-full flex items-center justify-center">
            <div className="w-full max-w-3xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm p-8 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 flex items-center justify-center text-teal-600 mb-4">
                <Wrench className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">Dashboard em manutenção</h2>
              <p className="text-[var(--muted)] mb-6">
                Estamos aprimorando esta área para a próxima versão. Enquanto isso, use as seções abaixo normalmente.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mb-6">
                <button onClick={() => navigate('/operations')} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90">
                  Ir para Operações <ArrowRight className="w-4 h-4 ml-2" />
                </button>
                <button onClick={() => navigate('/reports')} className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:bg-[var(--hover)]">
                  Relatórios
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
                <Clock className="w-4 h-4" />
                Atualização prevista: em breve
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

