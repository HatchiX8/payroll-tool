export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  userNo: string;
  employeeCode: string;
  chineseName: string;
  mobile: string;
  note: string | null;
  status: EmployeeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSearchParams {
  keyword: string;
}
