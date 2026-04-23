import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';

import { db } from '../../db/connection';
import type {
  CreateSiteHourlyRateInput,
  HourlyRateImportResult,
  SiteHourlyRate,
  UpdateSiteHourlyRateInput,
} from '../../types/hourlyRate';

type ExcelCellValue = string | number | boolean | Date | null | undefined;
type ParsedHourlyRateRow = {
  employeeCode: string;
  employeeName: string;
  siteCode: string;
  siteName: string;
  hourlyRate: ExcelCellValue;
  effectiveDate: ExcelCellValue;
  note: string | null;
};
type SearchHourlyRatesInput = {
  keyword?: unknown;
};
type ValidateHourlyRateInput = {
  employeeCode: unknown;
  siteCode: unknown;
  siteName: unknown;
  hourlyRate: unknown;
  effectiveDate: unknown;
  note?: unknown;
};
type HourlyRateRow = {
  id: number;
  employee_code: string;
  employee_name: string;
  site_code: string;
  site_name: string;
  hourly_rate: number;
  effective_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

const hourlyRateRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeOptionalNote(value: unknown) {
  const note = normalizeText(value);

  return note || null;
}

function normalizeDateString(value: unknown) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) {
      throw new Error('invalid effective_date');
    }

    return `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  const text = normalizeText(value);

  if (!text) {
    throw new Error('invalid effective_date');
  }

  const yyyyMmDd = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

  if (yyyyMmDd) {
    const year = yyyyMmDd[1];
    const month = yyyyMmDd[2];
    const day = yyyyMmDd[3];

    if (!year || !month || !day) {
      throw new Error('invalid effective_date');
    }

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);

  if (compact) {
    const year = compact[1];
    const month = compact[2];
    const day = compact[3];

    if (!year || !month || !day) {
      throw new Error('invalid effective_date');
    }

    return `${year}-${month}-${day}`;
  }

  throw new Error('invalid effective_date');
}

function parseHourlyRateValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  const text = normalizeText(value);

  if (!text) {
    throw new Error('invalid hourly_rate');
  }

  const hourlyRate = Number(text);

  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    throw new Error('invalid hourly_rate');
  }

  return hourlyRate;
}

function mapHourlyRateRow(row: HourlyRateRow): SiteHourlyRate {
  return {
    id: row.id,
    employeeCode: row.employee_code,
    employeeName: row.employee_name,
    siteCode: row.site_code,
    siteName: row.site_name,
    hourlyRate: row.hourly_rate,
    effectiveDate: row.effective_date,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findActiveEmployeeByCode(code: string) {
  return db
    .prepare(
      `
        SELECT code, name
        FROM employees
        WHERE code = ? AND status = 'active'
      `,
    )
    .get(code) as { code: string; name: string } | undefined;
}

function validateHourlyRateInput(
  input: CreateSiteHourlyRateInput | UpdateSiteHourlyRateInput | ValidateHourlyRateInput,
) {
  const employeeCode = normalizeText(input.employeeCode);
  const siteCode = normalizeText(input.siteCode);
  const siteName = normalizeText(input.siteName);
  const hourlyRate = parseHourlyRateValue(input.hourlyRate);
  const effectiveDate = normalizeDateString(input.effectiveDate);
  const note = normalizeOptionalNote(input.note);

  if (!employeeCode || !siteCode || !siteName) {
    throw new Error('required fields are missing');
  }

  const employee = findActiveEmployeeByCode(employeeCode);

  if (!employee) {
    throw new Error('employee not found');
  }

  return {
    employeeCode,
    employeeName: employee.name,
    siteCode,
    siteName,
    hourlyRate,
    effectiveDate,
    note,
  };
}

function findExistingHourlyRate(employeeCode: string, siteCode: string, effectiveDate: string) {
  return db
    .prepare(
      `
        SELECT id
        FROM hourly_rates
        WHERE employee_code = ? AND site_code = ? AND effective_date = ?
      `,
    )
    .get(employeeCode, siteCode, effectiveDate) as { id: number } | undefined;
}

export function searchHourlyRates(input: SearchHourlyRatesInput = {}) {
  const keyword = normalizeText(input.keyword);
  const conditions: string[] = [];
  const params: string[] = [];

  conditions.push("e.status = 'active'");

  if (keyword) {
    conditions.push(`
      (
        hr.employee_code LIKE ? OR
        hr.employee_name LIKE ? OR
        hr.site_code LIKE ? OR
        hr.site_name LIKE ?
      )
    `);
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `
        SELECT
          hr.id,
          hr.employee_code,
          hr.employee_name,
          hr.site_code,
          hr.site_name,
          hr.hourly_rate,
          hr.effective_date,
          hr.note,
          hr.created_at,
          hr.updated_at
        FROM hourly_rates hr
        JOIN employees e ON e.code = hr.employee_code
        ${whereClause}
        ORDER BY hr.updated_at DESC, hr.id DESC
      `,
    )
    .all(...params) as HourlyRateRow[];

  return rows.map(mapHourlyRateRow);
}

export function createHourlyRate(input: CreateSiteHourlyRateInput) {
  const validated = validateHourlyRateInput(input);

  if (findExistingHourlyRate(validated.employeeCode, validated.siteCode, validated.effectiveDate)) {
    throw new Error('hourly rate already exists');
  }

  const now = new Date().toISOString();
  const result = db
    .prepare(
      `
        INSERT INTO hourly_rates (
          employee_code,
          employee_name,
          site_code,
          site_name,
          hourly_rate,
          effective_date,
          note,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      validated.employeeCode,
      validated.employeeName,
      validated.siteCode,
      validated.siteName,
      validated.hourlyRate,
      validated.effectiveDate,
      validated.note,
      now,
      now,
    );

  const row = db
    .prepare(
      `
        SELECT
          id,
          employee_code,
          employee_name,
          site_code,
          site_name,
          hourly_rate,
          effective_date,
          note,
          created_at,
          updated_at
        FROM hourly_rates
        WHERE id = ?
      `,
    )
    .get(result.lastInsertRowid) as HourlyRateRow;

  return mapHourlyRateRow(row);
}

export function updateHourlyRate(id: number, input: UpdateSiteHourlyRateInput) {
  const validated = validateHourlyRateInput(input);
  const existingRow = db.prepare('SELECT id FROM hourly_rates WHERE id = ?').get(id) as
    | { id: number }
    | undefined;

  if (!existingRow) {
    throw new Error('hourly rate not found');
  }

  const duplicateRow = db
    .prepare(
      `
        SELECT id
        FROM hourly_rates
        WHERE employee_code = ? AND site_code = ? AND effective_date = ? AND id != ?
      `,
    )
    .get(validated.employeeCode, validated.siteCode, validated.effectiveDate, id) as
    | { id: number }
    | undefined;

  if (duplicateRow) {
    throw new Error('hourly rate already exists');
  }

  const now = new Date().toISOString();
  db.prepare(
    `
      UPDATE hourly_rates
      SET
        employee_code = ?,
        employee_name = ?,
        site_code = ?,
        site_name = ?,
        hourly_rate = ?,
        effective_date = ?,
        note = ?,
        updated_at = ?
      WHERE id = ?
    `,
  ).run(
    validated.employeeCode,
    validated.employeeName,
    validated.siteCode,
    validated.siteName,
    validated.hourlyRate,
    validated.effectiveDate,
    validated.note,
    now,
    id,
  );

  const row = db
    .prepare(
      `
        SELECT
          id,
          employee_code,
          employee_name,
          site_code,
          site_name,
          hourly_rate,
          effective_date,
          note,
          created_at,
          updated_at
        FROM hourly_rates
        WHERE id = ?
      `,
    )
    .get(id) as HourlyRateRow;

  return mapHourlyRateRow(row);
}

function parseHourlyRateWorksheet(worksheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json<ExcelCellValue[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const headerRowIndex = rows.findIndex((row) => {
    const headers = row.map((cell) => normalizeText(cell));

    return (
      headers.includes('工號') &&
      headers.includes('姓名') &&
      headers.includes('工作點代碼') &&
      headers.includes('工作點名稱') &&
      headers.includes('約定時薪 (Rate)') &&
      headers.includes('生效日期')
    );
  });

  if (headerRowIndex === -1) {
    throw new Error('excel header row not found');
  }

  const headerRow = rows[headerRowIndex];

  if (!headerRow) {
    throw new Error('excel header row not found');
  }

  const headers = headerRow.map((cell) => normalizeText(cell));
  const employeeCodeIndex = headers.findIndex((header) => header === '工號');
  const employeeNameIndex = headers.findIndex((header) => header === '姓名');
  const siteCodeIndex = headers.findIndex((header) => header === '工作點代碼');
  const siteNameIndex = headers.findIndex((header) => header === '工作點名稱');
  const hourlyRateIndex = headers.findIndex((header) => header === '約定時薪 (Rate)');
  const effectiveDateIndex = headers.findIndex((header) => header === '生效日期');
  const noteIndex = headers.findIndex((header) => header === '備註');

  if (
    employeeCodeIndex === -1 ||
    employeeNameIndex === -1 ||
    siteCodeIndex === -1 ||
    siteNameIndex === -1 ||
    hourlyRateIndex === -1 ||
    effectiveDateIndex === -1
  ) {
    throw new Error('required excel columns are missing');
  }

  return rows.slice(headerRowIndex + 1).map((row): ParsedHourlyRateRow => {
    return {
      employeeCode: normalizeText(row[employeeCodeIndex]),
      employeeName: normalizeText(row[employeeNameIndex]),
      siteCode: normalizeText(row[siteCodeIndex]),
      siteName: normalizeText(row[siteNameIndex]),
      hourlyRate: row[hourlyRateIndex],
      effectiveDate: row[effectiveDateIndex],
      note: noteIndex === -1 ? null : normalizeOptionalNote(row[noteIndex]),
    };
  });
}

function parseHourlyRateImportFile(file: Express.Multer.File) {
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

  const worksheetName = workbook.SheetNames[1];

  if (!worksheetName) {
    throw new Error('excel worksheet not found');
  }

  const worksheet = workbook.Sheets[worksheetName];

  if (!worksheet) {
    throw new Error('excel worksheet not found');
  }

  return parseHourlyRateWorksheet(worksheet);
}

export function importHourlyRatesFromExcel(file: Express.Multer.File): HourlyRateImportResult {
  const rows = parseHourlyRateImportFile(file);
  const insertHourlyRate = db.prepare(
    `
      INSERT INTO hourly_rates (
        employee_code,
        employee_name,
        site_code,
        site_name,
        hourly_rate,
        effective_date,
        note,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    if (
      !row.employeeCode &&
      !row.employeeName &&
      !row.siteCode &&
      !row.siteName &&
      !normalizeText(row.effectiveDate) &&
      !row.note &&
      !normalizeText(row.hourlyRate)
    ) {
      skippedCount += 1;
      continue;
    }

    try {
      const validated = validateHourlyRateInput({
        employeeCode: row.employeeCode,
        siteCode: row.siteCode,
        siteName: row.siteName,
        hourlyRate: row.hourlyRate,
        effectiveDate: row.effectiveDate,
        note: row.note,
      });

      if (
        findExistingHourlyRate(validated.employeeCode, validated.siteCode, validated.effectiveDate)
      ) {
        skippedCount += 1;
        continue;
      }

      const now = new Date().toISOString();
      insertHourlyRate.run(
        validated.employeeCode,
        validated.employeeName,
        validated.siteCode,
        validated.siteName,
        validated.hourlyRate,
        validated.effectiveDate,
        validated.note,
        now,
        now,
      );
      insertedCount += 1;
    } catch {
      skippedCount += 1;
    }
  }

  return {
    insertedCount,
    skippedCount,
    message: 'hourly rate import completed',
  };
}

hourlyRateRouter.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'file is required',
    });
  }

  try {
    const result = importHourlyRatesFromExcel(req.file);

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to import hourly rates';
    const statusCode =
      message === 'invalid file format' ||
      message === 'uploaded file is empty' ||
      message === 'failed to parse excel file' ||
      message === 'excel worksheet not found' ||
      message === 'excel header row not found' ||
      message === 'required excel columns are missing' ||
      message === 'invalid hourly_rate' ||
      message === 'invalid effective_date'
        ? 400
        : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

hourlyRateRouter.get('/', (req, res) => {
  try {
    const items = searchHourlyRates({
      keyword: req.query.keyword,
    });

    return res.json({
      items,
    });
  } catch {
    return res.status(500).json({
      message: 'failed to search hourly rates',
    });
  }
});

hourlyRateRouter.post('/', (req, res) => {
  try {
    const item = createHourlyRate(req.body);

    return res.status(201).json({
      item,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to create hourly rate';
    const statusCode =
      message === 'required fields are missing' ||
      message === 'employee not found' ||
      message === 'invalid hourly_rate' ||
      message === 'invalid effective_date' ||
      message === 'hourly rate already exists'
        ? 400
        : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

hourlyRateRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: 'invalid id',
    });
  }

  try {
    const item = updateHourlyRate(id, req.body);

    return res.json({
      item,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to update hourly rate';
    const statusCode =
      message === 'required fields are missing' ||
      message === 'employee not found' ||
      message === 'invalid hourly_rate' ||
      message === 'invalid effective_date' ||
      message === 'hourly rate already exists'
        ? 400
        : message === 'hourly rate not found'
          ? 404
          : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

export { hourlyRateRouter };
