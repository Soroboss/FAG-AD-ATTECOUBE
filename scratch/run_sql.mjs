import fs from 'fs';

const apiKey = "ik_2019288adf68970ae1c0c6d4f42a9481";
const baseUrl = "https://zx2bx4r6.eu-central.insforge.app";
const url = `${baseUrl}/api/database/advance/rawsql`;

async function run() {
  const initSql = fs.readFileSync('db/init.sql', 'utf8');
  const fixSql = fs.readFileSync('scratch_fix_db.sql', 'utf8');
  const query = initSql + '\n' + fixSql;

  console.log("Executing SQL...");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      apikey: apiKey
    },
    body: JSON.stringify({ query, params: [] }),
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${text}`);
}

run().catch(console.error);
