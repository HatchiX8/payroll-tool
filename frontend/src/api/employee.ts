import { http } from './http';

import type {
  ApiItemResponse,
  ApiListResponse,
  CreateEmployeePayload,
  Employee,
  EmployeeSearchParams,
  ImportEmployeesResponse,
  UpdateEmployeePayload,
  UpdateEmployeeStatusPayload,
} from '@/types';

export const getEmployees = async (params: Partial<EmployeeSearchParams>) => {
  const { data } = await http.get<ApiListResponse<Employee>>('/api/employees', {
    params,
  });

  return data;
};

export const createEmployee = async (payload: CreateEmployeePayload) => {
  const { data } = await http.post<ApiItemResponse<Employee>>('/api/employees', payload);

  return data;
};

export const importEmployees = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await http.post<ImportEmployeesResponse>('/api/employees/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};

export const updateEmployee = async (id: number, payload: UpdateEmployeePayload) => {
  const { data } = await http.put<ApiItemResponse<Employee>>(`/api/employees/${id}`, payload);

  return data;
};

export const updateEmployeeStatus = async (id: number, payload: UpdateEmployeeStatusPayload) => {
  const { data } = await http.patch<ApiItemResponse<Employee>>(
    `/api/employees/${id}/status`,
    payload,
  );

  return data;
};
