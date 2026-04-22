CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  work_date TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  hours REAL NOT NULL,
  site TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hourly_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  site_code TEXT NOT NULL,
  site_name TEXT NOT NULL,
  hourly_rate REAL NOT NULL,
  effective_date TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL 
);

CREATE TABLE IF NOT EXISTS payroll_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  year_month TEXT NOT NULL,
  employee_code TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  gross_amount REAL NOT NULL,
  base_salary REAL NOT NULL,
  overtime_pay REAL NOT NULL,
  extended_overtime_pay REAL NOT NULL,
  base_salary_adjustment REAL NOT NULL,
  total_amount REAL NOT NULL,
  calculated_at TEXT NOT NULL,
  UNIQUE(year_month, employee_code)
);
