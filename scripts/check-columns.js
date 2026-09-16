const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env','utf-8').match(/DATABASE_URL="([^"]+)"/)[1];
const c = new Client({ connectionString: env, ssl: { rejectUnauthorized: false } });
async function main() {
  await c.connect();
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='apis_integracao' ORDER BY ordinal_position");
  console.log('apis_integracao columns:', r.rows.map(x => x.column_name).join(', '));
  const r2 = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='sistemas_integracao' ORDER BY ordinal_position");
  console.log('sistemas_integracao columns:', r2.rows.map(x => x.column_name).join(', '));
  await c.end();
}
main();
