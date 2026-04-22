import { http } from './http';

import type {
  ApiItemResponse,
  ApiListResponse,
  CreateSiteHourlyRatePayload,
  HourlyRateImportResult,
  SiteHourlyRate,
  SiteHourlyRateSearchParams,
  UpdateSiteHourlyRatePayload,
} from '@/types';

export const getHourlyRates = async (params: Partial<SiteHourlyRateSearchParams>) => {
  const { data } = await http.get<ApiListResponse<SiteHourlyRate>>('/api/hourly-rates', {
    params,
  });

  return data;
};

export const importHourlyRates = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await http.post<HourlyRateImportResult>('/api/hourly-rates/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};

export const createHourlyRate = async (payload: CreateSiteHourlyRatePayload) => {
  const { data } = await http.post<ApiItemResponse<SiteHourlyRate>>('/api/hourly-rates', payload);

  return data;
};

export const updateHourlyRate = async (id: number, payload: UpdateSiteHourlyRatePayload) => {
  const { data } = await http.put<ApiItemResponse<SiteHourlyRate>>(`/api/hourly-rates/${id}`, payload);

  return data;
};
