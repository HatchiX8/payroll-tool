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
  status?: EmployeeStatus | '';
}

export interface CreateEmployeeInput {
  code: string;
  name: string;
  phone?: string;
  note?: string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeInput {
  code: string;
  name: string;
  phone?: string;
  note?: string;
  status?: EmployeeStatus;
}

export interface UpdateEmployeeStatusInput {
  status: EmployeeStatus;
}
