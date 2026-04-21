export interface AttendanceRecord {
  id: string;
  yearMonth: string;
  siteCode: string;
  siteName: string;
  employeeCode: string;
  employeeName: string;
  totalHours: number;
  scheduledHours: number;
  overtimeHours: number;
  sourceFileName: string | null;
  importedAt: string;
}

export interface AttendanceSearchParams {
  yearMonth: string;
}
