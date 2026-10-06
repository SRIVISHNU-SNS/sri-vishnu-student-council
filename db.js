const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const configuredPath = process.env.SQLITE_DB_PATH || path.join(__dirname, 'data', 'sri-vishnu.sqlite');
const databasePath = configuredPath === ':memory:' ? configuredPath : path.resolve(configuredPath);

if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

module.exports = { db, databasePath };
