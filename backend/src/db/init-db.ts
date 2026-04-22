import fs from 'fs'
import path from 'path'
import { db } from './connection'

const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql')
const schema = fs.readFileSync(schemaPath, 'utf-8')

db.exec(schema)

const employeeColumns = db.prepare("PRAGMA table_info(employees)").all() as Array<{ name: string }>
const hasPhoneColumn = employeeColumns.some((column) => column.name === 'phone')

if (!hasPhoneColumn) {
  db.exec("ALTER TABLE employees ADD COLUMN phone TEXT NOT NULL DEFAULT ''")
}

console.log('DB initialized')
