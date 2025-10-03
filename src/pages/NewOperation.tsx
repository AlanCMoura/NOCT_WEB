import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PageLoadingState from '../components/PageLoadingState';
import { useSidebar } from '../context/SidebarContext';
import usePageLoading from '../hooks/usePageLoading';
import ContainerImageSection, { ImageItem as SectionImageItem } from '../components/ContainerImageSection';

interface User {
  name: string;
  role: string;
}

interface NewOperationForm {
  amv: string;
  reserva: string;
  terminal: string;
  cliente: string;
  exportador: string;
  destino: string;
  navio: string;
  data: string; // yyyy-mm-dd
  deadlineDraft: string; // yyyy-mm-dd
  deadlineEntrega: string; // yyyy-mm-dd
}

const NewOperation: React.FC = () => {
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const loading = usePageLoading();

  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Administrador'
  };

  const [form, setForm] = useState<NewOperationForm>({
    amv: '',
    reserva: '',
    terminal: '',
    cliente: '',
    exportador: '',
    destino: '',
    navio: '',
    data: '',
    deadlineDraft: '',
    deadlineEntrega: ''
  });

  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Sacaria (upload de imagens na criaÃ§Ã£o)
  const [sacariaImages, setSacariaImages] = useState<SectionImageItem[]>([]);
  const [sacariaIndex, setSacariaIndex] = useState<number>(0);
  const SACARIA_PER_VIEW = 5;
  const sacariaInputRef = useRef<HTMLInputElement | null>(null);

  const handleSacariaDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setSacariaImages(prev => ([
        ...prev,
        ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
      ]));
    }
  };

  const handleSacariaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setSacariaImages(prev => ([
        ...prev,
        ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
      ]));
    }
    e.target.value = '';
  };

  const handleSelectSacaria = () => {
    sacariaInputRef.current?.click();
  };

  const handleRemoveSacariaImage = (index: number) => {
    setSacariaImages(prev => {
      const list = [...prev];
      const [removed] = list.splice(index, 1);
      if (removed?.file) URL.revokeObjectURL(removed.url);
      return list;
    });
  };

  const nextSacaria = () => {
    const maxIndex = Math.max(0, sacariaImages.length - SACARIA_PER_VIEW);
    setSacariaIndex(prev => Math.min(prev + SACARIA_PER_VIEW, maxIndex));
  };

  const prevSacaria = () => {
    setSacariaIndex(prev => Math.max(0, prev - SACARIA_PER_VIEW));
  };

  

  const setField = (key: keyof NewOperationForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCancel = () => {
    navigate('/operations');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Como ainda nÃ£o hÃ¡ backend, simulamos um save e redirecionamos
    setTimeout(() => {
      const id = form.amv || 'AMV-NOVA';
      setSaving(false);
      navigate(`/operations/${encodeURIComponent(id)}`);
    }, 700);
  };


  const renderSacariaSection = (loadingState: boolean) => (
    <div className="mt-6">
      <ContainerImageSection
        title="Sacaria"
        images={sacariaImages}
        isEditing={true}
        startIndex={sacariaIndex}
        imagesPerView={SACARIA_PER_VIEW}
        loading={loadingState}
        onDrop={handleSacariaDrop}
        onSelectImages={handleSelectSacaria}
        onRemoveImage={handleRemoveSacariaImage}
        onOpenModal={() => {}}
        onPrev={prevSacaria}
        onNext={nextSacaria}
        footerActions={
          <>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={saving}
              className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Criar Operação'}
            </button>
          </>
        }
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Nova Operação</h1>
              <p className="text-sm text-[var(--muted)]">Cadastre uma nova operação portuária</p>
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
          {loading ? (
            <div className="space-y-6">
              <PageLoadingState variant="form" sections={4} />
              {renderSacariaSection(true)}
            </div>
          ) : (
            <>
            <input
              ref={sacariaInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleSacariaUpload}
            />
            <form ref={formRef} onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6 space-y-6 overflow-auto">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">Informações da Operação</h2>
                <p className="text-sm text-[var(--muted)]">Preencha os campos abaixo</p>
              </div>
            
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">AMV</label>
                  <input
                    type="text"
                    value={form.amv}
                    onChange={(e) => setField('amv', e.target.value)}
                    placeholder="AMV-12345/25"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Reserva</label>
                  <input
                    type="text"
                    value={form.reserva}
                    onChange={(e) => setField('reserva', e.target.value)}
                    placeholder="COD123"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Terminal</label>
                  <input
                    type="text"
                    value={form.terminal}
                    onChange={(e) => setField('terminal', e.target.value)}
                    placeholder="Terminal Portuário"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Cliente</label>
                  <input
                    type="text"
                    value={form.cliente}
                    onChange={(e) => setField('cliente', e.target.value)}
                    placeholder="MSC"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Exportador</label>
                  <input
                    type="text"
                    value={form.exportador}
                    onChange={(e) => setField('exportador', e.target.value)}
                    placeholder="Empresa Exportadora S.A."
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Destino</label>
                  <input
                    type="text"
                    value={form.destino}
                    onChange={(e) => setField('destino', e.target.value)}
                    placeholder="Porto / País"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Navio</label>
                  <input
                    type="text"
                    value={form.navio}
                    onChange={(e) => setField('navio', e.target.value)}
                    placeholder="MSC Fantasia"
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setField('data', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Deadline Draft</label>
                  <input
                    type="date"
                    value={form.deadlineDraft}
                    onChange={(e) => setField('deadlineDraft', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text)] mb-2">Deadline de Entrega</label>
                  <input
                    type="date"
                    value={form.deadlineEntrega}
                    onChange={(e) => setField('deadlineEntrega', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
              </div>
            </form>
              {renderSacariaSection(false)}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default NewOperation;
