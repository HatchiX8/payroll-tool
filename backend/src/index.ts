import './db/init-db';
import express from 'express';
import cors from 'cors';
import { attendanceRouter } from './modules/attendance/attendance';
import { employeeRouter } from './modules/employee/employee';
import { hourlyRateRouter } from './modules/hourlyRate/hourlyRate';
import { payrollRouter } from './modules/payroll/payroll';
import { reportRouter } from './modules/report/report';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/api/employees', employeeRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/hourly-rates', hourlyRateRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/payroll/report', reportRouter);

app.get('/api/health', (_req, res) => {
  res.json({ message: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
