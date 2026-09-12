import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Użycie: node scripts/provision-admin.mjs admin@example.pl');
  process.exit(2);
}

const dataDir = resolve(process.env.DATA_DIR ?? './data');
const databasePath = resolve(process.env.DATABASE_PATH ?? `${dataDir}/job.sqlite`);
const db = new DatabaseSync(databasePath);

try {
  const user = db.prepare('SELECT id,email,role FROM users WHERE lower(email)=lower(?)').get(email);
  if (!user) {
    console.error(`Nie znaleziono istniejącego konta: ${email}`);
    process.exitCode = 1;
  } else {
    const timestamp = new Date().toISOString();
    db.prepare("UPDATE users SET role='ADMIN', updated_at=? WHERE id=?").run(timestamp, user.id);
    console.log(`ADMIN_PROVISIONED ${user.email}`);
  }
} finally {
  db.close();
}
