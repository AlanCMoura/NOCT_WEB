import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, Download } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ContainerImageSection, { ImageItem as SectionImageItem } from "../components/ContainerImageSection";
import ToggleSwitch from "../components/ToggleSwitch";
import { useSidebar } from "../context/SidebarContext";
import { useSessionUser } from "../context/AuthContext";
import { getOperationById, type ApiOperation } from "../services/operations";
import {
  addImagesToContainer,
  completeContainerStatus,
  CONTAINER_IMAGE_SECTIONS,
  deleteContainer as deleteContainerApi,
  deleteContainerImage as deleteContainerImageApi,
  getAllContainerImages,
  getContainerById,
  mapApiCategoryToSectionKey,
  type ApiContainer,
  type ContainerImageCategoryKey,
  type ContainerImagesPayload,
  updateContainer,
} from "../services/containers";
import { LOGO_DATA_URI } from "../utils/logoDataUri";

type ImageSectionKey = ContainerImageCategoryKey;
type SectionImageWithId = SectionImageItem & { id?: number; localId?: string | number };

interface EditForm {
  containerId: string;
  description: string;
  sacksCount: string;
  tareKg: string;
  liquidWeight: string;
  grossWeight: string;
  agencySeal: string;
  otherSeals: string;
  dataRetirada: string;
  dataEstufagem: string;
}

const IMAGES_PER_VIEW = 3;
const REQUIRED_IMAGE_SECTIONS = CONTAINER_IMAGE_SECTIONS.filter(({ key }) => key !== "lacresOutros");
const makeLocalId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const mergeSectionImages = (
  current: SectionImageWithId[],
  incoming: SectionImageWithId[]
): SectionImageWithId[] => {
  const result: SectionImageWithId[] = [];
  const seen = new Set<string>();
  const makeKey = (item: SectionImageWithId) => {
    if (item.file) return `${item.file.name}-${item.file.size}-${item.file.lastModified}`;
    if (item.id !== undefined && item.id !== null) return `id-${item.id}`;
    if (item.localId) return String(item.localId);
    return String(item.url);
  };
  const addItem = (item: SectionImageWithId) => {
    const key = makeKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  };
  current.forEach(addItem);
  incoming.forEach(addItem);
  return result;
};

const emptyImages = (): Record<ImageSectionKey, SectionImageWithId[]> =>
  CONTAINER_IMAGE_SECTIONS.reduce((acc, { key }) => {
    acc[key] = [];
    return acc;
  }, {} as Record<ImageSectionKey, SectionImageWithId[]>);

const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div 
    className={`animate-pulse bg-[var(--hover)] rounded ${className || ''}`} 
    role="status"
    aria-label="Carregando..."
  />
);

const cloneSections = (sections: Record<ImageSectionKey, SectionImageWithId[]>) =>
  (Object.keys(sections) as ImageSectionKey[]).reduce((acc, key) => {
    acc[key] = [...(sections[key] || [])];
    return acc;
  }, {} as Record<ImageSectionKey, SectionImageWithId[]>);

/**
 * CORREÃ‡ÃƒO 1: Função centralizada para revogar URLs temporárias
 * Evita memory leaks ao limpar todas as URLs criadas com createObjectURL
 */
const revokeTempUrls = (sections: Record<ImageSectionKey, SectionImageWithId[]>) => {
  Object.values(sections).forEach((items) => {
    if (!items) return;
    items.forEach((item) => {
      if (item.file && item.url) {
        try {
          URL.revokeObjectURL(item.url);
        } catch {
          // Ignora erros se a URL jÃ¡ foi revogada
        }
      }
    });
  });
};

const mapContainerToForm = (container: ApiContainer): EditForm => ({
  containerId: container.ctvId || container.containerId || "",
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
  dataRetirada: toDateInput(container.dataRetirada),
  dataEstufagem: toDateInput(container.dataEstufagem),
});

const mapContainerImages = (container: ApiContainer): Record<ImageSectionKey, SectionImageWithId[]> => {
  const sections = emptyImages();
  (container.containerImages || []).forEach((img) => {
    const key = mapApiCategoryToSectionKey(img.category);
    const url = img.signedUrl || img.imageUrl || img.url;
    if (key && url) {
      sections[key].push({ url, localId: img.id ?? url, id: img.id });
    }
  });
  return sections;
};

const toDateInput = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  return value.length >= 10 ? value.slice(0, 10) : value;
};

const parseNumber = (value: string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const buildImagesPayload = (
  sections: Record<ImageSectionKey, SectionImageWithId[]>,
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

/**
 * CORREÃ‡ÃƒO 5: Helper para extrair mensagem de erro de forma type-safe
 */
const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errorId?: string } | undefined;
    if (data?.message) {
      return data.errorId ? `${data.message} (ID: ${data.errorId})` : data.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return defaultMessage;
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
    dataRetirada: "",
    dataEstufagem: "",
  });
  const [imageSections, setImageSections] = useState<Record<ImageSectionKey, SectionImageWithId[]>>(emptyImages);
  const initialImagesRef = useRef<Record<ImageSectionKey, SectionImageWithId[]>>(emptyImages());
  const [carouselIndex, setCarouselIndex] = useState<Partial<Record<ImageSectionKey, number>>>({});

  const [container, setContainer] = useState<ApiContainer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImageModal, setSelectedImageModal] = useState<{ section: ImageSectionKey; index: number } | null>(
    null
  );
  const [headerStatusLoading, setHeaderStatusLoading] = useState<boolean>(false);
  const [operationCtv, setOperationCtv] = useState<string>("");
  const [operationLabelLoading, setOperationLabelLoading] = useState<boolean>(true);
  const containerLabel = container?.ctvId || container?.containerId || '-';
  /**
   * CORREÃ‡ÃƒO 7: Ref para prevenir submissÃµes duplicadas
   */
  const isSavingRef = useRef<boolean>(false);

  const isRequiredMissing = !form.containerId.trim() || !form.description.trim();
  const hasContainer = !!container;

  /**
   * Helper: busca URLs por categoria e mescla preservando IDs (necessÃ¡rios para DELETE)
   */
  const populateSectionsWithUrls = async (
    containerKey: string,
    baseSections: Record<ImageSectionKey, SectionImageWithId[]>,
    signal?: AbortSignal
  ): Promise<Record<ImageSectionKey, SectionImageWithId[]>> => {
    let sections = cloneSections(baseSections);
    try {
      const apiImages = await getAllContainerImages(containerKey);
      if (signal?.aborted) return sections;

      (Object.keys(apiImages) as ImageSectionKey[]).forEach((key) => {
        const existing = [...(sections[key] || [])];
        const imgs = apiImages[key] || [];

        // Preenche URLs ausentes nos itens existentes (mantendo IDs)
        let idx = 0;
        const filled = existing.map((item) => {
          if (!item.url && idx < imgs.length) {
            const dto = imgs[idx++];
            return {
              ...item,
              url: dto.signedUrl || dto.url || dto.imageUrl || item.url,
              id: item.id ?? dto.id,
              localId: item.localId ?? dto.id ?? `${key}-${idx}-${dto.url || dto.imageUrl || ""}`,
            };
          }
          return item;
        });

        // Cria itens apenas com URL para o restante
        const remaining = imgs.slice(idx).map((dto, extraIdx) => ({
          url: dto.signedUrl || dto.url || dto.imageUrl || "",
          id: dto.id,
          localId: dto.id ?? `${key}-${idx + extraIdx}-${dto.url || dto.imageUrl || ""}`,
        })).filter((item) => !!item.url);

        sections[key] = mergeSectionImages(filled, remaining);
      });
    } catch {
      // silÃªncio: se falhar, devolve o que jÃ¡ temos
    }
    return sections;
  };

  /**
   * CORREÃ‡ÃƒO 2: useEffect com cleanup para revogar URLs ao desmontar
   */
  useEffect(() => {
    return () => {
      // Cleanup: revoga todas as URLs temporÃ¡rias quando o componente desmonta
      revokeTempUrls(imageSections);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!decodedContainerId) return;

    const abortController = new AbortController();

    const loadOperation = async () => {
      if (!decodedOperationId) {
        setOperationCtv("");
        setOperationLabelLoading(false);
        return;
      }
      setOperationLabelLoading(true);
      try {
        const op: ApiOperation = await getOperationById(decodedOperationId);
        if (abortController.signal.aborted) return;
        const ctv = String(
          op.ctv ??
          op.amv ??
          op.ship ??
          op.code ??
          op.booking ??
          op.bookingCode ??
          op.reserva ??
          op.reservation ??
          op.id ??
          decodedOperationId
        );
        setOperationCtv(ctv);
      } catch {
        // falha silenciosa no header
      } finally {
        if (!abortController.signal.aborted) {
          setOperationLabelLoading(false);
        }
      }
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await getContainerById(decodedContainerId);
        
        if (abortController.signal.aborted) return;
        
        setContainer(data);
        setForm(mapContainerToForm(data));

        let sections = mapContainerImages(data);
        sections = await populateSectionsWithUrls(decodedContainerId, sections, abortController.signal);

        initialImagesRef.current = cloneSections(sections);
        setImageSections(sections);
      } catch (err) {
        if (abortController.signal.aborted) return;
        setError(getErrorMessage(err, "Nao foi possivel carregar o container."));
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();
    loadOperation();
    
    return () => {
      abortController.abort();
    };
  }, [decodedContainerId, decodedOperationId]);

  const handleChange = useCallback((key: keyof EditForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, section: ImageSectionKey): void => {
    e.preventDefault();
    if (!isEditing) return;
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
  }, [isEditing]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!isEditing || !e.target.files) return;
    const section = ((e.target as HTMLInputElement).dataset.section as ImageSectionKey) || CONTAINER_IMAGE_SECTIONS[0].key;
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
  }, [isEditing]);

  const handleSelectImages = useCallback((section: ImageSectionKey): void => {
    if (!isEditing || !fileInputRef.current) return;
    fileInputRef.current.dataset.section = section;
    fileInputRef.current.click();
  }, [isEditing]);

  const handleRemoveImage = useCallback((section: ImageSectionKey, index: number): void => {
    if (!isEditing) return;
    
    setImageSections((prev) => {
      const list = [...(prev[section] || [])];
      const target = list[index];
      
      if (!target) return prev;

      // Marca para exclusão no servidor se tiver ID
      if (target.id !== undefined && target.id !== null) {
        setPendingDeleteIds((prevIds) => 
          prevIds.includes(target.id!) ? prevIds : [...prevIds, target.id!]
        );
      }

      // Remove da lista e revoga URL se necessÃ¡rio
      const removed = list.splice(index, 1);
      removed.forEach((item) => {
        if (item?.file && item.url) {
          try {
            URL.revokeObjectURL(item.url);
          } catch {
            // Ignora se jÃ¡ foi revogada
          }
        }
      });
      
      return { ...prev, [section]: list };
    });

    /**
     * CORREÃ‡ÃƒO 6: Fecha o modal se a imagem removida estava sendo visualizada
     */
    setSelectedImageModal((current) => {
      if (!current) return current;
      if (current.section === section && current.index >= index) {
        // Se a imagem atual ou posterior foi removida, ajusta ou fecha
        const newList = imageSections[section]?.filter((_, i) => i !== index) || [];
        if (newList.length === 0) return null;
        const newIndex = current.index >= newList.length ? newList.length - 1 : current.index;
        return { ...current, index: Math.max(0, newIndex) };
      }
      return current;
    });
  }, [isEditing, imageSections]);

  const handleOpenImage = useCallback((section: ImageSectionKey, index: number) => {
    setSelectedImageModal({ section, index });
  }, []);

  const closeImageModal = useCallback(() => setSelectedImageModal(null), []);

  const nextImageInModal = useCallback(() => {
    setSelectedImageModal((current) => {
      if (!current) return current;
      const images = imageSections[current.section] || [];
      if (!images.length) return null;
      const nextIndex = (current.index + 1) % images.length;
      return { ...current, index: nextIndex };
    });
  }, [imageSections]);

  const prevImageInModal = useCallback(() => {
    setSelectedImageModal((current) => {
      if (!current) return current;
      const images = imageSections[current.section] || [];
      if (!images.length) return null;
      const prevIndex = current.index === 0 ? images.length - 1 : current.index - 1;
      return { ...current, index: prevIndex };
    });
  }, [imageSections]);

  const resetEdits = useCallback(() => {
    revokeTempUrls(imageSections);
    setImageSections(cloneSections(initialImagesRef.current));
    if (container) {
      setForm(mapContainerToForm(container));
    }
    setPendingDeleteIds([]);
  }, [imageSections, container]);

  const handleCancel = useCallback((): void => {
    resetEdits();
    setPendingDeleteIds([]);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  }, [resetEdits]);

  /**
   * CORREÃ‡ÃƒO 7: Função de salvamento com proteção contra submissões duplicadas
   */
  const handleSave = useCallback(async () => {
    // Previne submissões duplicadas
    if (!decodedContainerId || saving || loading || isSavingRef.current) return;
    
    isSavingRef.current = true;
    setError(null);
    setSuccess(null);

    if (!form.containerId.trim() || !form.description.trim()) {
      setError("Preencha os campos obrigatÃ³rios.");
      isSavingRef.current = false;
      return;
    }

    const otherSeals = form.otherSeals
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const imagesPayload = buildImagesPayload(imageSections, true);
    const hasNewImages = Object.values(imagesPayload).some((arr) => (arr?.length ?? 0) > 0);
    const hasAllCategories = REQUIRED_IMAGE_SECTIONS.every(({ key }) => (imageSections[key]?.length ?? 0) > 0);

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
      otherSeals: otherSeals.length ? otherSeals : [],
      dataRetirada: form.dataRetirada || undefined,
      dataEstufagem: form.dataEstufagem || undefined,
    };

    try {
      setSaving(true);

      // Processa exclusÃµes pendentes
      if (pendingDeleteIds.length) {
        const errors: string[] = [];
        const deletions = await Promise.all(
          pendingDeleteIds.map(async (imgId) => {
            try {
              await deleteContainerImageApi(decodedContainerId, imgId);
              return { id: imgId, ok: true };
            } catch (err) {
              const msg = err instanceof Error ? err.message : `Erro ao excluir imagem ID ${imgId}`;
              errors.push(msg);
              return { id: imgId, ok: false };
            }
          })
        );
        
        const failed = deletions.filter((d) => !d.ok).map((d) => d.id);
        if (failed.length) {
          setError(`Falha ao excluir ${failed.length} imagem(ns): ${errors.join("; ")}`);
          setPendingDeleteIds(failed);

          // Recarrega o container para sincronizar
          const refreshedContainer = await getContainerById(decodedContainerId);
          setContainer(refreshedContainer);
          const restoredBase = mapContainerImages(refreshedContainer);
          const restored = await populateSectionsWithUrls(decodedContainerId, restoredBase);

          setImageSections((prev) => {
            const merged: Record<ImageSectionKey, SectionImageWithId[]> = { ...restored };
            (Object.keys(restored) as ImageSectionKey[]).forEach((key) => {
              const locals = (prev[key] || []).filter((img) => !!img.file);
              merged[key] = mergeSectionImages(restored[key] || [], locals);
            });
            return merged;
          });
          
          setSaving(false);
          isSavingRef.current = false;
          return;
        }
        setPendingDeleteIds([]);
      }

      await updateContainer(decodedContainerId, payload);
      
      if (hasNewImages) {
        await addImagesToContainer(decodedContainerId, imagesPayload, hasAllCategories);
      }
      
      const refreshed = await getContainerById(decodedContainerId);
      setContainer(refreshed);
      setForm(mapContainerToForm(refreshed));

      let refreshedImages = mapContainerImages(refreshed);
      refreshedImages = await populateSectionsWithUrls(decodedContainerId, refreshedImages);

      revokeTempUrls(imageSections);
      initialImagesRef.current = cloneSections(refreshedImages);
      setImageSections(refreshedImages);
      setPendingDeleteIds([]);
      setIsEditing(false);
      setSuccess("Container atualizado com sucesso.");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível atualizar o container."));
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }, [decodedContainerId, saving, loading, form, imageSections, pendingDeleteIds]);

  const handleDelete = useCallback(async () => {
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
      setError(getErrorMessage(err, "Não foi possível excluir o container."));
    } finally {
      setDeleting(false);
    }
  }, [decodedContainerId, decodedOperationId, deleting, loading, navigate]);

  const nextImages = useCallback((section: ImageSectionKey): void => {
    const images = imageSections[section] || [];
    if (images.length <= IMAGES_PER_VIEW) return;
    setCarouselIndex((prev) => {
      const current = prev[section] ?? 0;
      const maxIndex = Math.max(0, images.length - IMAGES_PER_VIEW);
      const newIndex = Math.min(current + IMAGES_PER_VIEW, maxIndex);
      return { ...prev, [section]: newIndex };
    });
  }, [imageSections]);

  const prevImages = useCallback((section: ImageSectionKey): void => {
    setCarouselIndex((prev) => {
      const current = prev[section] ?? 0;
      const newIndex = Math.max(0, current - IMAGES_PER_VIEW);
      return { ...prev, [section]: newIndex };
    });
  }, []);

  const handleToggleStatus = useCallback(
    async (checked: boolean) => {
      if (!decodedContainerId || loading || statusUpdating || headerStatusLoading) return;
      // Somente permite finalizar; reabrir nï¿½o estï¿½ disponï¿½vel no front
      if (!checked) return;
      setError(null);
      setSuccess(null);
      setHeaderStatusLoading(true);
      setStatusUpdating(true);
      try {
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
        setHeaderStatusLoading(false);
        setStatusUpdating(false);
      }
    },
    [decodedContainerId, loading, statusUpdating, headerStatusLoading]
  );

  const statusBadge = (() => {
    const statusRaw = (container?.status ?? "").toString().toUpperCase();
    if (statusRaw.includes("COMPLETE") || statusRaw === "COMPLETED" || statusRaw.includes("FINAL")) {
      return { text: "Finalizado", className: "bg-green-100 text-green-800" };
    }
    if (statusRaw.includes("PEND") || statusRaw === "PENDING") {
      return { text: "Parcial", className: "bg-yellow-100 text-yellow-800" };
    }
    return { text: "Nao inicializado", className: "bg-gray-200 text-gray-700" };
  })();
  const isContainerFinalized = statusBadge.text === "Finalizado";

  const exportPdf = () => {
    if (!container) {
      window.alert("Nenhum container carregado para exportar.");
      return;
    }

    const safe = (val: string | number) =>
      String(val ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const formatNum = (val?: number | string | null) => {
      if (val === undefined || val === null || val === "") return "-";
      const num = Number(val);
      return Number.isFinite(num) ? num.toString() : String(val);
    };

    const title = `Relatório ${container.ctvId || container.containerId || "-"}`;
    const details = [
      { label: "Container", value: container.ctvId || container.containerId || "-" },
      { label: "Descrição", value: container.description ?? "-" },
      { label: "Quantidade de Sacas", value: formatNum(container.sacksCount) },
      { label: "Tara (kg)", value: formatNum(container.tareTons ? container.tareTons * 1000 : form.tareKg) },
      { label: "Peso Líquido (kg)", value: formatNum(container.liquidWeight) },
      { label: "Peso Bruto (kg)", value: formatNum(container.grossWeight) },
      { label: "Lacre Principal (Agência)", value: container.agencySeal ?? "-" },
      { label: "Outros Lacres", value: (container.otherSeals || []).join(", ") || "-" },
      { label: "Status", value: statusBadge.text },
      { label: "Operação", value: operationCtv || decodedOperationId || "-" },
    ];

    const imagesHtml = CONTAINER_IMAGE_SECTIONS.map(({ key, label }) => {
      const imgs = (imageSections[key] || []).filter((img) => img.url);
      const content = imgs.length
        ? imgs
            .map(
              (img) => `
              <div class="img-box">
                <img src="${safe(img.url || "")}" alt="${safe(label)}" />
              </div>
            `
            )
            .join("")
        : '<p class="muted">Sem imagens</p>';
      return `
        <div class="img-section">
          <h4>${safe(label)}</h4>
          <div class="img-grid">
            ${content}
          </div>
        </div>
      `;
    }).join("");

    const detailsRows = details
      .map(
        ({ label, value }) => `
        <tr>
          <th>${safe(label)}</th>
          <td>${safe(value)}</td>
        </tr>
      `
      )
      .join("");

    const html = `
      <html>
        <head>
          <title>${safe(title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
            h2 { margin: 0; }
            p { margin: 4px 0 12px; font-size: 12px; color: #6b7280; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th { text-align: left; width: 35%; background: #f3f4f6; padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 12px; }
            td { padding: 6px 8px; border: 1px solid #e5e7eb; font-size: 12px; }
            .img-section { margin-bottom: 16px; }
            .img-section h4 { margin: 0 0 8px; font-size: 13px; }
            .img-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
            .img-box { border: 1px dashed #e5e7eb; padding: 6px; border-radius: 6px; background: #fafafa; }
            .img-box img { width: 100%; height: auto; display: block; border-radius: 4px; }
            .muted { color: #9ca3af; font-size: 12px; margin: 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h2>${safe(title)}</h2>
              <p>Gerado em ${safe(new Date().toLocaleString())}</p>
            </div>
            <img src="${LOGO_DATA_URI}" alt="logo" style="height:50px; width:auto;" />
          </div>
          <table>${detailsRows}</table>
          <div>${imagesHtml}</div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.title = title;
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
    const previousTitle = document.title;
    document.title = title;
    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) doc.title = title;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          document.title = previousTitle;
          document.body.removeChild(iframe);
        }, 300);
      }
    };
  };

  /**
   * CORREÃ‡ÃƒO 9: Renderização condicional do modal fora do return principal
   */
  const renderImageModal = () => {
    if (!selectedImageModal) return null;
    
    const modalImages = imageSections[selectedImageModal.section] || [];
    if (!modalImages.length) return null;
    
    // CORREÃ‡ÃƒO 6: Garante Ã­ndice seguro
    const safeIndex = Math.min(
      Math.max(0, selectedImageModal.index), 
      modalImages.length - 1
    );
    const currentImage = modalImages[safeIndex];
    if (!currentImage) return null;
    
    const sectionLabel = CONTAINER_IMAGE_SECTIONS.find(
      (s) => s.key === selectedImageModal.section
    )?.label || "";

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 md:p-8 overflow-auto"
        onClick={closeImageModal}
        role="dialog"
        aria-modal="true"
        aria-label={`Visualização de imagem: ${sectionLabel}`}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeImageModal();
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-200 bg-black/60 rounded-full p-2 z-10"
            aria-label="Fechar visualização"
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
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 bg-black/60 rounded-full p-3 z-10"
              aria-label="Imagem anterior"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <img
            src={currentImage.url}
            alt={`${sectionLabel} - imagem ${safeIndex + 1} de ${modalImages.length}`}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          />

          {modalImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImageInModal();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 bg-black/60 rounded-full p-3 z-10"
              aria-label="PrÃ³xima imagem"
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
      </div>,
      document.body
    );
  };

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-[var(--surface)] border-b border-[var(--border)] h-20">
          <div className="flex items-center justify-between h-full px-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-3">
                Container {containerLabel}
                {hasContainer ? (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}
                    role="status"
                  >
                    {statusBadge.text}
                  </span>
                ) : (
                  <SkeletonBlock className="h-5 w-16" />
                )}
              </h1>
              <p className="text-sm text-[var(--muted)] flex items-center gap-2">
                Operação {
                    operationLabelLoading ? (
                      <span className="inline-block w-28 h-4 bg-[var(--hover)] rounded animate-pulse align-middle"></span>
                    ) : (
                      operationCtv || decodedOperationId
                    )
                  }
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => changePage("perfil")}
                className="flex items-center gap-3 cursor-pointer hover:bg-[var(--hover)] rounded-lg px-4 py-2 transition-colors"
                aria-label={`Acessar perfil de ${user.name}`}
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
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden space-y-4">
          {/* CORREÃ‡ÃƒO 4: Mensagens de erro/sucesso com roles apropriados */}
          {error && (
            <div 
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}
          {success && (
            <div 
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              role="status"
              aria-live="polite"
            >
              {success}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
            aria-hidden="true"
          />

          <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-[var(--text)]">Dados do Container</h2>
                {!isEditing && (
                  <ToggleSwitch
                    id="container-status-toggle"
                    className="flex items-center gap-2 text-sm"
                    checked={isContainerFinalized}
                    checkedLabel="Finalizado"
                    uncheckedLabel="Em andamento"
                    onChange={handleToggleStatus}
                    disabled={loading || statusUpdating || headerStatusLoading || isContainerFinalized}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasContainer ? (
                  isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors"
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || isRequiredMissing}
                        className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-busy={saving}
                      >
                        {saving ? "Salvando..." : "Salvar alterações"}
                      </button>
                    </>
                  ) : (
                    <>
                      {!isContainerFinalized && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors"
                          disabled={loading}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting || loading}
                        className="px-4 py-2 bg-[var(--surface)] border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-60"
                        aria-busy={deleting}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        {deleting ? "Excluindo..." : "Excluir"}
                      </button>
                    </>
                  )
                ) : (
                  <SkeletonBlock className="h-10 w-32" />
                )}
                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={!hasContainer || loading}
                  className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  Exportar PDF
                </button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Carregando dados do container">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={`skeleton-field-${idx}`} className="space-y-2">
                      <SkeletonBlock className="h-4 w-28" />
                      <SkeletonBlock className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Campo: Identificação */}
                  <div>
                    <label 
                      htmlFor="containerId"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Identificação
                    </label>
                    {isEditing ? (
                      <input
                        id="containerId"
                        type="text"
                        value={form.containerId}
                        disabled
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--hover)] text-[var(--muted)]"
                        aria-describedby="containerId-help"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.containerId || "-"}</div>
                    )}
                  </div>

                  {/* Campo: Descrição */}
                  <div>
                    <label 
                      htmlFor="description"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Descrição
                    </label>
                    {isEditing ? (
                      <input
                        id="description"
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

                  {/* Campo: Quantidade de Sacas */}
                  <div>
                    <label 
                      htmlFor="sacksCount"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Quantidade de Sacas
                    </label>
                    {isEditing ? (
                      <input
                        id="sacksCount"
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

                  {/* Campo: Tara (kg) */}
                  <div>
                    <label 
                      htmlFor="tareKg"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Tara (kg)
                    </label>
                    {isEditing ? (
                      <>
                        <input
                          id="tareKg"
                          type="number"
                          min="0"
                          value={form.tareKg}
                          onChange={(e) => handleChange("tareKg", e.target.value)}
                          disabled={!isEditing || loading}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                          aria-describedby="tareKg-help"
                        />
                      </>
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.tareKg || "-"}</div>
                    )}
                  </div>

                  {/* Campo: Peso LÃ­quido */}
                  <div>
                    <label 
                      htmlFor="liquidWeight"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Peso Líquido (kg)
                    </label>
                    {isEditing ? (
                      <input
                        id="liquidWeight"
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

                  {/* Campo: Peso Bruto */}
                  <div>
                    <label 
                      htmlFor="grossWeight"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Peso Bruto (kg)
                    </label>
                    {isEditing ? (
                      <input
                        id="grossWeight"
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

                  {/* Campo: Lacre Principal */}
                  <div>
                    <label 
                      htmlFor="agencySeal"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Lacre Principal (Agência)
                    </label>
                    {isEditing ? (
                      <input
                        id="agencySeal"
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

                  {/* Campo: Outros Lacres */}
                  <div>
                    <label 
                      htmlFor="otherSeals"
                      className="block text-sm font-medium text-[var(--text)] mb-1"
                    >
                      Outros Lacres
                    </label>
                    {isEditing ? (
                      <input
                        id="otherSeals"
                        type="text"
                        value={form.otherSeals}
                        onChange={(e) => handleChange("otherSeals", e.target.value)}
                        disabled={!isEditing || loading}
                        placeholder="Separados por vÃ­rgula"
                        className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-[var(--hover)]"
                        aria-describedby="otherSeals-help"
                      />
                    ) : (
                      <div className="text-[var(--text)] font-medium">{form.otherSeals || "-"}</div>
                    )}
                    {isEditing && (
                      <p id="otherSeals-help" className="sr-only">
                        Insira os lacres separados por vÃ­rgula
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SeÃ§Ãµes de Imagens */}
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
                  key === "lacresOutros" && isEditing ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={loading || saving}
                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] hover:bg-[var(--hover)] transition-colors disabled:opacity-60"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || isRequiredMissing || loading}
                        className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-60"
                        aria-busy={saving}
                      >
                        {saving 
                          ? "Salvando..." 
                          : "Salvar alterações"
                        }
                      </button>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>

          {renderImageModal()}
        </main>
      </div>
    </div>
  );
};

export default ContainerDetails;
