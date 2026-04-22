import express from 'express';
import cors from 'cors';
import { employeeRouter } from './modules/employee/employee';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/api/employees', employeeRouter);

app.get('/api/health', (_req, res) => {
  res.json({ message: 'ok' });
});

app.get('/api/attendance', (req, res) => {
  const yearMonth = String(req.query.yearMonth ?? '').trim();

  const attendanceList = [
    {
      employeeCode: 'E001',
      employeeName: 'Amy',
      siteName: 'Site A',
      yearMonth: '2026-04',
      totalHours: 160,
    },
    {
      employeeCode: 'E002',
      employeeName: 'Bob',
      siteName: 'Site B',
      yearMonth: '2026-03',
      totalHours: 152.5,
    },
  ];

  const filteredAttendanceList = !yearMonth
    ? attendanceList
    : attendanceList.filter((item) => item.yearMonth === yearMonth);

  return res.json({
    items: filteredAttendanceList,
  });
});

app.get('/api/hourly-rates', (req, res) => {
  const keyword = String(req.query.keyword ?? '').trim();

  const hourlyRates = [
    {
      id: 'HR001',
      employeeCode: 'E001',
      employeeName: 'Amy',
      siteCode: 'A',
      siteName: 'Site A',
      hourlyRate: 190,
      effectiveDate: '2026-04-01',
      note: null,
      createdAt: '2026-04-21T12:00:00.000Z',
      updatedAt: '2026-04-21T12:00:00.000Z',
    },
    {
      id: 'HR002',
      employeeCode: 'E002',
      employeeName: 'Bob',
      siteCode: 'B',
      siteName: 'Site B',
      hourlyRate: 200,
      effectiveDate: '2026-04-01',
      note: 'adjusted',
      createdAt: '2026-04-21T12:00:00.000Z',
      updatedAt: '2026-04-21T12:00:00.000Z',
    },
  ];

  const filteredHourlyRates = !keyword
    ? hourlyRates
    : hourlyRates.filter((item) => {
        return (
          item.employeeCode.includes(keyword) ||
          item.employeeName.includes(keyword) ||
          item.siteName.includes(keyword)
        );
      });

  return res.json({
    items: filteredHourlyRates,
  });
});

app.get('/api/payroll', (req, res) => {
  const yearMonth = String(req.query.yearMonth ?? '').trim();

  const payrollResults = [
    {
      id: 'PR001',
      yearMonth: '2026-04',
      employeeCode: 'E001',
      employeeName: 'Amy',
      grossAmount: 30400,
      baseSalary: 28590,
      overtimePay: 1810,
      extendedOvertimePay: 0,
      baseSalaryAdjustment: 0,
      totalAmount: 30400,
      calculatedAt: '2026-04-21T13:00:00.000Z',
    },
    {
      id: 'PR002',
      yearMonth: '2026-04',
      employeeCode: 'E002',
      employeeName: 'Bob',
      grossAmount: 27000,
      baseSalary: 28590,
      overtimePay: 0,
      extendedOvertimePay: 0,
      baseSalaryAdjustment: -1590,
      totalAmount: 27000,
      calculatedAt: '2026-04-21T13:00:00.000Z',
    },
  ];

  const filteredPayrollResults = !yearMonth
    ? payrollResults
    : payrollResults.filter((item) => item.yearMonth === yearMonth);

  return res.json({
    items: filteredPayrollResults,
  });
});

app.post('/api/payroll/calculate', (req, res) => {
  const yearMonth = String(req.body.yearMonth ?? '').trim();

  return res.json({
    message: yearMonth ? `${yearMonth} payroll calculated` : 'payroll calculated',
  });
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
