import { http } from './http';

import type {
  ApiItemResponse,
  ApiListResponse,
  CreateEmployeePayload,
  Employee,
  EmployeeSearchParams,
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
