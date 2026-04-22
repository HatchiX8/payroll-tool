import './db/init-db';
import express from 'express';
import cors from 'cors';
import { attendanceRouter } from './modules/attendance/attendance';
import { employeeRouter } from './modules/employee/employee';
import { hourlyRateRouter } from './modules/hourlyRate/hourlyRate';
import { payrollRouter } from './modules/payroll/payroll';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/api/employees', employeeRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/hourly-rates', hourlyRateRouter);
app.use('/api/payroll', payrollRouter);

app.get('/api/health', (_req, res) => {
  res.json({ message: 'ok' });
});

app.get('/api/report', (_req, res) => {
  const data = [
    {
      id: 'R001',
      yearMonth: '2026-04',
      employeeCode: 'E001',
      employeeName: 'Amy',
      baseSalary: 28590,
      overtimePay: 2000,
      extendedOvertimePay: 0,
      baseSalaryAdjustment: 0,
      totalAmount: 30590,
    },
  ];

  return res.json({
    items: data,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
