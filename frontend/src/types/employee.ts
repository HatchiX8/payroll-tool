export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: number;
  code: string;
  name: string;
  phone: string;
  note: string;
  status: EmployeeStatus;
}

export interface EmployeeSearchParams {
  keyword: string;
  status: '' | EmployeeStatus;
}

export interface CreateEmployeePayload {
  code: string;
  name: string;
  phone: string;
  note: string;
  status: EmployeeStatus;
}

export interface UpdateEmployeePayload {
  code: string;
  name: string;
  phone: string;
  note: string;
  status: EmployeeStatus;
}

export interface UpdateEmployeeStatusPayload {
  status: EmployeeStatus;
}

export interface ImportEmployeesResponse {
  insertedCount: number;
  skippedCount: number;
  message: string;
}

export interface ApiItemResponse<T> {
  item: T;
}
