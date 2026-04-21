export interface SiteHourlyRate {
  id: string;
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
