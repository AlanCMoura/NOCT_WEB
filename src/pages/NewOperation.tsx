import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { useSessionUser } from '../context/AuthContext';
import { createOperation, updateOperation } from '../services/operations';

interface NewOperationForm {
  ctv: string;
  reservation: string;
  terminal: string;
  exporter: string;
  destination: string;
  ship: string;
  arrivalDate: string; // yyyy-mm-dd
  deadlineDraft: string; // yyyy-mm-dd
  refClient: string;
  loadDeadline: string; // yyyy-mm-dd
  vehiclePlate: string;
  vehicleInvoice: string;
  vehicleSacksQuantity: string;
}

const toOptionalInteger = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;

  return Math.trunc(parsed);
};

const NewOperation: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: 'Administrador' });

  const [form, setForm] = useState<NewOperationForm>({
    ctv: '',
    reservation: '',
    terminal: '',
    exporter: '',
    destination: '',
    ship: '',
    arrivalDate: '',
    deadlineDraft: '',
    refClient: '',
    loadDeadline: '',
    vehiclePlate: '',
    vehicleInvoice: '',
    vehicleSacksQuantity: '',
  });

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const setField = (key: keyof NewOperationForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCancel = () => {
    navigate('/operations');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setSubmitError(null);
    setSaving(true);

    const vehiclePlate = form.vehiclePlate.trim();
    const vehicleInvoice = form.vehicleInvoice.trim();
    const vehicleSacksQuantity = toOptionalInteger(form.vehicleSacksQuantity);
    const hasVehicleData = Boolean(vehiclePlate || vehicleInvoice || vehicleSacksQuantity !== undefined);

    const payload = {
      ctv: form.ctv.trim(),
      reservation: form.reservation.trim(),
      terminal: form.terminal.trim(),
      exporter: form.exporter.trim(),
      destination: form.destination.trim(),
      ship: form.ship.trim(),
      arrivalDate: form.arrivalDate || undefined,
      deadlineDraft: form.deadlineDraft || undefined,
      refClient: form.refClient.trim(),
      loadDeadline: form.loadDeadline || undefined,
      plate: vehiclePlate || undefined,
      invoice: vehicleInvoice || undefined,
      sacksQuantity: vehicleSacksQuantity,
      vehicles: hasVehicleData
        ? [
            {
              plate: vehiclePlate || undefined,
              invoice: vehicleInvoice || undefined,
              sacksQuantity: vehicleSacksQuantity,
            },
          ]
        : undefined,
    };

    try {
      const created = await createOperation(payload);
      if (hasVehicleData) {
        const updateId = created.id ?? created.ctv ?? form.ctv;
        await updateOperation(updateId, payload);
      }
      const newId =
        (created.id ?? created.ctv ?? created.code ?? created.shipName ?? form.ctv) || 'nova-operacao';
      navigate(`/operations/${encodeURIComponent(String(newId))}`);
    } catch (error) {
      let message = 'Nao foi possivel criar a operacao. Tente novamente.';
      if ((error as any)?.isAxiosError) {
        const axiosErr = error as import('axios').AxiosError;
        const data = axiosErr.response?.data;
        if (typeof data === 'string' && data.trim()) {
          message = data;
        } else if (data && typeof data === 'object') {
          const candidate =
            (data as { message?: string; error?: string }).message ??
            (data as { message?: string; error?: string }).error;
          if (candidate) message = candidate;
        } else if (axiosErr.message) {
          message = axiosErr.message;
        }
        if (axiosErr.response?.status) {
          message = `[${axiosErr.response.status}] ${message}`;
        }
      } else if (error instanceof Error) {
        message = error.message;
      }
      console.error('Erro ao criar operacao', error);
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-app overflow-hidden md:h-screen">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Nova Operação</h1>
              <p className="text-sm text-[var(--muted)]">Cadastre uma nova operação portuária</p>
            </div>
            <div className="flex items-center gap-4">
              <div
                onClick={() => changePage('perfil')}
                className="hidden items-center gap-3 cursor-pointer rounded-lg px-4 py-2 transition-colors hover:bg-[var(--hover)] md:flex"
              >
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-6 overflow-auto"
          >
            <section className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">Informações da Operação</h2>
                <p className="text-sm text-[var(--muted)]">Preencha os campos abaixo</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Criar Operação'}
                </button>
              </div>
            </div>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[var(--text)]">Dados da Operação</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">CTV</label>
                  <input
                    type="text"
                    value={form.ctv}
                    onChange={(e) => setField('ctv', e.target.value)}
                    placeholder="CTV-12345/25"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Reserva</label>
                  <input
                    type="text"
                    value={form.reservation}
                    onChange={(e) => setField('reservation', e.target.value)}
                    placeholder="RES123"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Terminal</label>
                  <input
                    type="text"
                    value={form.terminal}
                    onChange={(e) => setField('terminal', e.target.value)}
                    placeholder="Terminal Portuario"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Exportador</label>
                  <input
                    type="text"
                    value={form.exporter}
                    onChange={(e) => setField('exporter', e.target.value)}
                    placeholder="Empresa Exportadora S.A."
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Destino</label>
                  <input
                    type="text"
                    value={form.destination}
                    onChange={(e) => setField('destination', e.target.value)}
                    placeholder="Porto / Pais"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Navio</label>
                  <input
                    type="text"
                    value={form.ship}
                    onChange={(e) => setField('ship', e.target.value)}
                    placeholder="MSC Fantasia"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Data de Chegada</label>
                  <input
                    type="date"
                    value={form.arrivalDate}
                    onChange={(e) => setField('arrivalDate', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Deadline Draft</label>
                  <input
                    type="date"
                    value={form.deadlineDraft}
                    onChange={(e) => setField('deadlineDraft', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Ref. Cliente</label>
                  <input
                    type="text"
                    value={form.refClient}
                    onChange={(e) => setField('refClient', e.target.value)}
                    placeholder="Referencia interna"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Deadline de Carregamento</label>
                  <input
                    type="date"
                    value={form.loadDeadline}
                    onChange={(e) => setField('loadDeadline', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h3 className="text-base font-semibold text-[var(--text)]">Veículo</h3>
              </div>
              <div className="grid grid-cols-1 gap-5 px-5 py-5 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Placa</label>
                  <input
                    type="text"
                    value={form.vehiclePlate}
                    onChange={(e) => setField('vehiclePlate', e.target.value)}
                    placeholder="ABC1D23"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Nota fiscal</label>
                  <input
                    type="text"
                    value={form.vehicleInvoice}
                    onChange={(e) => setField('vehicleInvoice', e.target.value)}
                    placeholder="NF-123456"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Quantidade de sacas</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.vehicleSacksQuantity}
                    onChange={(e) => setField('vehicleSacksQuantity', e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>
          </form>
        </main>
      </div>
    </div>
  );
};

export default NewOperation;
