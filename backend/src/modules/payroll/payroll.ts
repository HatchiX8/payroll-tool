import { Router } from 'express';

import { db } from '../../db/connection';
import type {
  PayrollCalculationResult,
  PayrollResult,
  PayrollSearchParams,
  PayrollSkippedItem,
} from '../../types/payrollResult';

type PayrollAttendanceSiteRow = {
  employeeId: number;
  employeeCode: string;
  employeeName: string;
  site: string;
  totalHours: number;
};

type PayrollResultRow = {
  id: number;
  year_month: string;
  employee_code: string;
  employee_name: string;
  gross_amount: number;
  base_salary: number;
  overtime_pay: number;
  extended_overtime_pay: number;
  base_salary_adjustment: number;
  total_amount: number;
  calculated_at: string;
};

type HourlyRateLookupRow = {
  hourly_rate: number;
};

type CalculatePayrollInput = {
  yearMonth?: unknown;
};

const payrollRouter = Router();
const BASE_SALARY = 28590;

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeYearMonth(value: unknown) {
  const yearMonth = normalizeText(value).replace(/\D/g, '');

  if (!yearMonth) {
    return '';
  }

  if (!/^\d{6}$/.test(yearMonth)) {
    throw new Error('invalid yearMonth');
  }

  return yearMonth;
}

function getYearMonthParts(yearMonth: string) {
  return {
    year: Number(yearMonth.slice(0, 4)),
    month: Number(yearMonth.slice(4, 6)),
  };
}

function getLastDateOfMonth(yearMonth: string) {
  const { year, month } = getYearMonthParts(yearMonth);
  const lastDate = new Date(year, month, 0);

  return `${String(lastDate.getFullYear()).padStart(4, '0')}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`;
}

function mapPayrollResultRow(row: PayrollResultRow): PayrollResult {
  return {
    id: String(row.id),
    yearMonth: row.year_month,
    employeeCode: row.employee_code,
    employeeName: row.employee_name,
    grossAmount: row.gross_amount,
    baseSalary: row.base_salary,
    overtimePay: row.overtime_pay,
    extendedOvertimePay: row.extended_overtime_pay,
    baseSalaryAdjustment: row.base_salary_adjustment,
    totalAmount: row.total_amount,
    calculatedAt: row.calculated_at,
  };
}

function splitSite(site: string) {
  const [siteCode, siteName] = site.split('|');

  return {
    siteCode: normalizeText(siteCode),
    siteName: normalizeText(siteName),
  };
}

function calculatePayrollAmounts(grossAmount: number) {
  const overtimePay = Math.min(Math.max(grossAmount - BASE_SALARY, 0), 5000);
  const extendedOvertimePay = Math.max(grossAmount - BASE_SALARY - overtimePay, 0);
  const baseSalaryAdjustment = grossAmount < BASE_SALARY ? grossAmount - BASE_SALARY : 0;
  const totalAmount = BASE_SALARY + overtimePay + extendedOvertimePay + baseSalaryAdjustment;

  return {
    grossAmount,
    baseSalary: BASE_SALARY,
    overtimePay,
    extendedOvertimePay,
    baseSalaryAdjustment,
    totalAmount,
  };
}

function searchPayrollResultRows(input: Partial<PayrollSearchParams> = {}) {
  const yearMonth = normalizeYearMonth(input.yearMonth);
  const conditions: string[] = [];
  const params: string[] = [];

  conditions.push("e.status = 'active'");

  if (yearMonth) {
    conditions.push('pr.year_month = ?');
    params.push(yearMonth);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db
    .prepare(
      `
        SELECT
          pr.id,
          pr.year_month,
          pr.employee_code,
          pr.employee_name,
          pr.gross_amount,
          pr.base_salary,
          pr.overtime_pay,
          pr.extended_overtime_pay,
          pr.base_salary_adjustment,
          pr.total_amount,
          pr.calculated_at
        FROM payroll_results pr
        JOIN employees e ON e.id = pr.employee_id
        ${whereClause}
        ORDER BY pr.employee_code ASC, pr.employee_name ASC, pr.id ASC
      `,
    )
    .all(...params) as PayrollResultRow[];
}

export function searchPayrollResults(input: Partial<PayrollSearchParams> = {}) {
  return searchPayrollResultRows(input).map(mapPayrollResultRow);
}

function getAttendanceSiteSummaries(yearMonth: string) {
  const { year, month } = getYearMonthParts(yearMonth);

  return db
    .prepare(
      `
        SELECT
          e.id AS employeeId,
          e.code AS employeeCode,
          e.name AS employeeName,
          ar.site AS site,
          SUM(ar.hours) AS totalHours
        FROM attendance_records ar
        JOIN employees e ON e.id = ar.employee_id
        WHERE ar.year = ? AND ar.month = ? AND e.status = 'active'
        GROUP BY e.id, e.code, e.name, ar.site
        ORDER BY e.code ASC, e.name ASC, ar.site ASC
      `,
    )
    .all(year, month) as PayrollAttendanceSiteRow[];
}

function findApplicableHourlyRate(employeeCode: string, siteCode: string, effectiveDateLimit: string) {
  return db
    .prepare(
      `
        SELECT hourly_rate
        FROM hourly_rates
        WHERE employee_code = ? AND site_code = ? AND effective_date <= ?
        ORDER BY effective_date DESC, id DESC
        LIMIT 1
      `,
    )
    .get(employeeCode, siteCode, effectiveDateLimit) as HourlyRateLookupRow | undefined;
}

function findExistingPayrollResult(yearMonth: string, employeeCode: string) {
  return db
    .prepare(
      `
        SELECT id
        FROM payroll_results
        WHERE year_month = ? AND employee_code = ?
      `,
    )
    .get(yearMonth, employeeCode) as { id: number } | undefined;
}

export function calculatePayroll(input: CalculatePayrollInput): PayrollCalculationResult {
  const yearMonth = normalizeYearMonth(input.yearMonth);

  if (!yearMonth) {
    throw new Error('yearMonth is required');
  }

  const effectiveDateLimit = getLastDateOfMonth(yearMonth);
  const attendanceRows = getAttendanceSiteSummaries(yearMonth);
  const attendanceByEmployee = new Map<string, PayrollAttendanceSiteRow[]>();

  for (const row of attendanceRows) {
    const key = `${row.employeeCode}||${row.employeeName}`;
    const group = attendanceByEmployee.get(key) ?? [];
    group.push(row);
    attendanceByEmployee.set(key, group);
  }

  const insertPayrollResult = db.prepare(
    `
      INSERT INTO payroll_results (
        employee_id,
        year,
        month,
        year_month,
        employee_code,
        employee_name,
        gross_amount,
        base_salary,
        overtime_pay,
        extended_overtime_pay,
        base_salary_adjustment,
        total_amount,
        calculated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );
  const updatePayrollResult = db.prepare(
    `
      UPDATE payroll_results
      SET
        employee_id = ?,
        year = ?,
        month = ?,
        employee_name = ?,
        gross_amount = ?,
        base_salary = ?,
        overtime_pay = ?,
        extended_overtime_pay = ?,
        base_salary_adjustment = ?,
        total_amount = ?,
        calculated_at = ?
      WHERE year_month = ? AND employee_code = ?
    `,
  );

  let calculatedCount = 0;
  let skippedCount = 0;
  const skippedItems: PayrollSkippedItem[] = [];
  const { year, month } = getYearMonthParts(yearMonth);

  for (const [, rows] of attendanceByEmployee) {
    const firstRow = rows[0];

    if (!firstRow) {
      continue;
    }

    let grossAmount = 0;
    let missingRate = false;

    for (const row of rows) {
      const { siteCode } = splitSite(row.site);
      const hourlyRate = findApplicableHourlyRate(firstRow.employeeCode, siteCode, effectiveDateLimit);

      if (!hourlyRate) {
        missingRate = true;
        break;
      }

      grossAmount += row.totalHours * hourlyRate.hourly_rate;
    }

    if (missingRate) {
      skippedCount += 1;
      skippedItems.push({
        employeeCode: firstRow.employeeCode,
        employeeName: firstRow.employeeName,
        reason: 'hourly rate not found for one or more sites',
      });
      continue;
    }

    const amounts = calculatePayrollAmounts(grossAmount);

    if (Math.abs(amounts.totalAmount - amounts.grossAmount) >= 0.01) {
      skippedCount += 1;
      skippedItems.push({
        employeeCode: firstRow.employeeCode,
        employeeName: firstRow.employeeName,
        reason: 'grossAmount and totalAmount validation failed',
      });
      continue;
    }

    const calculatedAt = new Date().toISOString();
    const existingPayrollResult = findExistingPayrollResult(yearMonth, firstRow.employeeCode);

    if (existingPayrollResult) {
      updatePayrollResult.run(
        firstRow.employeeId,
        year,
        month,
        firstRow.employeeName,
        amounts.grossAmount,
        amounts.baseSalary,
        amounts.overtimePay,
        amounts.extendedOvertimePay,
        amounts.baseSalaryAdjustment,
        amounts.totalAmount,
        calculatedAt,
        yearMonth,
        firstRow.employeeCode,
      );
    } else {
      insertPayrollResult.run(
        firstRow.employeeId,
        year,
        month,
        yearMonth,
        firstRow.employeeCode,
        firstRow.employeeName,
        amounts.grossAmount,
        amounts.baseSalary,
        amounts.overtimePay,
        amounts.extendedOvertimePay,
        amounts.baseSalaryAdjustment,
        amounts.totalAmount,
        calculatedAt,
      );
    }

    calculatedCount += 1;
  }

  return {
    calculatedCount,
    skippedCount,
    message: 'payroll calculation completed',
    skippedItems,
  };
}

payrollRouter.get('/', (req, res) => {
  try {
    const input: Partial<PayrollSearchParams> = {};
    const yearMonth = normalizeText(req.query.yearMonth);

    if (yearMonth) {
      input.yearMonth = yearMonth;
    }

    const items = searchPayrollResults(input);

    return res.json({
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to search payroll results';
    const statusCode = message === 'invalid yearMonth' ? 400 : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

payrollRouter.post('/calculate', (req, res) => {
  try {
    const result = calculatePayroll({
      yearMonth: req.body.yearMonth,
    });

    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to calculate payroll';
    const statusCode =
      message === 'yearMonth is required' || message === 'invalid yearMonth' ? 400 : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

export { payrollRouter };
