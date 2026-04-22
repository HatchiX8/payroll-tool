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

export interface PayrollSkippedItem {
  employeeCode: string;
  employeeName: string;
  reason: string;
}

export interface PayrollCalculationResult {
  calculatedCount: number;
  skippedCount: number;
  message: string;
  skippedItems: PayrollSkippedItem[];
}
