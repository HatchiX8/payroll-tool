import { Router } from 'express';
import { db } from '../../db/connection';

type EmployeeStatus = 'active' | 'inactive';

type Employee = {
  id: number;
  code: string;
  name: string;
  phone: string;
  status: EmployeeStatus;
};

type CreateEmployeeInput = {
  code: string;
  name: string;
  phone?: string;
  status?: EmployeeStatus;
};

type SearchEmployeesInput = {
  keyword?: unknown;
  status?: unknown;
};

const employeeRouter = Router();

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
  const status = normalizeText(value).toLowerCase();
  if (status === 'active' || status === 'inactive') {
    return status;
  }
  return '';
}

export function createEmployee(input: CreateEmployeeInput) {
  const code = normalizeText(input.code);
  const name = normalizeText(input.name);
  const phone = normalizeText(input.phone);
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
        INSERT INTO employees (code, name, phone, status)
        VALUES (?, ?, ?, ?)
      `,
    )
    .run(code, name, phone, status);

  return db
    .prepare(
      `
        SELECT id, code, name, phone, status
        FROM employees
        WHERE id = ?
      `,
    )
    .get(result.lastInsertRowid) as Employee;
}

export function searchEmployees(input: SearchEmployeesInput = {}) {
  const keyword = normalizeText(input.keyword);
  const status = parseStatus(input.status);

  const conditions: string[] = [];
  const params: string[] = [];

  if (keyword) {
    conditions.push('(code LIKE ? OR name LIKE ? OR phone LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return db
    .prepare(
      `
        SELECT id, code, name, phone, status
        FROM employees
        ${whereClause}
        ORDER BY id DESC
      `,
    )
    .all(...params) as Employee[];
}

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
