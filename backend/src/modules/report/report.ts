import { Router } from 'express';
import * as XLSX from 'xlsx';

import { db } from '../../db/connection';

type PayrollReportRow = {
  year_month: string;
  employee_code: string;
  employee_name: string;
  base_salary: number;
  overtime_pay: number;
  extended_overtime_pay: number;
  base_salary_adjustment: number;
  total_amount: number;
};

type SearchPayrollReportInput = {
  startYearMonth?: unknown;
  endYearMonth?: unknown;
};

const reportRouter = Router();

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeRequiredYearMonth(value: unknown, fieldName: string) {
  const yearMonth = normalizeText(value);

  if (!yearMonth) {
    throw new Error(`${fieldName} is required`);
  }

  if (!/^\d{6}$/.test(yearMonth)) {
    throw new Error(`invalid ${fieldName}`);
  }

  return yearMonth;
}

function validatePayrollReportRange(input: SearchPayrollReportInput) {
  const startYearMonth = normalizeRequiredYearMonth(input.startYearMonth, 'startYearMonth');
  const endYearMonth = normalizeRequiredYearMonth(input.endYearMonth, 'endYearMonth');

  if (startYearMonth > endYearMonth) {
    throw new Error('startYearMonth cannot be greater than endYearMonth');
  }

  return {
    startYearMonth,
    endYearMonth,
  };
}

function searchPayrollReportRows(input: SearchPayrollReportInput) {
  const { startYearMonth, endYearMonth } = validatePayrollReportRange(input);

  return db
    .prepare(
      `
        SELECT
          year_month,
          employee_code,
          employee_name,
          base_salary,
          overtime_pay,
          extended_overtime_pay,
          base_salary_adjustment,
          total_amount
        FROM payroll_results
        WHERE year_month >= ? AND year_month <= ?
        ORDER BY year_month ASC, employee_code ASC
      `,
    )
    .all(startYearMonth, endYearMonth) as PayrollReportRow[];
}

function buildPayrollReportWorksheetData(rows: PayrollReportRow[]) {
  const headerRow = [
    '年月',
    '員工代碼',
    '員工姓名',
    '基本工資',
    '加班費',
    '延時加班費',
    '底薪調整',
    '總金額',
  ];

  const dataRows = rows.map((row) => {
    return [
      row.year_month,
      row.employee_code,
      row.employee_name,
      row.base_salary,
      row.overtime_pay,
      row.extended_overtime_pay,
      row.base_salary_adjustment,
      row.total_amount,
    ];
  });

  return [headerRow, ...dataRows];
}

export function generatePayrollReport(input: SearchPayrollReportInput) {
  const { startYearMonth, endYearMonth } = validatePayrollReportRange(input);
  const rows = searchPayrollReportRows({
    startYearMonth,
    endYearMonth,
  });

  if (rows.length === 0) {
    throw new Error('payroll report not found');
  }

  const worksheetData = buildPayrollReportWorksheetData(rows);
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, '薪資報表');

  return {
    fileName: `payroll-report-${startYearMonth}-${endYearMonth}.xlsx`,
    buffer: XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer,
  };
}

reportRouter.get('/', (req, res) => {
  try {
    const result = generatePayrollReport({
      startYearMonth: req.query.startYearMonth,
      endYearMonth: req.query.endYearMonth,
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);

    return res.send(result.buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to generate payroll report';
    const statusCode =
      message === 'startYearMonth is required' ||
      message === 'endYearMonth is required' ||
      message === 'invalid startYearMonth' ||
      message === 'invalid endYearMonth' ||
      message === 'startYearMonth cannot be greater than endYearMonth'
        ? 400
        : message === 'payroll report not found'
          ? 404
          : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

export { reportRouter };
