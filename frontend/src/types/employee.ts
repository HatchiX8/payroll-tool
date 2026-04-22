export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: number;
  code: string;
  name: string;
  phone: string;
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
  status: EmployeeStatus;
}

export interface ApiItemResponse<T> {
  item: T;
}
