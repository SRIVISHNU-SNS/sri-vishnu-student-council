const fs = require('fs/promises');
const path = require('path');
const { db, databasePath } = require('./db');

async function main() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT NOT NULL PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationDir = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();

  for (const file of files) {
    const applied = db.prepare('SELECT id FROM schema_migrations WHERE id = ?').get(file);
    if (applied) continue;

    const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (id) VALUES (?)').run(file);
    });
    applyMigration();
    console.log(`Applied migration ${file}`);
  }

  console.log(`SQLite database ready at ${databasePath}`);
  db.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
