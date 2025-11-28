import { api } from './api';
import type { ApiPage } from './operations';

export type ApiContainerStatus = 'OPEN' | 'PENDING' | 'COMPLETED' | string;

export interface ApiContainerImage {
  id?: number;
  url?: string;
  imageUrl?: string;
  signedUrl?: string;
  category?: string;
  createdAt?: string;
}

export interface ApiContainer {
  id?: number;
  containerId: string;
  description?: string;
  operationId?: number;
  sacksCount?: number;
  tareTons?: number;
  liquidWeight?: number;
  grossWeight?: number;
  agencySeal?: string;
  otherSeals?: string[];
  status?: ApiContainerStatus;
  containerImages?: ApiContainerImage[];
}

export type ContainerImageCategoryKey =
  | 'vazioForrado'
  | 'fiada'
  | 'cheioAberto'
  | 'meiaPorta'
  | 'lacradoFechado'
  | 'lacresPrincipal'
  | 'lacresOutros';

export const CONTAINER_IMAGE_SECTIONS: {
  key: ContainerImageCategoryKey;
  label: string;
  apiCategory: string;
}[] = [
  { key: 'vazioForrado', label: 'Vazio/Forrado', apiCategory: 'VAZIO_FORRADO' },
  { key: 'fiada', label: 'Fiadas', apiCategory: 'FIADA' },
  { key: 'cheioAberto', label: 'Cheio Aberto', apiCategory: 'CHEIO_ABERTO' },
  { key: 'meiaPorta', label: 'Meia Porta', apiCategory: 'MEIA_PORTA' },
  { key: 'lacradoFechado', label: 'Lacrado/Fechado', apiCategory: 'LACRADO_FECHADO' },
  { key: 'lacresPrincipal', label: 'Lacre Principal', apiCategory: 'LACRES_PRINCIPAIS' },
  { key: 'lacresOutros', label: 'Lacres Outros', apiCategory: 'LACRES_OUTROS' },
];

const API_CATEGORY_BY_KEY = CONTAINER_IMAGE_SECTIONS.reduce(
  (acc, item) => ({ ...acc, [item.key]: item.apiCategory }),
  {} as Record<ContainerImageCategoryKey, string>
);

const KEY_BY_API_CATEGORY = CONTAINER_IMAGE_SECTIONS.reduce(
  (acc, item) => ({ ...acc, [item.apiCategory]: item.key }),
  {} as Record<string, ContainerImageCategoryKey>
);

export type ContainerImagesPayload = Partial<Record<ContainerImageCategoryKey, File[]>>;
const REQUIRED_IMAGE_CATEGORIES: ContainerImageCategoryKey[] = [
  'vazioForrado',
  'fiada',
  'cheioAberto',
  'meiaPorta',
  'lacradoFechado',
  'lacresPrincipal',
  'lacresOutros',
];

export interface CreateContainerPayload {
  containerId: string;
  description: string;
  operationId: number;
  sacksCount?: number;
  tareTons?: number;
  liquidWeight?: number;
  grossWeight?: number;
  agencySeal?: string;
  otherSeals?: string[];
  images?: ContainerImagesPayload;
}

export interface UpdateContainerPayload {
  description?: string;
  sacksCount?: number;
  tareTons?: number;
  liquidWeight?: number;
  grossWeight?: number;
  agencySeal?: string;
  otherSeals?: string[];
  status?: ApiContainerStatus;
}

const appendRequired = (form: FormData, key: string, value: unknown): void => {
  if (value === undefined || value === null) {
    form.append(key, '');
    return;
  }
  form.append(key, String(value));
};

const appendStringArray = (form: FormData, key: string, list?: string[]): void => {
  const items = (list || []).filter((item) => item !== undefined && item !== null);
  if (!items.length) {
    form.append(key, '');
    return;
  }
  items.forEach((item) => form.append(key, item));
};

const appendImages = (form: FormData, images?: ContainerImagesPayload): boolean => {
  if (!images) return false;
  let hasImages = false;
  (Object.keys(images) as ContainerImageCategoryKey[]).forEach((key) => {
    const files = images[key];
    if (!files || !files.length) return;
    hasImages = true;
    files.forEach((file) => form.append(key, file));
  });
  return hasImages;
};

const buildContainerJsonPayload = (payload: CreateContainerPayload) => {
  const {
    containerId,
    description,
    operationId,
    sacksCount,
    tareTons,
    liquidWeight,
    grossWeight,
    agencySeal,
    otherSeals,
  } = payload;

  return {
    containerId,
    description,
    operationId,
    sacksCount: sacksCount ?? 0,
    tareTons: tareTons ?? 0,
    liquidWeight: liquidWeight ?? 0,
    grossWeight: grossWeight ?? 0,
    agencySeal: agencySeal ?? '',
    otherSeals: otherSeals && otherSeals.length ? otherSeals : [''],
  };
};

export const createContainer = async (payload: CreateContainerPayload): Promise<ApiContainer> => {
  const images = payload.images ?? {};
  const hasAnyImage = Object.values(images).some((list) => (list?.length ?? 0) > 0);

  if (!hasAnyImage) {
    const body = buildContainerJsonPayload(payload);
    const { data } = await api.post<ApiContainer>('/containers', body);
    return data;
  }

  const form = new FormData();
  form.append('containerId', payload.containerId);
  form.append('description', payload.description);
  form.append('operationId', String(payload.operationId));
  form.append('sacksCount', String(payload.sacksCount ?? 0));
  form.append('tareTons', String(payload.tareTons ?? 0));
  form.append('liquidWeight', String(payload.liquidWeight ?? 0));
  form.append('grossWeight', String(payload.grossWeight ?? 0));
  form.append('agencySeal', payload.agencySeal ?? '');

  const seals = payload.otherSeals && payload.otherSeals.length ? payload.otherSeals : [''];
  seals.forEach((seal) => form.append('otherSeals', seal));

  (Object.keys(images) as ContainerImageCategoryKey[]).forEach((key) => {
    images[key]?.forEach((file) => form.append(key, file));
  });

  const { data } = await api.post<ApiContainer>('/containers/images', form);
  return data;
};

export const addImagesToContainer = async (
  containerId: string,
  images: ContainerImagesPayload,
  validateMandatory = false
): Promise<ApiContainer> => {
  const form = new FormData();
  form.append('validateMandatory', String(validateMandatory));
  appendImages(form, images);
  const { data } = await api.post<ApiContainer>(`/containers/${containerId}/images`, form);
  return data;
};

export const updateContainer = async (
  containerId: string,
  payload: UpdateContainerPayload
): Promise<ApiContainer> => {
  const {
    description,
    sacksCount,
    tareTons,
    liquidWeight,
    grossWeight,
    agencySeal,
    otherSeals,
    status,
  } = payload;

  const body: Record<string, unknown> = {
    description: description ?? '',
    sacksCount: sacksCount ?? 0,
    tareTons: tareTons ?? 0,
    liquidWeight: liquidWeight ?? 0,
    grossWeight: grossWeight ?? 0,
    agencySeal: agencySeal ?? '',
    otherSeals: otherSeals && otherSeals.length ? otherSeals : [''],
  };

  if (status !== undefined) {
    body.status = status;
  }

  const { data } = await api.put<ApiContainer>(`/containers/${containerId}`, body);
  return data;
};

export const deleteContainer = async (containerId: string): Promise<void> => {
  await api.delete(`/containers/${containerId}`);
};

export const completeContainerStatus = async (containerId: string): Promise<ApiContainer> => {
  const { data } = await api.patch<ApiContainer>(`/containers/${containerId}/status`);
  return data;
};

export const getContainerById = async (containerId: string): Promise<ApiContainer> => {
  const { data } = await api.get<ApiContainer>(`/containers/${containerId}`);
  return data;
};

export const getContainersByOperation = async (
  operationId: string | number,
  params?: { page?: number; size?: number; sortBy?: string; sortDirection?: 'ASC' | 'DESC' }
): Promise<ApiPage<ApiContainer>> => {
  const { page = 0, size = 20, sortBy = 'id', sortDirection = 'ASC' } = params || {};
  const { data } = await api.get<ApiPage<ApiContainer>>(
    `/containers/by-operation/${operationId}`,
    { params: { page, size, sortBy, sortDirection } }
  );
  return data;
};

export const getContainerImagesByCategory = async (
  containerId: string,
  category: ContainerImageCategoryKey
): Promise<string[]> => {
  const apiCategory = API_CATEGORY_BY_KEY[category];
  const { data } = await api.get<string[]>(`/containers/${containerId}/images/${apiCategory}`);
  return Array.isArray(data) ? data : [];
};

export const getAllContainerImages = async (
  containerId: string
): Promise<Record<ContainerImageCategoryKey, string[]>> => {
  const result: Record<ContainerImageCategoryKey, string[]> = {
    vazioForrado: [],
    fiada: [],
    cheioAberto: [],
    meiaPorta: [],
    lacradoFechado: [],
    lacresPrincipal: [],
    lacresOutros: [],
  };

  await Promise.all(
    (Object.keys(API_CATEGORY_BY_KEY) as ContainerImageCategoryKey[]).map(async (key) => {
      try {
        result[key] = await getContainerImagesByCategory(containerId, key);
      } catch {
        result[key] = [];
      }
    })
  );

  return result;
};

export const mapApiCategoryToSectionKey = (category?: string): ContainerImageCategoryKey | undefined => {
  if (!category) return undefined;
  const normalized = category.toUpperCase();
  return KEY_BY_API_CATEGORY[normalized];
};
