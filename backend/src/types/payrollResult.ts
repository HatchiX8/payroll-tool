export interface PayrollResult {
  id: string;
  yearMonth: string;
  employeeCode: string;
  employeeName: string;
  grossAmount: number;
  baseSalary: number;
  overtimePay: number;
  extendedOvertimePay: number;
  baseSalaryAdjustment: number;
  totalAmount: number;
  calculatedAt: string;
}

export interface PayrollSearchParams {
  yearMonth: string;
}
