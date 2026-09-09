import 'dotenv/config';
import Database from 'better-sqlite3';

const dbPath = process.env.DB_PATH || './data/pairchat.db';
const db = new Database(dbPath, { readonly: true });

console.log(`\nDatabase: ${dbPath}\n`);

console.log('--- users ---');
console.table(db.prepare('SELECT id, username FROM users').all());

console.log('\n--- messages ---');
console.table(db.prepare('SELECT id, sender, body, created_at FROM messages ORDER BY id').all());

db.close();
