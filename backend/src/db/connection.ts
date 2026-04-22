import Database from 'better-sqlite3';

export const db: Database.Database = new Database('./src/db/payroll.db');
