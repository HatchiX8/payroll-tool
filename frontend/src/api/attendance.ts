import { http } from './http';

import type {
  ApiListResponse,
  AttendanceImportResult,
  AttendanceRecord,
  AttendanceSearchParams,
} from '@/types';

export const getAttendance = async (params: Partial<AttendanceSearchParams>) => {
  const { data } = await http.get<ApiListResponse<AttendanceRecord>>('/api/attendance', {
    params,
  });

  return data;
};

export const importAttendance = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await http.post<AttendanceImportResult>('/api/attendance/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};
