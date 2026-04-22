import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { db } from '../../db/connection';
import type {
  CreateEmployeeInput,
  Employee,
  EmployeeStatus,
  UpdateEmployeeInput,
  UpdateEmployeeStatusInput,
} from '../../types/employee';

type SearchEmployeesInput = {
  keyword?: unknown;
  status?: unknown;
};

type ImportEmployeeResult = {
  insertedCount: number;
  skippedCount: number;
  message: string;
};

type ExcelCellValue = string | number | boolean | Date | null | undefined;
type ParsedEmployeeImportRow = {
  sequence: string;
  code: string;
  name: string;
  phone: string;
  note: string;
};

const employeeRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
});

function normalizeText(value: unknown) {
  return String(value ?? '').trim();
}

function normalizeStatus(value: unknown): EmployeeStatus {
  if (value === undefined || value === null) {
    return 'active';
  }

  const status = normalizeText(value).toLowerCase();

  if (status === 'active' || status === 'inactive') {
    return status;
  }

  throw new Error('invalid status');
}

function parseStatus(value: unknown): EmployeeStatus | '' {
  if (value === undefined || value === null || normalizeText(value) === '') {
    return '';
  }

  const status = normalizeText(value).toLowerCase();
  if (status === 'active' || status === 'inactive') {
    return status;
  }
  return '';
}

function getEmployeeById(id: number) {
  return db
    .prepare(
      `
        SELECT id, code, name, phone, note, status
        FROM employees
        WHERE id = ?
      `,
    )
    .get(id) as Employee | undefined;
}

function isNumericSequence(value: string) {
  return /^\d+$/.test(value);
}

export function createEmployee(input: CreateEmployeeInput) {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name);
  const phone = normalizeText(input.phone);
  const note = normalizeText(input.note);
  const status = normalizeStatus(input.status);

  if (!code || !name) {
    throw new Error('code and name are required');
  }

  const existingEmployee = db.prepare('SELECT id FROM employees WHERE code = ?').get(code) as
    | { id: number }
    | undefined;

  if (existingEmployee) {
    throw new Error('employee code already exists');
  }

  const result = db
    .prepare(
      `
        INSERT INTO employees (code, name, phone, note, status)
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(code, name, phone, note, status);

  return db
    .prepare(
      `
        SELECT id, code, name, phone, note, status
        FROM employees
        WHERE id = ?
      `,
    )
    .get(result.lastInsertRowid) as Employee;
}

export function searchEmployees(input: SearchEmployeesInput = {}) {
  const keyword = normalizeText(input.keyword);
  const status = parseStatus(input.status) || 'active';

  const conditions: string[] = [];
  const params: string[] = [];

  if (keyword) {
    conditions.push('(code LIKE ? OR name LIKE ? OR phone LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  conditions.push('status = ?');
  params.push(status);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db
    .prepare(
      `
        SELECT id, code, name, phone, note, status
        FROM employees
        ${whereClause}
        ORDER BY id DESC
      `,
    )
    .all(...params) as Employee[];
}

export function updateEmployee(id: number, input: UpdateEmployeeInput) {
  const existingEmployee = getEmployeeById(id);

  if (!existingEmployee) {
    throw new Error('employee not found');
  }

  const code = normalizeText(input.code);
  const name = normalizeText(input.name);
  const phone = normalizeText(input.phone);
  const note = normalizeText(input.note);
  const status =
    input.status === undefined ? existingEmployee.status : normalizeStatus(input.status);

  if (!code || !name) {
    throw new Error('code and name are required');
  }

  const duplicateEmployee = db
    .prepare('SELECT id FROM employees WHERE code = ? AND id != ?')
    .get(code, id) as { id: number } | undefined;

  if (duplicateEmployee) {
    throw new Error('employee code already exists');
  }

  db.prepare(
    `
      UPDATE employees
      SET code = ?, name = ?, phone = ?, note = ?, status = ?
      WHERE id = ?
    `,
  ).run(code, name, phone, note, status, id);

  const employee = getEmployeeById(id);

  if (!employee) {
    throw new Error('employee not found');
  }

  return employee;
}

export function updateEmployeeStatus(id: number, input: UpdateEmployeeStatusInput) {
  const existingEmployee = getEmployeeById(id);

  if (!existingEmployee) {
    throw new Error('employee not found');
  }

  const status = normalizeStatus(input.status);

  db.prepare(
    `
      UPDATE employees
      SET status = ?
      WHERE id = ?
    `,
  ).run(status, id);

  const employee = getEmployeeById(id);

  if (!employee) {
    throw new Error('employee not found');
  }

  return employee;
}

function parseEmployeeImportFile(file: Express.Multer.File) {
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

  const rows = XLSX.utils.sheet_to_json<ExcelCellValue[]>(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const headerRowIndex = rows.findIndex((row) => {
    const headers = row.map((cell) => normalizeText(cell));
    return headers.includes('USERNO') && headers.includes('SYS_NAME');
  });

  if (headerRowIndex === -1) {
    throw new Error('excel header row not found');
  }

  const headerRow = rows[headerRowIndex];

  if (!headerRow) {
    throw new Error('excel header row not found');
  }

  const headers = headerRow.map((cell) => normalizeText(cell));
  const sequenceIndex = headers.findIndex((header) => header === 'USERNO');
  const codeIndex = headers.findIndex((header) => header === 'SYS_VIEWID');
  const nameIndex = headers.findIndex((header) => header === 'SYS_NAME');
  const phoneIndex = headers.findIndex((header) => header === 'EMERGENCYMOBILE');
  const noteIndex = headers.findIndex((header) => header === 'NOTE');

  if (sequenceIndex === -1 || codeIndex === -1 || nameIndex === -1 || phoneIndex === -1) {
    throw new Error('required excel columns are missing');
  }

  return rows
    .slice(headerRowIndex + 1)
    .map((row): ParsedEmployeeImportRow => {
      return {
        sequence: normalizeText(row[sequenceIndex]),
        code: normalizeText(row[codeIndex]),
        name: normalizeText(row[nameIndex]),
        phone: normalizeText(row[phoneIndex]),
        note: noteIndex === -1 ? '' : normalizeText(row[noteIndex]),
      };
    })
    .filter((row) => isNumericSequence(row.sequence));
}

export function importEmployeesFromExcel(file: Express.Multer.File): ImportEmployeeResult {
  const rows = parseEmployeeImportFile(file);
  const findEmployeeByCode = db.prepare('SELECT id FROM employees WHERE code = ?');
  const insertEmployee = db.prepare(`
    INSERT INTO employees (code, name, phone, note, status)
    VALUES (?, ?, ?, ?, ?)
  `);

  let insertedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    if (!row.code || !row.name) {
      skippedCount += 1;
      continue;
    }

    const existingEmployee = findEmployeeByCode.get(row.code) as { id: number } | undefined;

    if (existingEmployee) {
      skippedCount += 1;
      continue;
    }

    insertEmployee.run(row.code, row.name, row.phone, row.note, 'active');
    insertedCount += 1;
  }

  return {
    insertedCount,
    skippedCount,
    message: 'employee import completed',
  };
}

employeeRouter.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: 'file is required',
    });
  }

  try {
    const result = importEmployeesFromExcel(req.file);

    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to import employees';
    const statusCode =
      message === 'invalid file format' ||
      message === 'uploaded file is empty' ||
      message === 'failed to parse excel file' ||
      message === 'excel worksheet not found' ||
      message === 'excel header row not found' ||
      message === 'required excel columns are missing'
        ? 400
        : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

employeeRouter.post('/', (req, res) => {
  try {
    const employee = createEmployee(req.body);

    return res.status(201).json({
      item: employee,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to create employee';
    const statusCode =
      message === 'code and name are required' ||
      message === 'employee code already exists' ||
      message === 'invalid status'
        ? 400
        : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

employeeRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: 'invalid id',
    });
  }

  try {
    const employee = updateEmployee(id, req.body);

    return res.json({
      item: employee,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to update employee';
    const statusCode =
      message === 'invalid id' ||
      message === 'code and name are required' ||
      message === 'employee code already exists' ||
      message === 'invalid status'
        ? 400
        : message === 'employee not found'
          ? 404
          : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

employeeRouter.patch('/:id/status', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: 'invalid id',
    });
  }

  try {
    const employee = updateEmployeeStatus(id, req.body);

    return res.json({
      item: employee,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to update employee status';
    const statusCode =
      message === 'invalid id' || message === 'invalid status'
        ? 400
        : message === 'employee not found'
          ? 404
          : 500;

    return res.status(statusCode).json({
      message,
    });
  }
});

employeeRouter.get('/', (req, res) => {
  try {
    const employees = searchEmployees({
      keyword: req.query.keyword,
      status: req.query.status,
    });

    return res.json({
      items: employees,
    });
  } catch {
    return res.status(500).json({
      message: 'failed to search employees',
    });
  }
});

export { employeeRouter };
