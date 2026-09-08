import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { db } from './db.js';

const upsertUser = db.prepare(`
  INSERT INTO users (username, password_hash) VALUES (?, ?)
  ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash
`);

function seedUser(name, password) {
  if (!name || !password) {
    throw new Error('Both USER1_NAME/USER1_PASSWORD and USER2_NAME/USER2_PASSWORD must be set in .env');
  }
  const hash = bcrypt.hashSync(password, 10);
  upsertUser.run(name, hash);
  console.log(`Seeded user: ${name}`);
}

seedUser(process.env.USER1_NAME, process.env.USER1_PASSWORD);
seedUser(process.env.USER2_NAME, process.env.USER2_PASSWORD);

console.log('Done.');
