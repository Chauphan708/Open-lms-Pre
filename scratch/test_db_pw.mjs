import pg from 'pg';

const passwords = ["Chauphan1708", "ptchau1708", "Chauphan708", "Chauphan708!"];

async function test() {
  for (const pw of passwords) {
    const connectionString = `postgresql://postgres:${pw}@db.qukuafjaqkcmcegksovp.supabase.co:5432/postgres`;
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      await pool.query('SELECT 1');
      console.log(`SUCCESS with password: ${pw}`);
      await pool.end();
      break;
    } catch (e) {
      console.log(`Failed with password: ${pw}. Error: ${e.message}`);
      await pool.end();
    }
  }
}

test();
