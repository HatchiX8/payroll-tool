export interface AttendanceImportRow {
  yearMonth: string;
  siteCode: string;
  siteName: string;
  employeeName: string;
  workDate: string;
  shiftCode: string | null;
  hours: number | null;
}

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

export interface AttendanceImportResult {
  insertedCount: number;
  skippedCount: number;
  message: string;
}
