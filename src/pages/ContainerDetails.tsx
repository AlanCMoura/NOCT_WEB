import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ContainerImageSection, { ImageItem as SectionImageItem } from "../components/ContainerImageSection";
import { useSidebar } from "../context/SidebarContext";
import { useSessionUser } from "../context/AuthContext";
import {
  addImagesToContainer,
  completeContainerStatus,
  CONTAINER_IMAGE_SECTIONS,
  deleteContainer as deleteContainerApi,
  getAllContainerImages,
  getContainerById,
  mapApiCategoryToSectionKey,
  type ApiContainer,
  type ContainerImageCategoryKey,
  type ContainerImagesPayload,
  updateContainer,
} from "../services/containers";

type ImageSectionKey = ContainerImageCategoryKey;

interface EditForm {
  containerId: string;
  description: string;
  sacksCount: string;
  tareKg: string;
  liquidWeight: string;
  grossWeight: string;
  agencySeal: string;
  otherSeals: string;
}

const IMAGES_PER_VIEW = 5;

const emptyImages = (): Record<ImageSectionKey, SectionImageItem[]> =>
  CONTAINER_IMAGE_SECTIONS.reduce((acc, { key }) => {
    acc[key] = [];
    return acc;
  }, {} as Record<ImageSectionKey, SectionImageItem[]>);

const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-[var(--hover)] rounded ${className || ''}`} />
);

const cloneSections = (sections: Record<ImageSectionKey, SectionImageItem[]>) =>
  (Object.keys(sections) as ImageSectionKey[]).reduce((acc, key) => {
    acc[key] = [...(sections[key] || [])];
    return acc;
  }, {} as Record<ImageSectionKey, SectionImageItem[]>);

const revokeTempUrls = (sections: Record<ImageSectionKey, SectionImageItem[]>) => {
  (Object.values(sections) || []).forEach((items) =>
    items.forEach((item) => {
      if (item.file) {
        URL.revokeObjectURL(item.url);
      }
    })
  );
};

const mapContainerToForm = (container: ApiContainer): EditForm => ({
  containerId: container.containerId || "",
  description: container.description ?? "",
  sacksCount: container.sacksCount !== undefined ? String(container.sacksCount) : "",
  tareKg:
    container.tareTons !== undefined && container.tareTons !== null
      ? String(Math.round(container.tareTons * 1000))
      : "",
  liquidWeight: container.liquidWeight !== undefined ? String(container.liquidWeight) : "",
  grossWeight: container.grossWeight !== undefined ? String(container.grossWeight) : "",
  agencySeal: container.agencySeal ?? "",
  otherSeals: (container.otherSeals || []).filter(Boolean).join(", "),
});

const mapContainerImages = (container: ApiContainer): Record<ImageSectionKey, SectionImageItem[]> => {
  const sections = emptyImages();
  (container.containerImages || []).forEach((img) => {
    const key = mapApiCategoryToSectionKey(img.category);
    const url = img.signedUrl || img.imageUrl || img.url;
    if (key && url) {
      sections[key].push({ url });
    }
  });
  return sections;
};

const parseNumber = (value: string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const buildImagesPayload = (
  sections: Record<ImageSectionKey, SectionImageItem[]>,
  onlyNew = false
): ContainerImagesPayload => {
  const result: ContainerImagesPayload = {};
  CONTAINER_IMAGE_SECTIONS.forEach(({ key }) => {
    const files = (sections[key] || [])
      .filter((img) => (!onlyNew ? true : Boolean(img.file)))
      .map((img) => img.file)
      .filter(Boolean) as File[];
    if (files.length) {
      result[key] = files;
    }
  });
  return result;
};

const ContainerDetails: React.FC = () => {
  const { containerId, operationId } = useParams();
  const decodedContainerId = containerId ? decodeURIComponent(containerId) : "";
  const decodedOperationId = operationId ? decodeURIComponent(operationId) : "";
  const navigate = useNavigate();
  const { changePage } = useSidebar();
  const user = useSessionUser({ role: "Administrador" });

  const [form, setForm] = useState<EditForm>({
    containerId: "",
    description: "",
    sacksCount: "",
    tareKg: "",
    liquidWeight: "",
    grossWeight: "",
    agencySeal: "",
    otherSeals: "",
  });
  const [imageSections, setImageSections] = useState<Record<ImageSectionKey, SectionImageItem[]>>(emptyImages);
  const initialImagesRef = useRef<Record<ImageSectionKey, SectionImageItem[]>>(emptyImages());
  const [carouselIndex, setCarouselIndex] = useState<Partial<Record<ImageSectionKey, number>>>({});

  const [container, setContainer] = useState<ApiContainer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [imagesLoading, setImagesLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<{ section: ImageSectionKey; index: number } | null>(
    null
  );

  const isRequiredMissing = !form.containerId.trim() || !form.description.trim();

  useEffect(() => {
    if (!decodedContainerId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      setImagesLoading(true);
      try {
        const data = await getContainerById(decodedContainerId);
        setContainer(data);
        setForm(mapContainerToForm(data));

        let sections = mapContainerImages(data);
        const hasLocalImages = Object.values(sections).some((arr) => arr.length);
        if (!hasLocalImages) {
          const apiImages = await getAllContainerImages(decodedContainerId);
          sections = emptyImages();
          (Object.keys(apiImages) as ImageSectionKey[]).forEach((key) => {
            sections[key] = (apiImages[key] || []).map((url) => ({ url }));
          });
        }

        initialImagesRef.current = cloneSections(sections);
        setImageSections(sections);
      } catch (err) {
        const message = axios.isAxiosError(err)
          ? err.response?.data?.message || "Nao foi possivel carregar o container."
          : "Nao foi possivel carregar o container.";
        setError(message);
      } finally {
        setLoading(false);
        setImagesLoading(false);
      }
    };

    load();
  }, [decodedContainerId]);

  const handleChange = (key: keyof EditForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, section: ImageSectionKey): void => {
    e.preventDefault();
    if (!isEditing) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      setImageSections((prev) => ({
        ...prev,
        [section]: [...(prev[section] || []), ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))],
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!isEditing || !e.target.files) return;
    const section = ((e.target as HTMLInputElement).dataset.section as ImageSectionKey) || CONTAINER_IMAGE_SECTIONS[0].key;
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      setImageSections((prev) => ({
        ...prev,
        [section]: [...(prev[section] || []), ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))],
      }));
    }
    e.target.value = "";
  };

  const handleSelectImages = (section: ImageSectionKey): void => {
    if (!isEditing || !fileInputRef.current) return;
    fileInputRef.current.dataset.section = section;
    fileInputRef.current.click();
  };

  const handleRemoveImage = (section: ImageSectionKey, index: number): void => {
    if (!isEditing) return;
    setImageSections((prev) => {
      const list = [...(prev[section] || [])];
      const target = list[index];
      if (target && !target.file) {
        setError("A remoção de imagens existentes ainda não é suportada pela API.");
        return prev;
      }
      const removed = list.splice(index, 1);
      removed.forEach((item) => {
        if (item?.file) URL.revokeObjectURL(item.url);
      });
      return { ...prev, [section]: list };
    });
  };

  const handleOpenImage = (section: ImageSectionKey, index: number) => {
    setSelectedImageModal({ section, index });
  };

  const closeImageModal = () => setSelectedImageModal(null);

  const nextImageInModal = () => {
    setSelectedImageModal((current) => {
      if (!current) return current;
      const images = imageSections[current.section] || [];
      if (!images.length) return null;
      const nextIndex = (current.index + 1) % images.length;
      return { ...current, index: nextIndex };
    });
  };

  const prevImageInModal = () => {
    setSelectedImageModal((current) => {
      if (!current) return current;
      const images = imageSections[current.section] || [];
      if (!images.length) return null;
      const prevIndex = current.index === 0 ? images.length - 1 : current.index - 1;
      return { ...current, index: prevIndex };
    });
  };

  const resetEdits = () => {
    revokeTempUrls(imageSections);
    setImageSections(cloneSections(initialImagesRef.current));
    if (container) {
      setForm(mapContainerToForm(container));
    }
  };

  const handleCancel = (): void => {
    resetEdits();
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!decodedContainerId || saving || loading) return;
    setError(null);
    setSuccess(null);

    if (!form.containerId.trim() || !form.description.trim()) {
      setError("Preencha os campos obrigatórios.");
      return;
    }

    const otherSeals = form.otherSeals
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const imagesPayload = buildImagesPayload(imageSections, true);
    const hasNewImages = Object.values(imagesPayload).some((arr) => (arr?.length ?? 0) > 0);
    const hasAllCategories = CONTAINER_IMAGE_SECTIONS.every(({ key }) => (imageSections[key]?.length ?? 0) > 0);

    const payload = {
      description: form.description.trim(),
      sacksCount: parseNumber(form.sacksCount) ?? 0,
      tareTons: (() => {
        const kg = parseNumber(form.tareKg);
        return kg !== undefined ? kg / 1000 : 0;
      })(),
      liquidWeight: parseNumber(form.liquidWeight) ?? 0,
      grossWeight: parseNumber(form.grossWeight) ?? 0,
      agencySeal: form.agencySeal.trim(),
      otherSeals: otherSeals.length ? otherSeals : [""],
    };

    try {
      setSaving(true);
      setImagesLoading(true);
      await updateContainer(decodedContainerId, payload);
      if (hasNewImages) {
        await addImagesToContainer(decodedContainerId, imagesPayload, hasAllCategories);
      }
      const refreshed = await getContainerById(decodedContainerId);
      setContainer(refreshed);
      setForm(mapContainerToForm(refreshed));

      let refreshedImages = mapContainerImages(refreshed);
      const hasImages = Object.values(refreshedImages).some((arr) => arr.length);
      if (!hasImages) {
        const apiImages = await getAllContainerImages(decodedContainerId);
        refreshedImages = emptyImages();
        (Object.keys(apiImages) as ImageSectionKey[]).forEach((key) => {
          refreshedImages[key] = (apiImages[key] || []).map((url) => ({ url }));
        });
      }

      revokeTempUrls(imageSections);
      initialImagesRef.current = cloneSections(refreshedImages);
      setImageSections(refreshedImages);
      setIsEditing(false);
      setSuccess("Container atualizado com sucesso.");
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const data = err.response.data as { message?: string; errorId?: string };
        const base = data.message || "Nao foi possivel atualizar o container.";
        setError(data.errorId ? `${base} (ID: ${data.errorId})` : base);
      } else {
        const msg = err instanceof Error ? err.message : "Nao foi possivel atualizar o container.";
        setError(msg);
      }
    } finally {
      setSaving(false);
      setImagesLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!decodedContainerId || deleting || loading) return;
    const confirmed = window.confirm("Tem certeza que deseja excluir este container?");
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    try {
      setDeleting(true);
      await deleteContainerApi(decodedContainerId);
      navigate(`/operations/${encodeURIComponent(decodedOperationId)}`);
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Nao foi possivel excluir o container.";
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleCompleteStatus = async () => {
    if (!decodedContainerId || statusUpdating || loading) return;
    const missingSections = CONTAINER_IMAGE_SECTIONS.filter(({ key }) => (imageSections[key]?.length ?? 0) === 0).map(
      ({ label }) => label
    );
    if (missingSections.length) {
      setError(`Para finalizar, adicione pelo menos uma imagem em: ${missingSections.join(', ')}`);
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      setStatusUpdating(true);
      const updated = await completeContainerStatus(decodedContainerId);
      setContainer(updated);
      setSuccess("Status do container atualizado para FINALIZADO.");
    } catch (err) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Nao foi possivel atualizar o status do container.";
      setError(msg);
    } finally {
      setStatusUpdating(false);
    }
  };

  const nextImages = (section: ImageSectionKey): void => {
    const images = imageSections[section] || [];
    if (images.length <= IMAGES_PER_VIEW) return;
    setCarouselIndex((prev) => {
      const current = prev[section] ?? 0;
      const maxIndex = Math.max(0, images.length - IMAGES_PER_VIEW);
      const newIndex = Math.min(current + IMAGES_PER_VIEW, maxIndex);
      return { ...prev, [section]: newIndex };
    });
  };

  const prevImages = (section: ImageSectionKey): void => {
    setCarouselIndex((prev) => {
      const current = prev[section] ?? 0;
      const newIndex = Math.max(0, current - IMAGES_PER_VIEW);
      return { ...prev, [section]: newIndex };
    });
  };

  const statusBadge = (() => {
    const status = (container?.status || "").toString().toUpperCase();
    if (status.includes("COMPLETE") || status === "COMPLETED" || status === "FINALIZADO") {
      return { text: "Finalizado", className: "bg-green-100 text-green-800" };
    }
    if (status.includes("PEND") || status === "PENDING") {
      return { text: "Pendente", className: "bg-yellow-100 text-yellow-800" };
    }
    return { text: "Aberto", className: "bg-gray-200 text-gray-700" };
  })();

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-3">
                Container {decodedContainerId}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>
                  {statusBadge.text}
                </span>
              </h1>
              <p className="text-sm text-[var(--muted)]">Operacao {decodedOperationId}</p>
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

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success}</div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--text)]">Dados do Container</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
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
                      onClick={handleSave}
                      disabled={saving || isRequiredMissing}
                      className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-60"
                    >
                      {saving ? "Salvando..." : "Salvar alterações"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                      disabled={loading}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={handleCompleteStatus}
                      disabled={statusUpdating || loading}
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-60"
                    >
                      {statusUpdating ? "Atualizando..." : "Finalizar Status"}
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting || loading}
                      className="px-4 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-60"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? "Excluindo..." : "Excluir"}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => navigate(`/operations/${encodeURIComponent(decodedOperationId)}`)}
                  className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                >
                  Voltar
                </button>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={`skeleton-${idx}`} className="space-y-2">
                      <SkeletonBlock className="h-4 w-28" />
                      <SkeletonBlock className="h-10 w-full" />
                      <SkeletonBlock className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Identificacao</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.containerId}
                        disabled
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--hover)] text-[var(--muted)]"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.containerId || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Descricao</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        disabled={!isEditing || loading}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.description || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Quantidade de Sacas</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={form.sacksCount}
                        onChange={(e) => handleChange("sacksCount", e.target.value)}
                        disabled={!isEditing || loading}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.sacksCount || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Tara (kg)</label>
                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          value={form.tareKg}
                          onChange={(e) => handleChange("tareKg", e.target.value)}
                          disabled={!isEditing || loading}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                        />
                        <p className="text-xs text-[var(--muted)] mt-1">Enviamos em toneladas para a API automaticamente.</p>
                      </>
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.tareKg || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Peso Liquido (kg)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={form.liquidWeight}
                        onChange={(e) => handleChange("liquidWeight", e.target.value)}
                        disabled={!isEditing || loading}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.liquidWeight || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Peso Bruto (kg)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={form.grossWeight}
                        onChange={(e) => handleChange("grossWeight", e.target.value)}
                        disabled={!isEditing || loading}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.grossWeight || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Lacre Principal (agencia)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.agencySeal}
                        onChange={(e) => handleChange("agencySeal", e.target.value)}
                        disabled={!isEditing || loading}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.agencySeal || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text)] mb-1">Outros Lacres (separados por virgula)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.otherSeals}
                        onChange={(e) => handleChange("otherSeals", e.target.value)}
                        disabled={!isEditing || loading}
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.otherSeals || "-"}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {CONTAINER_IMAGE_SECTIONS.map(({ key, label }) => (
              <ContainerImageSection
                key={key}
                title={label}
                images={imageSections[key] || []}
                isEditing={isEditing}
                startIndex={carouselIndex[key] ?? 0}
                imagesPerView={IMAGES_PER_VIEW}
                onDrop={(e) => handleDrop(e, key)}
                onSelectImages={() => handleSelectImages(key)}
                onRemoveImage={(idx) => handleRemoveImage(key, idx)}
                onOpenModal={(idx) => handleOpenImage(key, idx)}
                onPrev={() => prevImages(key)}
                onNext={() => nextImages(key)}
                footerActions={
                  key === "lacresOutros" ? (
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || isRequiredMissing || loading}
                            className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-60"
                          >
                            {saving ? "Salvando..." : "Salvar Container"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>

          {selectedImageModal &&
            typeof document !== "undefined" &&
            createPortal(
              (() => {
                const modalImages = imageSections[selectedImageModal.section] || [];
                if (!modalImages.length) return null;
                const safeIndex = Math.min(selectedImageModal.index, modalImages.length - 1);
                const currentImage = modalImages[safeIndex];
                if (!currentImage) return null;
                const sectionLabel =
                  CONTAINER_IMAGE_SECTIONS.find((s) => s.key === selectedImageModal.section)?.label || "";

                return (
                  <div
                    className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] bg-black/90 flex items-center justify-center p-4 md:p-8 overflow-auto"
                    onClick={closeImageModal}
                  >
                    <div className="relative w-full h-full flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeImageModal();
                        }}
                        className="absolute top-4 right-4 text-white hover:text-gray-200 bg-black/60 rounded-full p-2"
                        aria-label="Fechar imagem"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {modalImages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            prevImageInModal();
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 bg-black/60 rounded-full p-3"
                          aria-label="Imagem anterior"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}

                      <img
                        src={currentImage.url}
                        alt={`${sectionLabel} - imagem ${safeIndex + 1}`}
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                      />

                      {modalImages.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            nextImageInModal();
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 bg-black/60 rounded-full p-3"
                          aria-label="Próxima imagem"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}

                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-center bg-black/60 rounded-lg px-4 py-2">
                        <p className="text-sm font-medium">{sectionLabel}</p>
                        <p className="text-xs opacity-80">
                          {safeIndex + 1} de {modalImages.length}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })(),
              document.body
            )}
        </main>
      </div>
    </div>
  );
};

export default ContainerDetails;
