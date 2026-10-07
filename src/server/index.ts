import { createFaroApp } from './faroApp.js';
import { createPgFaroApp } from './pgFaroApp.js';

const engine=process.env.FARO_DATABASE_ENGINE??'sqlite';
if(engine!=='sqlite'&&engine!=='postgresql')throw new Error('Nieprawidłowy FARO_DATABASE_ENGINE.');
const pgOptions=()=>{const connectionString=process.env.FARO_PG_URL,schema=process.env.FARO_PG_SCHEMA;if(!connectionString||!schema)throw new Error('Wymagane FARO_PG_URL i FARO_PG_SCHEMA.');return {connection:{connectionString},schema};};
const app = engine==='postgresql'?await createPgFaroApp(pgOptions()):createFaroApp();
app.server.listen(app.config.port, () => {
  console.log(`Job działa na ${app.config.appOrigin} (port ${app.config.port}).`);
});

const shutdown = async (): Promise<void> => {
  try { await app.close(); } finally { process.exit(0); }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
