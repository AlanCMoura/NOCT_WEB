import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import {
  Calendar,
  User,
  Building2,
  Ship,
  CheckSquare,
  ClipboardList,
  Image,
  Users as UsersIcon,
  Timer,
  ShieldCheck,
  Rocket,
  Save,
  Trash2
} from 'lucide-react';

type ReportType = 'operacoes' | 'containers' | 'performance' | 'auditoria';

const types: { id: ReportType; title: string; desc: string; color: string; emoji: string }[] = [
  { id: 'operacoes', title: 'Operações Portuárias', desc: 'CTV, navios, performance e estatísticas operacionais', color: 'ring-teal-300', emoji: '📊' },
  { id: 'containers', title: 'Containers & Inspeções', desc: 'Detalhes de containers, fotos e categorias de inspeção', color: 'ring-amber-300', emoji: '📦' },
  { id: 'performance', title: 'Performance & KPIs', desc: 'Métricas de performance, tempo médio e produtividade', color: 'ring-violet-300', emoji: '⚡' },
  { id: 'auditoria', title: 'Trilha de Auditoria', desc: 'Log de ações, alterações e compliance', color: 'ring-indigo-300', emoji: '🔎' },
];

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const ReportBuilder: React.FC = () => {
  const { changePage } = useSidebar();
  const query = useQuery();
  const currentUser = useSessionUser({ role: 'Gerente' });

  const [reportType, setReportType] = useState<ReportType>('operacoes');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [navio, setNavio] = useState('Todos os navios');
  const [terminal, setTerminal] = useState('Todos os terminais');
  const [status, setStatus] = useState('Todos os status');
  const [usuario, setUsuario] = useState('Todos os usuários');
  const [fields, setFields] = useState({ ctv: true, containers: true, fotos: false, timestamps: true, usuarios: false, auditoria: false });
  const [obs, setObs] = useState('');

  // Simple presets via query param
  useEffect(() => {
    const preset = query.get('preset');
    if (!preset) return;
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === 'hoje') {
      const d = fmt(today);
      setInicio(d); setFim(d);
    } else if (preset === 'semana') {
      const start = new Date(today); start.setDate(today.getDate() - 6);
      setInicio(fmt(start)); setFim(fmt(today));
    } else if (preset === 'mes') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setInicio(fmt(start)); setFim(fmt(end));
    } else if (preset === 'pendencias') {
      setStatus('Abertas');
    }
  }, [query]);

  const toggle = (k: keyof typeof fields) => setFields((f) => ({ ...f, [k]: !f[k] }));

  const canGenerate = Boolean(inicio && fim);

  const handleClear = () => {
    setInicio('');
    setFim('');
    setNavio('Todos os navios');
    setTerminal('Todos os terminais');
    setStatus('Todos os status');
    setUsuario('Todos os usuários');
    setFields({ ctv: true, containers: true, fotos: false, timestamps: true, usuarios: false, auditoria: false });
    setObs('');
  };

  const handleSaveTemplate = () => {
    try {
      const tpl = { reportType, inicio, fim, navio, terminal, status, usuario, fields, obs };
      localStorage.setItem('reportTemplate', JSON.stringify(tpl));
    } catch {}
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={currentUser} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Geração de Relatórios</h1>
              <p className="text-sm text-[var(--muted)]">Configure e gere relatórios personalizados do sistema</p>
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

        <main className="flex-1 p-6 overflow-auto">

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left column - types (step 1) */}
            <aside className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--text)]">Tipos de Relatório</h2>
                <p className="text-sm text-[var(--muted)]">1) Escolha o tipo</p>
              </div>
              <div className="p-4 space-y-3">
                {types.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setReportType(t.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${reportType === t.id ? `bg-teal-50 ring-2 ${t.color}` : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--hover)]'}`}
                    aria-pressed={reportType === t.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl leading-none">{t.emoji}</div>
                      <div>
                        <div className="font-semibold text-[var(--text)]">{t.title}</div>
                        <div className="text-sm text-[var(--muted)]">{t.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            {/* Right column - form (step 2) */}
            <section className="xl:col-span-2 bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-semibold text-[var(--text)]">Configuração do Relatório</h2>
                <p className="text-sm text-[var(--muted)]">2) Defina filtros e campos</p>
              </div>
              <div className="p-6 space-y-6">
                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text)]">Data Início *</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text)]">Data Fim *</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
                    </div>
                  </div>
                </div>

                {/* Selects */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text)]">Navio</label>
                    <div className="relative">
                      <Ship className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <select value={navio} onChange={(e) => setNavio(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option>Todos os navios</option>
                        <option>MSC Fantasia</option>
                        <option>Maersk Line</option>
                        <option>CMA CGM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text)]">Terminal</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <select value={terminal} onChange={(e) => setTerminal(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option>Todos os terminais</option>
                        <option>Terminal 1</option>
                        <option>Terminal 2</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text)]">Status da Operação</label>
                    <div className="relative">
                      <CheckSquare className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option>Todos os status</option>
                        <option>Abertas</option>
                        <option>Em andamento</option>
                        <option>Concluídas</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[var(--text)]">Usuário</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className="w-full appearance-none pl-10 pr-8 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500">
                        <option>Todos os usuários</option>
                        <option>João Silva</option>
                        <option>Maria Souza</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div>
                  <div className="text-sm font-medium mb-2 text-[var(--text)]">Campos a Incluir</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className={`flex items-center gap-2 p-3 rounded-lg border ${fields.ctv ? 'border-teal-300 bg-teal-50' : 'border-[var(--border)]'}`}>
                      <ClipboardList className="w-4 h-4" />
                      <input type="checkbox" checked={fields.ctv} onChange={() => toggle('ctv')} /> CTV
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border ${fields.containers ? 'border-teal-300 bg-teal-50' : 'border-[var(--border)]'}`}>
                      <ClipboardList className="w-4 h-4" />
                      <input type="checkbox" checked={fields.containers} onChange={() => toggle('containers')} /> Containers
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border ${fields.fotos ? 'border-teal-300 bg-teal-50' : 'border-[var(--border)]'}`}>
                      <Image className="w-4 h-4" />
                      <input type="checkbox" checked={fields.fotos} onChange={() => toggle('fotos')} /> Fotos
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border ${fields.timestamps ? 'border-teal-300 bg-teal-50' : 'border-[var(--border)]'}`}>
                      <Timer className="w-4 h-4" />
                      <input type="checkbox" checked={fields.timestamps} onChange={() => toggle('timestamps')} /> Timestamps
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border ${fields.usuarios ? 'border-teal-300 bg-teal-50' : 'border-[var(--border)]'}`}>
                      <UsersIcon className="w-4 h-4" />
                      <input type="checkbox" checked={fields.usuarios} onChange={() => toggle('usuarios')} /> Usuários
                    </label>
                    <label className={`flex items-center gap-2 p-3 rounded-lg border ${fields.auditoria ? 'border-teal-300 bg-teal-50' : 'border-[var(--border)]'}`}>
                      <ShieldCheck className="w-4 h-4" />
                      <input type="checkbox" checked={fields.auditoria} onChange={() => toggle('auditoria')} /> Auditoria
                    </label>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <div className="text-sm font-medium mb-2 text-[var(--text)]">Observações Adicionais</div>
                  <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={4} placeholder="Adicione observações ou requisitos específicos para este relatório..." className="w-full p-3 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {/* Footer actions inside configuration card */}
                <div className="pt-4 mt-2 border-t border-[var(--border)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex gap-3">
                    <button onClick={handleClear} className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)]">
                      <Trash2 className="w-4 h-4 mr-2" /> Limpar
                    </button>
                    <button onClick={handleSaveTemplate} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-700 text-white hover:opacity-90">
                      <Save className="w-4 h-4 mr-2" /> Salvar Template
                    </button>
                  </div>
                  <button disabled={!canGenerate} className={`inline-flex items-center justify-center px-4 py-2 rounded-lg ${canGenerate ? 'bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-90' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}>
                    <Rocket className="w-4 h-4 mr-2" /> Gerar Relatório
                  </button>
                </div>
              </div>
            </section>

            {/* No third column after form */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportBuilder;

