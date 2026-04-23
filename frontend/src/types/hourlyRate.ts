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

export interface HourlyRateImportResult {
  insertedCount: number;
  skippedCount: number;
  message: string;
}

export interface CreateSiteHourlyRatePayload {
  employeeCode: string;
  siteCode: string;
  siteName: string;
  hourlyRate: number;
  effectiveDate: string;
  note: string | null;
}

export interface UpdateSiteHourlyRatePayload {
  employeeCode: string;
  siteCode: string;
  siteName: string;
  hourlyRate: number;
  effectiveDate: string;
  note: string | null;
}
