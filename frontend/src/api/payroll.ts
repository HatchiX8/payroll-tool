import { http } from './http';

import type {
  ApiListResponse,
  PayrollCalculationResult,
  PayrollResult,
  PayrollSearchParams,
} from '@/types';

export const getPayrollResults = async (params: Partial<PayrollSearchParams>) => {
  const { data } = await http.get<ApiListResponse<PayrollResult>>('/api/payroll', {
    params,
  });

  return data;
};

export const calculatePayroll = async (payload: PayrollSearchParams) => {
  const { data } = await http.post<PayrollCalculationResult>('/api/payroll/calculate', payload);

  return data;
};
