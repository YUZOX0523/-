import { neon } from '@neondatabase/serverless';

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DB_NOT_CONFIGURED');
  }
  return neon(process.env.DATABASE_URL);
}

export async function initSchema(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      contact_name TEXT,
      contact_email TEXT,
      survey_token TEXT UNIQUE NOT NULL,
      results_token TEXT UNIQUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;
  // Migrate existing tables: add results_token if not present
  await sql`
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS results_token TEXT UNIQUE
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      respondent_name TEXT,
      respondent_department TEXT,
      respondent_role TEXT,
      answers TEXT NOT NULL,
      total_score REAL NOT NULL,
      category_scores TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

export function getDb() {
  return getSql();
}
