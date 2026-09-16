const { Client } = require('pg');
const fs = require('fs');
const env = fs.readFileSync('.env','utf-8').match(/DATABASE_URL="([^"]+)"/)[1];
const c = new Client({ connectionString: env, ssl: { rejectUnauthorized: false } });
async function main() {
  await c.connect();
  const s = await c.query('SELECT * FROM sistemas_integracao');
  const a = await c.query('SELECT * FROM apis_integracao');
  console.log('Sistemas:', JSON.stringify(s.rows, null, 2));
  console.log('APIs:', JSON.stringify(a.rows, null, 2));
  await c.end();
}
main();
