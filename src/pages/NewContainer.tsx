import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../context/SidebarContext";
import { useSessionUser } from "../context/AuthContext";
import ContainerImageSection, { ImageItem as SectionImageItem } from "../components/ContainerImageSection";
import { getOperationById } from "../services/operations";
import {
  CONTAINER_IMAGE_SECTIONS,
  type ContainerImageCategoryKey,
  createContainer,
  type ContainerImagesPayload,
} from "../services/containers";

type ImageSectionKey = ContainerImageCategoryKey;
const IMAGE_SECTIONS = CONTAINER_IMAGE_SECTIONS;
const IMAGES_PER_VIEW = 3;
const makeLocalId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const mergeSectionImages = (
  current: SectionImageItem[],
  incoming: SectionImageItem[]
): SectionImageItem[] => {
  const result: SectionImageItem[] = [];
  const seen = new Set<string>();
  const makeKey = (item: SectionImageItem) => {
    if (item.file) {
      return `${item.file.name}-${item.file.size}-${item.file.lastModified}`;
    }
    if (item.localId) return String(item.localId);
    return String(item.url);
  };
  const addItem = (item: SectionImageItem) => {
    const key = makeKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  };
  current.forEach(addItem);
  incoming.forEach(addItem);
  return result;
};

interface NewContainerForm {
  container: string;
  descricao: string;
  quantidade: string;
  taraKg: string;
  pesoBruto: string;
  pesoLiquido: string;
  lacreAgencia: string;
  lacreOutros: string;
  dataRetirada: string;
  dataEstufagem: string;
}

const emptyImages = (): Record<ImageSectionKey, SectionImageItem[]> =>
  IMAGE_SECTIONS.reduce((acc, { key }) => {
    acc[key] = [];
    return acc;
  }, {} as Record<ImageSectionKey, SectionImageItem[]>);

const NewContainer: React.FC = () => {
  const { operationId } = useParams();
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : "";
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: "Administrador" });
  const [operationCtv, setOperationCtv] = useState<string>("");

  const [form, setForm] = useState<NewContainerForm>({
    container: "",
    descricao: "",
    quantidade: "",
    taraKg: "",
    pesoBruto: "",
    pesoLiquido: "",
    lacreAgencia: "",
    lacreOutros: "",
    dataRetirada: "",
    dataEstufagem: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [imageSections, setImageSections] = useState<Record<ImageSectionKey, SectionImageItem[]>>(emptyImages);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRequiredMissing = !form.container.trim() || !form.descricao.trim();
  const [carouselIndex, setCarouselIndex] = useState<Record<ImageSectionKey, number>>(() =>
    IMAGE_SECTIONS.reduce((acc, { key }) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<ImageSectionKey, number>)
  );

  const setField = (key: keyof NewContainerForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, section: ImageSectionKey): void => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      setImageSections((prev) => ({
        ...prev,
        [section]: mergeSectionImages(
          prev[section] || [],
          files.map((file) => ({ localId: makeLocalId(), file, url: URL.createObjectURL(file) }))
        ),
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!e.target.files) return;
    const section = ((e.target as HTMLInputElement).dataset.section as ImageSectionKey) || IMAGE_SECTIONS[0].key;
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      setImageSections((prev) => ({
        ...prev,
        [section]: mergeSectionImages(
          prev[section] || [],
          files.map((file) => ({ localId: makeLocalId(), file, url: URL.createObjectURL(file) }))
        ),
      }));
    }
    e.target.value = "";
  };

  const handleSelectImages = (section: ImageSectionKey): void => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.section = section;
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = (section: ImageSectionKey, index: number): void => {
    setImageSections((prev) => {
      const list = [...(prev[section] || [])];
      const [removed] = list.splice(index, 1);
      if (removed?.file) URL.revokeObjectURL(removed.url);
      return { ...prev, [section]: list };
    });
  };

  const nextImages = (section: ImageSectionKey): void => {
    setCarouselIndex((prev) => {
      const list = imageSections[section] || [];
      const maxIndex = Math.max(0, list.length - IMAGES_PER_VIEW);
      const current = prev[section] ?? 0;
      const next = Math.min(current + IMAGES_PER_VIEW, maxIndex);
      if (next === current) return prev;
      return { ...prev, [section]: next };
    });
  };

  const prevImages = (section: ImageSectionKey): void => {
    setCarouselIndex((prev) => {
      const current = prev[section] ?? 0;
      const next = Math.max(0, current - IMAGES_PER_VIEW);
      if (next === current) return prev;
      return { ...prev, [section]: next };
    });
  };

  useEffect(() => {
    setCarouselIndex((prev) => {
      let changed = false;
      const nextMap: Record<ImageSectionKey, number> = { ...prev };
      IMAGE_SECTIONS.forEach(({ key }) => {
        const list = imageSections[key] || [];
        const maxIndex = Math.max(0, list.length - IMAGES_PER_VIEW);
        const current = prev[key] ?? 0;
        const clamped = Math.min(current, maxIndex);
        if (clamped !== current) {
          nextMap[key] = clamped;
          changed = true;
        }
      });
      return changed ? nextMap : prev;
    });
  }, [imageSections]);

  useEffect(() => {
    let active = true;
    const loadOperation = async () => {
      if (!decodedOperationId) {
        setOperationCtv("");
        return;
      }
      try {
        const op = await getOperationById(decodedOperationId);
        if (!active) return;
        const ctv = String(
          op.ctv ??
            op.amv ??
            op.code ??
            op.booking ??
            op.bookingCode ??
            op.reserva ??
            op.reservation ??
            decodedOperationId
        );
        setOperationCtv(ctv);
      } catch {
        if (active) setOperationCtv(decodedOperationId);
      }
    };
    loadOperation();
    return () => {
      active = false;
    };
  }, [decodedOperationId]);

  const parseNumber = (value: string): number | undefined => {
    if (value === undefined || value === null || value === "") return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const buildImagesPayload = (sections: Record<ImageSectionKey, SectionImageItem[]>): ContainerImagesPayload => {
    const result: ContainerImagesPayload = {};
    IMAGE_SECTIONS.forEach(({ key }) => {
      const files = (sections[key] || [])
        .map((img) => img.file)
        .filter(Boolean) as File[];
      if (files.length) {
        result[key] = files;
      }
    });
    return result;
  };

  const handleCancel = () => {
    navigate(`/operations/${encodeURIComponent(decodedOperationId)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSuccess(null);

    if (!decodedOperationId) {
      setError("Operacao nao encontrada para criar container.");
      return;
    }

    const numericOperation = Number(decodedOperationId);
    if (!Number.isFinite(numericOperation)) {
      setError("ID da operacao invalido para criar container.");
      return;
    }

    if (!form.container.trim()) {
      setError("Informe o identificador do container.");
      return;
    }

    if (!form.descricao.trim()) {
      setError("Informe a descricao do container.");
      return;
    }

    const otherSeals = form.lacreOutros
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const imagesPayload = buildImagesPayload(imageSections);

    const payload = {
      containerId: form.container.trim(),
      description: form.descricao.trim(),
      operationId: numericOperation,
      sacksCount: parseNumber(form.quantidade) ?? 0,
      tareTons: (() => {
        const kg = parseNumber(form.taraKg);
        return kg !== undefined ? kg / 1000 : 0;
      })(),
      liquidWeight: parseNumber(form.pesoLiquido) ?? 0,
      grossWeight: parseNumber(form.pesoBruto) ?? 0,
      agencySeal: form.lacreAgencia || '',
      otherSeals: otherSeals.length ? otherSeals : [],
      images: imagesPayload,
    };

    try {
      setSaving(true);
      const created = await createContainer(payload);
      const nextContainerId = created.containerId || payload.containerId || String(created.id ?? '');
      setSuccess("Container criado com sucesso.");
      navigate(
        `/operations/${encodeURIComponent(decodedOperationId)}/containers/${encodeURIComponent(nextContainerId)}`
      );
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as { message?: string; errorId?: string };
        const base = data.message || "Nao foi possivel criar o container.";
        setError(data.errorId ? `${base} (ID: ${data.errorId})` : base);
      } else {
        const msg = err instanceof Error ? err.message : "Nao foi possivel criar o container.";
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-app">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)]">Novo Container</h1>
              <p className="text-sm text-[var(--muted)]">Operacao {operationCtv || decodedOperationId}</p>
            </div>
            <div className="flex items-center gap-4">
              <div
                onClick={() => changePage("perfil")}
                className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors"
              >
                <div className="text-right">
                  <div className="text-sm font-medium text-[var(--text)]">{user.name}</div>
                  <div className="text-xs text-[var(--muted)]">{user.role}</div>
                </div>
                <div className="w-11 h-11 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              {success}
            </div>
          )}

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] p-6 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Identificacao (ex: CONT123456)
                </label>
                <input
                  type="text"
                  value={form.container}
                  onChange={(e) => setField("container", e.target.value)}
                  placeholder="CONT123456"
                  aria-required
                  aria-invalid={isRequiredMissing && !form.container.trim()}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Descricao</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => setField("descricao", e.target.value)}
                  placeholder="Estufagem de acucar VHP"
                  aria-required
                  aria-invalid={isRequiredMissing && !form.descricao.trim()}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Quantidade de Sacas</label>
                <input
                  type="number"
                  min="0"
                  value={form.quantidade}
                  onChange={(e) => setField("quantidade", e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Tara (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={form.taraKg}
                  onChange={(e) => setField("taraKg", e.target.value)}
                  placeholder="2500"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-xs text-[var(--muted)] mt-1">Enviamos em toneladas para a API automaticamente.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Peso Liquido (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={form.pesoLiquido}
                  onChange={(e) => setField("pesoLiquido", e.target.value)}
                  placeholder="25000"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Peso Bruto (kg)</label>
                <input
                  type="number"
                  min="0"
                  value={form.pesoBruto}
                  onChange={(e) => setField("pesoBruto", e.target.value)}
                  placeholder="27500"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Lacre Principal (agencia)</label>
                <input
                  type="text"
                  value={form.lacreAgencia}
                  onChange={(e) => setField("lacreAgencia", e.target.value)}
                  placeholder="SEAL-ABC-123"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Outros Lacres (separados por virgula)</label>
                <input
                  type="text"
                  value={form.lacreOutros}
                  onChange={(e) => setField("lacreOutros", e.target.value)}
                  placeholder="SEAL-001, SEAL-002"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Data Retirada do Terminal</label>
                <input
                  type="date"
                  value={form.dataRetirada}
                  onChange={(e) => setField("dataRetirada", e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Data de Estufagem</label>
                <input
                  type="date"
                  value={form.dataEstufagem}
                  onChange={(e) => setField("dataEstufagem", e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </form>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="space-y-6">
            {IMAGE_SECTIONS.map(({ key, label }) => (
              <ContainerImageSection
                key={key}
            title={label}
            images={imageSections[key] || []}
            isEditing={true}
            startIndex={carouselIndex[key] ?? 0}
            imagesPerView={IMAGES_PER_VIEW}
            onDrop={(e) => handleDrop(e, key)}
            onSelectImages={() => handleSelectImages(key)}
            onRemoveImage={(idx) => handleRemoveImage(key, idx)}
            onOpenModal={() => {}}
            onPrev={() => prevImages(key)}
            onNext={() => nextImages(key)}
            footerActions={
              key === "lacresOutros" ? (
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
                        disabled={saving || isRequiredMissing}
                        className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-60"
                      >
                        {saving ? "Salvando..." : "Salvar Container"}
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
