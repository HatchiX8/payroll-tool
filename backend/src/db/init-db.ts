import fs from 'fs'
import path from 'path'
import { db } from './connection'

const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql')
const schema = fs.readFileSync(schemaPath, 'utf-8')

db.exec(schema)

const employeeColumns = db.prepare("PRAGMA table_info(employees)").all() as Array<{ name: string }>
const hasPhoneColumn = employeeColumns.some((column) => column.name === 'phone')
const hasNoteColumn = employeeColumns.some((column) => column.name === 'note')
const payrollResultColumns = db
  .prepare("PRAGMA table_info(payroll_results)")
  .all() as Array<{ name: string }>
const hasPayrollYearMonthColumn = payrollResultColumns.some((column) => column.name === 'year_month')
const hasPayrollEmployeeCodeColumn = payrollResultColumns.some((column) => column.name === 'employee_code')
const hasPayrollEmployeeNameColumn = payrollResultColumns.some((column) => column.name === 'employee_name')
const hasPayrollGrossAmountColumn = payrollResultColumns.some((column) => column.name === 'gross_amount')
const hasPayrollBaseSalaryColumn = payrollResultColumns.some((column) => column.name === 'base_salary')
const hasPayrollOvertimePayColumn = payrollResultColumns.some((column) => column.name === 'overtime_pay')
const hasPayrollExtendedOvertimePayColumn = payrollResultColumns.some(
  (column) => column.name === 'extended_overtime_pay',
)
const hasPayrollBaseSalaryAdjustmentColumn = payrollResultColumns.some(
  (column) => column.name === 'base_salary_adjustment',
)
const hasPayrollCalculatedAtColumn = payrollResultColumns.some((column) => column.name === 'calculated_at')

if (!hasPhoneColumn) {
  db.exec("ALTER TABLE employees ADD COLUMN phone TEXT NOT NULL DEFAULT ''")
}

if (!hasNoteColumn) {
  db.exec("ALTER TABLE employees ADD COLUMN note TEXT NOT NULL DEFAULT ''")
}

if (!hasPayrollYearMonthColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN year_month TEXT NOT NULL DEFAULT ''")
}

if (!hasPayrollEmployeeCodeColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN employee_code TEXT NOT NULL DEFAULT ''")
}

if (!hasPayrollEmployeeNameColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN employee_name TEXT NOT NULL DEFAULT ''")
}

if (!hasPayrollGrossAmountColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN gross_amount REAL NOT NULL DEFAULT 0")
}

if (!hasPayrollBaseSalaryColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN base_salary REAL NOT NULL DEFAULT 0")
}

if (!hasPayrollOvertimePayColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN overtime_pay REAL NOT NULL DEFAULT 0")
}

if (!hasPayrollExtendedOvertimePayColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN extended_overtime_pay REAL NOT NULL DEFAULT 0")
}

if (!hasPayrollBaseSalaryAdjustmentColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN base_salary_adjustment REAL NOT NULL DEFAULT 0")
}

if (!hasPayrollCalculatedAtColumn) {
  db.exec("ALTER TABLE payroll_results ADD COLUMN calculated_at TEXT NOT NULL DEFAULT ''")
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_results_year_month_employee_code
  ON payroll_results(year_month, employee_code)
  WHERE year_month != '' AND employee_code != ''
`)

console.log('DB initialized')
