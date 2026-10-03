const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'db.jddbiytluavjidmpkzxq.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'Poiuqwer#1983',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function importData() {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!');

    console.log('Reading SQL file...');
    const sql = fs.readFileSync('/tmp/postgres_data.sql', 'utf8');

    // Split by semicolons and execute each statement
    const statements = sql.split(';').filter(s => s.trim());

    console.log(`Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        try {
          await client.query(stmt);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        } catch (err) {
          console.error(`❌ Error in statement ${i + 1}:`, err.message);
        }
      }
    }

    console.log('✅ Data import complete!');

    // Verify data
    const result = await client.query('SELECT COUNT(*) FROM homes');
    console.log(`Total homes imported: ${result.rows[0].count}`);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

importData();
