export interface SiteHourlyRate {
  id: number;
  employeeCode: string;
  employeeName: string;
  siteCode: string;
  siteName: string;
  hourlyRate: number;
  effectiveDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteHourlyRateSearchParams {
  keyword: string;
}

export interface CreateSiteHourlyRateInput {
  employeeCode: string;
  employeeName: string;
  siteCode: string;
  siteName: string;
  hourlyRate: number;
  effectiveDate: string;
  note?: string | null;
}

export interface UpdateSiteHourlyRateInput {
  employeeCode: string;
  employeeName: string;
  siteCode: string;
  siteName: string;
  hourlyRate: number;
  effectiveDate: string;
  note?: string | null;
}

export interface HourlyRateImportResult {
  insertedCount: number;
  skippedCount: number;
  message: string;
}
