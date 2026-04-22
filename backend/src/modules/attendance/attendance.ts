import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';

import { db } from '../../db/connection';
import type {
  AttendanceImportResult,
  AttendanceImportRow,
  AttendanceRecord,
  AttendanceSearchParams,
} from '../../types/attendance';

type ExcelCellValue = string | number | boolean | Date | null | undefined;
type DateColumn = {
  columnIndex: number;
  workDate: string;
};
type AttendanceSummaryRow = {
  year: number;
  month: number;
  site: string;
  employeeCode: string;
  employeeName: string;
  totalHours: number;
};

const attendanceRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeYearMonth(value: unknown): string {
  const yearMonth = normalizeText(value).replace(/\D/g, '');

  if (!yearMonth) {
    return '';
  }

  if (!/^\d{6}$/.test(yearMonth)) {
    throw new Error('invalid yearMonth');
  }

  return yearMonth;
}

function formatWorkDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseExcelDate(value: ExcelCellValue) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) {
      return null;
    }

    return {
      year: parsed.y,
      month: parsed.m,
      day: parsed.d,
    };
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const matched = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

  if (!matched) {
    return null;
  }

  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
  };
}

function parseNullableNumber(value: ExcelCellValue) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const text = normalizeText(value);

  if (!text || text === '.') {
    return null;
  }

  const numericValue = Number(text);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue;
}

function parseNullableShiftCode(value: ExcelCellValue) {
  const shiftCode = normalizeText(value);

  return shiftCode || null;
}

function parseSiteInfo(row: ExcelCellValue[]) {
  const tokens = row.map((cell) => normalizeText(cell)).filter(Boolean);
  const labelIndex = tokens.findIndex((token) => token.includes('駐點編號/名稱'));

  if (labelIndex === -1) {
    throw new Error('attendance site info not found');
  }

  const siteText = tokens.slice(labelIndex + 1).join('');
  const matched = siteText.match(/^([^/]+)\/(.+?)(\d+年\d+月)?$/);

  if (!matched) {
    throw new Error('attendance site info not found');
  }

  return {
    siteCode: normalizeText(matched[1]),
    siteName: normalizeText(matched[2]),
  };
}

function parseDateColumns(row: ExcelCellValue[], yearMonth: string): DateColumn[] {
  const targetYear = Number(yearMonth.slice(0, 4));
  const targetMonth = Number(yearMonth.slice(4, 6));
  const dateColumns: DateColumn[] = [];

  row.forEach((cell, columnIndex) => {
    const parsedDate = parseExcelDate(cell);

    if (!parsedDate) {
      return;
    }

    if (parsedDate.year !== targetYear || parsedDate.month !== targetMonth) {
      return;
    }

    dateColumns.push({
      columnIndex,
      workDate: formatWorkDate(parsedDate.year, parsedDate.month, parsedDate.day),
    });
  });

  if (dateColumns.length === 0) {
    throw new Error('attendance date columns not found');
  }

  return dateColumns;
}

function parseAttendanceWorksheet(sheetName: string, worksheet: XLSX.WorkSheet) {
  const yearMonth = normalizeYearMonth(sheetName);

  if (!yearMonth) {
    throw new Error('invalid worksheet yearMonth');
  }

  const rows = XLSX.utils.sheet_to_json<ExcelCellValue[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const siteInfoRow = rows[0];
  const dateHeaderRow = rows[1];

  if (!siteInfoRow || !dateHeaderRow) {
    throw new Error('attendance worksheet format is invalid');
  }

  const { siteCode, siteName } = parseSiteInfo(siteInfoRow);
  const dateColumns = parseDateColumns(dateHeaderRow, yearMonth);
  const attendanceRows: AttendanceImportRow[] = [];

  // MVP: sample file starts employee rows after the weekday row, and each employee uses 2 rows.
  for (let rowIndex = 3; rowIndex + 1 < rows.length; rowIndex += 2) {
    const shiftRow = rows[rowIndex];
    const hoursRow = rows[rowIndex + 1];

    if (!shiftRow || !hoursRow) {
      continue;
    }

    const employeeName = normalizeText(shiftRow[0]);

    if (!employeeName) {
      continue;
    }

    if (employeeName.includes('總 計 時 數') || employeeName.includes('值班方式')) {
      break;
    }

    if (employeeName.startsWith('(')) {
      continue;
    }

    for (const dateColumn of dateColumns) {
      const hours = parseNullableNumber(hoursRow[dateColumn.columnIndex]);

      if (hours === null) {
        continue;
      }

      attendanceRows.push({
        yearMonth,
        siteCode,
        siteName,
        employeeName,
        workDate: dateColumn.workDate,
        shiftCode: parseNullableShiftCode(shiftRow[dateColumn.columnIndex]),
        hours,
      });
    }
  }

  return attendanceRows;
}

function parseAttendanceImportFile(file: Express.Multer.File) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension !== '.xlsx') {
    throw new Error('invalid file format');
  }

  if (!file.buffer || file.buffer.length === 0) {
    throw new Error('uploaded file is empty');
  }

  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(file.buffer, { type: 'buffer' });
  } catch {
    throw new Error('failed to parse excel file');
  }

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('excel worksheet not found');
  }

  const worksheet = workbook.Sheets[firstSheetName];

  if (!worksheet) {
    throw new Error('excel worksheet not found');
  }

  return parseAttendanceWorksheet(firstSheetName, worksheet);
}

export function importAttendanceFromExcel(file: Express.Multer.File): AttendanceImportResult {
  const rows = parseAttendanceImportFile(file);
  const findEmployeeByName = db.prepare(
    "SELECT id FROM employees WHERE name = ? AND status = 'active'",
  );
  const findExistingAttendance = db.prepare(`
    SELECT id
    FROM attendance_records
    WHERE employee_id = ? AND work_date = ? AND site = ?
  `);
  const insertAttendance = db.prepare(`
    INSERT INTO attendance_records (employee_id, work_date, year, month, hours, site)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const employee = findEmployeeByName.get(row.employeeName) as { id: number } | undefined;

    if (!employee) {
      skippedCount += 1;
      continue;
    }

    const year = Number(row.yearMonth.slice(0, 4));
    const month = Number(row.yearMonth.slice(4, 6));
    const site = `${row.siteCode}|${row.siteName}`;
    const existingAttendance = findExistingAttendance.get(employee.id, row.workDate, site) as
      | { id: number }
      | undefined;

    if (existingAttendance) {
      skippedCount += 1;
      continue;
    }

    insertAttendance.run(employee.id, row.workDate, year, month, row.hours, site);
    insertedCount += 1;
  }

  return {
    insertedCount,
    skippedCount,
    message: 'attendance import completed',
  };
}

function splitSite(site: string) {
  const [siteCode, siteName] = site.split('|');

  return {
    siteCode: normalizeText(siteCode),
    siteName: normalizeText(siteName),
  };
}

export function searchAttendanceSummary(input: Partial<AttendanceSearchParams> = {}) {
  const yearMonth = normalizeYearMonth(input.yearMonth);
  const conditions: string[] = [];
  const params: number[] = [];

  if (yearMonth) {
    conditions.push('ar.year = ?');
    conditions.push('ar.month = ?');
    params.push(Number(yearMonth.slice(0, 4)), Number(yearMonth.slice(4, 6)));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `
        SELECT
          ar.year,
          ar.month,
          ar.site,
          e.code AS employeeCode,
          e.name AS employeeName,
          SUM(ar.hours) AS totalHours
        FROM attendance_records ar
        JOIN employees e ON e.id = ar.employee_id
        WHERE e.status = 'active'
        ${whereClause ? `AND ${whereClause.replace(/^WHERE\s+/i, '')}` : ''}
        GROUP BY ar.year, ar.month, ar.site, e.id, e.code, e.name
        ORDER BY e.name ASC, e.code ASC, ar.year DESC, ar.month DESC, ar.site ASC
      `,
    )
    .all(...params) as AttendanceSummaryRow[];

  return rows.map((row): AttendanceRecord => {
    const rowYearMonth = `${String(row.year).padStart(4, '0')}${String(row.month).padStart(2, '0')}`;
    const { siteCode, siteName } = splitSite(row.site);

    return {
      id: `${row.employeeCode}-${rowYearMonth}-${siteCode}`,
      yearMonth: rowYearMonth,
      siteCode,
      siteName,
      employeeCode: row.employeeCode,
      employeeName: row.employeeName,
      totalHours: row.totalHours,
      // MVP: schema does not store scheduled hours yet, so use totalHours as an approximate value.
      scheduledHours: row.totalHours,
      // MVP: schema does not store overtime hours yet, so return 0 for now.
      overtimeHours: 0,
      sourceFileName: null,
      importedAt: '',
    };
  });
}

attendanceRouter.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'file is required',
    });
  }

  try {
    const result = importAttendanceFromExcel(req.file);

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to import attendance';
    const statusCode =
      message === 'invalid file format' ||
      message === 'uploaded file is empty' ||
      message === 'failed to parse excel file' ||
      message === 'excel worksheet not found' ||
      message === 'invalid worksheet yearMonth' ||
      message === 'invalid yearMonth' ||
      message === 'attendance worksheet format is invalid' ||
      message === 'attendance site info not found' ||
      message === 'attendance date columns not found'
        ? 400
        : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

attendanceRouter.get('/', (req, res) => {
  try {
    const items = searchAttendanceSummary({
      yearMonth: normalizeText(req.query.yearMonth),
    });

    return res.json({
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to search attendance';
    const statusCode = message === 'invalid yearMonth' ? 400 : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

export { attendanceRouter };
