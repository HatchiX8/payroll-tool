import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ message: 'ok' });
});

// 模擬員工資料 API
app.get('/api/employees', (req, res) => {
  const keyword = String(req.query.keyword ?? '').trim();

  const employees = [
    { employeeCode: 'E001', chineseName: '王小明', phone: '0912345678', status: 'active' },
    { employeeCode: 'E002', chineseName: '李小華', phone: '0922333444', status: 'inactive' },
  ];

  const filteredEmployees = !keyword
    ? employees
    : employees.filter((employee) => {
        return employee.employeeCode.includes(keyword) || employee.chineseName.includes(keyword);
      });

  return res.json({
    items: filteredEmployees,
  });
});

app.get('/api/attendance', (req, res) => {
  const yearMonth = String(req.query.yearMonth ?? '').trim();

  const attendanceList = [
    {
      employeeCode: 'E001',
      chineseName: '王小明',
      siteName: '台北場',
      yearMonth: '2026-04',
      totalHours: 160,
    },
    {
      employeeCode: 'E002',
      chineseName: '李小華',
      siteName: '高雄場',
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
      employeeName: '王小明',
      siteCode: 'A',
      siteName: '案場A',
      hourlyRate: 190,
      effectiveDate: '2026-04-01',
      note: null,
      createdAt: '2026-04-21T12:00:00.000Z',
      updatedAt: '2026-04-21T12:00:00.000Z',
    },
    {
      id: 'HR002',
      employeeCode: 'E002',
      employeeName: '李小華',
      siteCode: 'B',
      siteName: '案場B',
      hourlyRate: 200,
      effectiveDate: '2026-04-01',
      note: '夜班',
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
      employeeName: '王小明',
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
      employeeName: '李小華',
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
    message: yearMonth ? `${yearMonth} 薪資計算完成` : '薪資計算完成',
  });
});

app.get('/api/report', (req, res) => {
  const { startMonth, endMonth } = req.query;

  const data = [
    {
      id: 'R001',
      yearMonth: '2026-04',
      employeeCode: 'E001',
      employeeName: '王小明',
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
