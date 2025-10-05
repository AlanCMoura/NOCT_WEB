import React, { useRef, useState } from 'react';
import { useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { computeStatus, getProgress, ContainerStatus } from '../services/containerProgress';
import { containerCountFor } from '../mock/operationData';

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
  pesoBruto: string;
  lacreAgencia?: string;
  lacrePrincipal?: string;
  lacreOutros?: string;
  qtdSacarias?: number;
  terminal?: string;
  data?: string; // yyyy-mm-dd
}

// Gera containers mock a partir de uma contagem
const generateContainers = (count: number): Container[] => {
  const list: Container[] = [];
  for (let i = 0; i < count; i++) {
    const num = 100001 + i;
    const peso = 27000 + ((i * 123) % 2500);
    list.push({
      id: `CNTR ${num}-${(i % 9) + 1}`,
      pesoBruto: `${peso}kg`,
      lacreAgencia: `AG-${1000 + i}`,
      lacrePrincipal: `LP-${2000 + i}`,
      lacreOutros: i % 3 === 0 ? `ALT-${i % 10}` : '',
      qtdSacarias: 6 + (i % 7),
      terminal: `Terminal ${1 + (i % 4)}`,
      data: `2025-09-${String(15 + (i % 15)).padStart(2, '0')}`,
    });
  }
  return list;
};

const mockOperation: OperationInfo = {
  id: 'OP-01',
  local: 'Terminal Portuario Santos',
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


const OperationDetails: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const [opInfo, setOpInfo] = useState<OperationInfo>(mockOperation);
  const initialCount = containerCountFor(decodedOperationId);
  const [containers, setContainers] = useState<Container[]>(() => generateContainers(initialCount));
  const opBackupRef = useRef<OperationInfo>(mockOperation);

  // Ordenação e Paginação
  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);
  type StatusKey = 'todos' | 'ni' | 'parcial' | 'completo';
  const [statusKey, setStatusKey] = useState<StatusKey>('todos');
  const progressOf = (id: string) => getProgress(id);
  const statusOf = (id: string) => computeStatus(progressOf(id));

  const filteredContainers = useMemo(() => {
    if (statusKey === 'todos') return containers;
  const target: ContainerStatus = statusKey === 'ni' ? 'Nao inicializado' : statusKey === 'parcial' ? 'Parcial' : 'Completo';
    return containers.filter(c => statusOf(c.id) === target);
  }, [containers, statusKey, statusOf]);

  const total = filteredContainers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  // Atualiza lista quando a operação mudar
  useEffect(() => {
    const c = containerCountFor(decodedOperationId);
    setContainers(generateContainers(c));
    setPage(1);
  }, [decodedOperationId]);

  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const paginated = useMemo(() => filteredContainers.slice(startIdx, endIdx), [filteredContainers, startIdx, endIdx]);

  // Sacaria - imagens e navegação do carrossel
  const [sacariaImages, setSacariaImages] = useState<any[]>([
    { url: 'https://via.placeholder.com/400x300/e3f2fd/1976d2?text=Sacaria+1' },
    { url: 'https://via.placeholder.com/400x300/e8f5e9/4caf50?text=Sacaria+2' },
    { url: 'https://via.placeholder.com/400x300/fff3e0/ff9800?text=Sacaria+3' },
    { url: 'https://via.placeholder.com/400x300/fce4ec/e91e63?text=Sacaria+4' },
    { url: 'https://via.placeholder.com/400x300/f3e5f5/9c27b0?text=Sacaria+5' },
    { url: 'https://via.placeholder.com/400x300/e0f2f1/00695c?text=Sacaria+6' },
    { url: 'https://via.placeholder.com/400x300/fff8e1/f57f17?text=Sacaria+7' },
    { url: 'https://via.placeholder.com/400x300/ffebee/c62828?text=Sacaria+8' }
  ]);
  const SACARIA_PER_VIEW = 5;
  const sacariaInputRef = useRef<HTMLInputElement | null>(null);

  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Administrador'
  };

  // navegação via SidebarProvider; handler antigo removido

  const handleContainerClick = (containerId: string): void => {
    navigate(
      `/operations/${encodeURIComponent(decodedOperationId)}/containers/${encodeURIComponent(containerId)}`
    );
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Operação {decodedOperationId}</h1>
              <p className="text-sm text-[var(--muted)]">Detalhes da Operação</p>
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

        <main className="flex-1 p-6 overflow-auto space-y-6">
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className=" border-b border-[var(--border)] flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              {/* Botões de Ação */}
            <div className="p-6 border-b border-[var(--border)]">
                <div className="flex justify-between gap-4">
                   <h2 className="mt-1 text-lg font-semibold text-[var(--text)]">Informações da Operação</h2>
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
                className={`px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors ${isEditing ? '' : 'hidden'}`}
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
                    alert(`Operação ${decodedOperationId} excluída!`);
                    navigate('/operations');
                  }
                }}
                className={`px-4 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 ${isEditing ? 'hidden' : ''}`}
              >
                <Trash2 className="w-4 h-4" />
                Excluir Operação
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-[var(--muted)] block">ID</span>
                <span className="text-[var(--text)] font-medium">{opInfo.id}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">Operação</span>
                {isEditing ? (
                  <input value={opInfo.ship} onChange={e=>setOpInfo({...opInfo, ship: e.target.value})} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.ship}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Reserva</span>
                {isEditing ? (
                  <input value={opInfo.reserva} onChange={e=>setOpInfo({...opInfo, reserva: e.target.value})} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.reserva}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Local (Terminal)</span>
                {isEditing ? (
                  <input value={opInfo.local} onChange={e=>setOpInfo({...opInfo, local: e.target.value})} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.local}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Destino</span>
                {isEditing ? (
                  <input value={opInfo.destination} onChange={e=>setOpInfo({...opInfo, destination: e.target.value})} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.destination}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Navio</span>
                {isEditing ? (
                  <input value={opInfo.navio} onChange={e=>setOpInfo({...opInfo, navio: e.target.value})} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.navio}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Exportador</span>
                {isEditing ? (
                  <input value={opInfo.exporter} onChange={e=>setOpInfo({...opInfo, exporter: e.target.value})} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.exporter}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Deadline Draft</span>
                {isEditing ? (
                  <input value={opInfo.deadline} onChange={e=>setOpInfo({...opInfo, deadline: e.target.value})} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                ) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.deadline}</span>
                )}
              </div>
            </div>
            </div>
          </section>

          <input
            type="file"
            ref={sacariaInputRef}
            accept="image/*"
            multiple
            className="hidden"
            // onChange removido pois handleSacariaUpload não existe mais
          />

          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operação</h2>
              <div className="flex flex-1 sm:flex-initial gap-3 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar container..."
                    className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-[var(--surface)] text-[var(--text)]"
                  />
                </div>
                <div className="w-64">
                  <select
                    value={statusKey as any}
                    onChange={(e) => setStatusKey(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    aria-label="Filtrar por Status"
                    title="Filtrar containers pelo status"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="ni">Não inicializado</option>
                    <option value="parcial">Parcial</option>
                    <option value="completo">Completo</option>
                  </select>
                </div>
                <button
                  onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/overview`)}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Overview
                </button>
            </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {/* Item especial: Sacaria (como se fosse um container) */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer transition-colors bg-[var(--hover)] border-l-4 border-teal-500"
                onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/sacaria`)}
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">Sacaria</div>
                  <div className="text-xs text-[var(--muted)]">Carrossel de imagens da sacaria</div>
                </div>
              </div>
              {/* Contador total */}
              <div className="px-4 py-2 text-sm text-[var(--muted)]">
                Total de containers: <span className="font-medium text-[var(--text)]">{total}</span>
              </div>
              {paginated.map(container => (
                <div
                  key={container.id}
                  className="p-4 flex items-center justify-between hover:bg-[var(--hover)] cursor-pointer transition-colors"
                  onClick={() => handleContainerClick(container.id)}
                >
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">{container.id}</div>
                    <div className="text-xs text-[var(--muted)]">{container.pesoBruto} Peso Bruto</div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    (() => { const s = statusOf(container.id); return s === 'Completo' ? 'bg-green-100 text-green-800' : s === 'Parcial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-200 text-gray-700'; })()
                  }`}>
                    {statusOf(container.id)}
                  </span>
                </div>
              ))}
            </div>
            {/* Paginação */}
            <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
              <div className="text-sm text-[var(--muted)]">
                {total === 0 ? (
                  <span>Mostrando 0 a 0 de 0</span>
                ) : (
                  <span>
                    Mostrando <span className="font-medium">{startIdx + 1}</span> a <span className="font-medium">{endIdx}</span> de <span className="font-medium">{total}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próximo
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default OperationDetails;




















