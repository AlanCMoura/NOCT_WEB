import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import ContainerImageSection, { ImageItem as SectionImageItem } from '../components/ContainerImageSection';

interface User {
  name: string;
  role: string;
}

interface NewContainerForm {
  container: string;
  quantidade: string;
  tara: string;
  pesoBruto: string;
  pesoLiquido: string;
  lacreAgencia: string;
  lacreOutros: string;
  dataRetirada: string; // yyyy-mm-dd
  dataEstufagem: string; // yyyy-mm-dd
}

const NewContainer: React.FC = () => {
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : '';
  const navigate = useNavigate();
  const { changePage } = useSidebar();

  const user: User = {
    name: 'Carlos Oliveira',
    role: 'Administrador'
  };

  const [form, setForm] = useState<NewContainerForm>({
    container: '',
    quantidade: '',
    tara: '',
    pesoBruto: '',
    pesoLiquido: '',
    lacreAgencia: '',
    lacreOutros: '',
    dataRetirada: '',
    dataEstufagem: ''
  });

  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Seções de imagens do container
  const SECTION_TITLES = [
    'Vazio/Forrado',
    'Fiadas',
    'Meia Porta',
    'Lacrado/Fechado',
    'Lacre Principal',
    'Lacre Outros',
    'Cheio Aberto'
  ];

  const [imageSections, setImageSections] = useState<Record<string, SectionImageItem[]>>(
    () => SECTION_TITLES.reduce((acc, t) => { acc[t] = []; return acc; }, {} as Record<string, SectionImageItem[]>)
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, section: string): void => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setImageSections(prev => ({
        ...prev,
        [section]: [
          ...(prev[section] || []),
          ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
        ]
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return;
    const section = (e.target as HTMLInputElement).dataset.section || SECTION_TITLES[0];
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length) {
      setImageSections(prev => ({
        ...prev,
        [section]: [
          ...(prev[section] || []),
          ...files.map(file => ({ file, url: URL.createObjectURL(file) }))
        ]
      }));
    }
    e.target.value = '';
  };

  const handleSelectImages = (section: string): void => {
    if (fileInputRef.current) {
      (fileInputRef.current as HTMLInputElement).dataset.section = section;
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (section: string, index: number): void => {
    setImageSections(prev => {
      const list = [...(prev[section] || [])];
      const [removed] = list.splice(index, 1);
      if (removed?.file) URL.revokeObjectURL(removed.url);
      return { ...prev, [section]: list };
    });
  };

  const setField = (key: keyof NewContainerForm, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleCancel = () => {
    navigate(`/operations/${encodeURIComponent(decodedOperationId)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      const containerId = form.container || 'NEW-CONTAINER';
      setSaving(false);
      navigate(`/operations/${encodeURIComponent(decodedOperationId)}/containers/${encodeURIComponent(containerId)}`);
    }, 700);
  };

  // navegação via SidebarProvider; handler antigo removido

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Novo Container</h1>
              <p className="text-sm text-[var(--muted)]">Operação {decodedOperationId}</p>
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
          <form ref={formRef} onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Identificação (ex: ABCD 123456-1)</label>
                <input
                  type="text"
                  value={form.container}
                  onChange={(e) => setField('container', e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Quantidade</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantidade}
                  onChange={(e) => setField('quantidade', e.target.value)}
                  placeholder="01"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Tara (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={form.tara}
                  onChange={(e) => setField('tara', e.target.value)}
                  placeholder="1081"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Peso Bruto (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={form.pesoBruto}
                  onChange={(e) => setField('pesoBruto', e.target.value)}
                  placeholder="27081"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Peso Líquido (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={form.pesoLiquido}
                  onChange={(e) => setField('pesoLiquido', e.target.value)}
                  placeholder="27000"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Lacre Agência</label>
                <input
                  type="text"
                  value={form.lacreAgencia}
                  onChange={(e) => setField('lacreAgencia', e.target.value)}
                  placeholder="MQ45314"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Lacres Outros</label>
                <input
                  type="text"
                  value={form.lacreOutros}
                  onChange={(e) => setField('lacreOutros', e.target.value)}
                  placeholder="Múltiplos lacres"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Data Retirada do Terminal</label>
                <input
                  type="date"
                  value={form.dataRetirada}
                  onChange={(e) => setField('dataRetirada', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Data de Estufagem</label>
                <input
                  type="date"
                  value={form.dataEstufagem}
                  onChange={(e) => setField('dataEstufagem', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            
          </form>

          {/* Input oculto para upload de imagens */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* Seções de imagens */}
          <div className="mt-6">
            {SECTION_TITLES.map((title) => (
              <ContainerImageSection
                key={title}
                title={title}
                images={imageSections[title] || []}
                isEditing={true}
                startIndex={0}
                imagesPerView={5}
                onDrop={(e) => handleDrop(e, title)}
                onSelectImages={() => handleSelectImages(title)}
                onRemoveImage={(idx) => handleRemoveImage(title, idx)}
                onOpenModal={() => {}}
                onPrev={() => {}}
                onNext={() => {}}
                footerActions={
                  title === 'Cheio Aberto' ? (
                    <div className="flex gap-2">
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
                        className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-60"
                      >
                        {saving ? 'Salvando...' : 'Salvar Container'}
                      </button>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NewContainer;
