const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for database migrations.');
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(120) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const migrationDir = path.join(__dirname, 'migrations');
    const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      const [rows] = await connection.query('SELECT id FROM schema_migrations WHERE id = ?', [file]);
      if (rows.length) continue;
      const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
      await connection.beginTransaction();
      try {
        for (const statement of sql.split(';').map((item) => item.trim()).filter(Boolean)) {
          await connection.query(statement);
        }
        await connection.query('INSERT INTO schema_migrations (id) VALUES (?)', [file]);
        await connection.commit();
        console.log(`Applied migration ${file}`);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
