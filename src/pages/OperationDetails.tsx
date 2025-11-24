import React, { useRef, useState, useCallback } from 'react';
import { useMemo, useEffect, useReducer } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ToggleSwitch from '../components/ToggleSwitch';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { OperationSchema } from '../validation/operation';
import { computeStatus, getProgress, setComplete, setImages, statusWeight, ContainerStatus } from '../services/containerProgress';
import { deleteOperation } from '../services/operations';
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
  ctv: string;
  cliente: string;
  exporter: string;
  destination: string;
  ship: string;
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

// Local image item type (avoids heavy component import here)
type SectionImageItem = { file?: File; url: string };

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
  ctv: 'CTV-12345/25',
  exporter: 'Empresa Exportadora S.A.',
  destination: 'Destino',
  ship: 'MSC Fantasia',
  data: '15/09/2025',
  entrega: '20/08/2025'
};



const OperationDetails: React.FC = () => {
  type Field = keyof OperationInfo;
  type Errors = Partial<Record<Field, string>>;
  type OperationState = { opInfo: OperationInfo; isEditing: boolean; errors: Errors };
  type Action =
    | { type: 'startEdit' }
    | { type: 'cancelEdit'; backup: OperationInfo }
    | { type: 'update'; field: Field; value: string }
    | { type: 'setEditing'; value: boolean }
    | { type: 'setErrors'; errors: Errors };

  const reducer = (state: OperationState, action: Action): OperationState => {
    switch (action.type) {
      case 'startEdit':
        return { ...state, isEditing: true };
      case 'cancelEdit':
        return { opInfo: action.backup, isEditing: false, errors: {} };
      case 'update':
        return { ...state, opInfo: { ...state.opInfo, [action.field]: action.value } as OperationInfo };
      case 'setEditing':
        return { ...state, isEditing: action.value };
      case 'setErrors':
        return { ...state, errors: action.errors };
      default:
        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, { opInfo: mockOperation, isEditing: false, errors: {} });
  const { opInfo, isEditing, errors } = state;
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });
  const initialCount = containerCountFor(decodedOperationId);
  const [containers, setContainers] = useState<Container[]>(() => generateContainers(initialCount));
  const opBackupRef = useRef<OperationInfo>(mockOperation);
  const [operationStatus, setOperationStatus] = useState<'Aberta' | 'Fechada'>('Aberta');
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Ordenação e Paginação
  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);
  type StatusKey = 'todos' | 'ni' | 'parcial' | 'completo';
  const [statusKey, setStatusKey] = useState<StatusKey>('todos');
  const statusOf = useCallback((id: string) => computeStatus(getProgress(id)), []);

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
  const [sacariaImages, setSacariaImages] = useState<SectionImageItem[]>([]);
  const [sacariaIndex, setSacariaIndex] = useState<number>(0);
  const SACARIA_PER_VIEW = 5;
  const sacariaInputRef = useRef<HTMLInputElement | null>(null);

  const nextSacaria = () => {
    const maxIndex = Math.max(0, sacariaImages.length - SACARIA_PER_VIEW);
    setSacariaIndex(prev => Math.min(prev + SACARIA_PER_VIEW, maxIndex));
  };

  const prevSacaria = () => {
    setSacariaIndex(prev => Math.max(0, prev - SACARIA_PER_VIEW));
  };

  const handleSacariaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditing) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setSacariaImages(prev => ([...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))]));
    }
  };

  const handleSacariaSelect = () => {
    if (!isEditing) return;
    sacariaInputRef.current?.click();
  };

  const handleSacariaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing || !e.target.files) return;
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setSacariaImages(prev => ([...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))]));
    }
    e.target.value = '';
  };

  const handleSacariaRemove = (index: number) => {
    if (!isEditing) return;
    setSacariaImages(prev => {
      const list = [...prev];
      const [removed] = list.splice(index, 1);
      if (removed && (removed as any).file) URL.revokeObjectURL(removed.url);
      return list;
    });
  };

  const startEdit = () => {
    opBackupRef.current = opInfo;
    dispatch({ type: 'startEdit' });
  };

  const cancelEdit = () => {
    dispatch({ type: 'cancelEdit', backup: opBackupRef.current });
  };

  const handleDeleteOperation = async () => {
    if (!decodedOperationId) return;
    const confirmed = window.confirm('Tem certeza que deseja excluir a Operacao ' + decodedOperationId + '?');
    if (!confirmed) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      await deleteOperation(decodedOperationId);
      navigate('/operations');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Nao foi possivel excluir a operacao.';
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  // navegação via SidebarProvider; handler antigo removido

  const handleContainerClick = (containerId: string): void => {
    navigate(
      `/operations/${encodeURIComponent(decodedOperationId)}/containers/${encodeURIComponent(containerId)}`
    );
  };

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Operação {decodedOperationId}</h1>
              <p className="text-sm text-[var(--muted)]">Detalhes da Operação</p>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => changePage('perfil')} aria-label="Acessar perfil" className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors">
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden space-y-6">
          {deleteError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {deleteError}
            </div>
          )}
          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold text-[var(--text)]">Informacoes da Operacao</h2>
                  {!isEditing && (
                    <ToggleSwitch
                      id="operation-status-toggle"
                      className="flex items-center gap-2 text-sm mt-1 ml-4"
                      checked={operationStatus === 'Fechada'}
                      checkedLabel="Fechada"
                      uncheckedLabel="Em andamento"
                      onChange={(checked) => setOperationStatus(checked ? 'Fechada' : 'Aberta')}
                    />
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => { alert('Operacao atualizada!'); dispatch({ type: 'setEditing', value: false }); }}
                        className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Salvar Operacao
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={startEdit}
                        className="px-6 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar Operacao
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteOperation}
                        disabled={deleteLoading}
                        className="px-6 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 hover:border-red-300 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteLoading ? 'Excluindo...' : 'Excluir Operacao'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/operations')}
                        className="px-6 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                      >
                        Voltar
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div>
                <span className="text-[var(--muted)] block">ID</span>
                <span className="text-[var(--text)] font-medium">{opInfo.id}</span>
              </div>
              <div>
                <span className="text-[var(--muted)] block">CTV</span>
                {isEditing ? (<>
                  <input value={opInfo.ctv} onChange={e=>dispatch({ type: 'update', field: 'ctv', value: e.target.value })} aria-invalid={!!errors.ctv} aria-describedby={errors.ctv ? 'ctv-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.ctv && (<p id="ctv-error" className="mt-1 text-xs text-red-600">{errors.ctv}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.ctv}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Reserva</span>
                {isEditing ? (<>
                  <input value={opInfo.reserva} onChange={e=>dispatch({ type: 'update', field: 'reserva', value: e.target.value })} aria-invalid={!!errors.reserva} aria-describedby={errors.reserva ? 'reserva-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.reserva && (<p id="reserva-error" className="mt-1 text-xs text-red-600">{errors.reserva}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.reserva}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Local (Terminal)</span>
                {isEditing ? (<>
                  <input value={opInfo.local} onChange={e=>dispatch({ type: 'update', field: 'local', value: e.target.value })} aria-invalid={!!errors.local} aria-describedby={errors.local ? 'local-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.local && (<p id="local-error" className="mt-1 text-xs text-red-600">{errors.local}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.local}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Destino</span>
                {isEditing ? (<>
                  <input value={opInfo.destination} onChange={e=>dispatch({ type: 'update', field: 'destination', value: e.target.value })} aria-invalid={!!errors.destination} aria-describedby={errors.destination ? 'destination-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.destination && (<p id="destination-error" className="mt-1 text-xs text-red-600">{errors.destination}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.destination}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Navio</span>
                {isEditing ? (<>
                  <input value={opInfo.ship} onChange={e=>dispatch({ type: 'update', field: 'ship', value: e.target.value })} aria-invalid={!!errors.ship} aria-describedby={errors.ship ? 'ship-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.ship && (<p id="ship-error" className="mt-1 text-xs text-red-600">{errors.ship}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.ship}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Exportador</span>
                {isEditing ? (<>
                  <input value={opInfo.exporter} onChange={e=>dispatch({ type: 'update', field: 'exporter', value: e.target.value })} aria-invalid={!!errors.exporter} aria-describedby={errors.exporter ? 'exporter-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.exporter && (<p id="exporter-error" className="mt-1 text-xs text-red-600">{errors.exporter}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.exporter}</span>
                )}
              </div>
              <div>
                <span className="text-[var(--muted)] block">Deadline Draft</span>
                {isEditing ? (<>
                  <input value={opInfo.deadline} onChange={e=>dispatch({ type: 'update', field: 'deadline', value: e.target.value })} aria-invalid={!!errors.deadline} aria-describedby={errors.deadline ? 'deadline-error' : undefined} className="mt-1 w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.deadline && (<p id="deadline-error" className="mt-1 text-xs text-red-600">{errors.deadline}</p>)}
                </>) : (
                  <span className="text-[var(--text)] font-medium">{opInfo.deadline}</span>
                )}
              </div>
            </div>
          </section>

          {/* Sacaria upload dorment (moved to dedicated page) */}

          <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-[var(--text)]">Containers da Operção</h2>
              <div className="flex flex-1 sm:flex-initial gap-3 items-center">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted)] w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar container..."
                    aria-label="Buscar container"
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
                  aria-label="Ver overview da operação"
                  onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/overview`)}
                  className="inline-flex items-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Overview
                </button>
            </div>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {/* Item especial: Sacaria (como se fosse um container) */}
              <button
                type="button"
                aria-label="Abrir sacaria"
                className="w-full text-left p-4 flex items-center justify-between cursor-pointer transition-colors bg-[var(--hover)] border-l-4 border-teal-500"
                onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}/sacaria`)}
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">Sacaria</div>
                  <div className="text-xs text-[var(--muted)]">Carrossel de imagens da sacaria</div>
                </div>
              </button>
              {/* Contador total */}
              <div className="px-4 py-2 text-sm text-[var(--muted)]">
                Total de containers: <span className="font-medium text-[var(--text)]">{total}</span>
              </div>
              {paginated.map(container => (
                <button
                  type="button"
                  aria-label={`Abrir container ${container.id}`}
                  key={container.id}
                  className="w-full text-left p-4 flex items-center justify-between hover:bg-[var(--hover)] cursor-pointer transition-colors"
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
                </button>
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





































