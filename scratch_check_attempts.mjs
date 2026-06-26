import pg from 'pg';

async function check() {
  const connectionString = "postgresql://postgres.qukuafjaqkcmcegksovp:Chauphan708@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  const pool = new pg.Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT * FROM public.arena_tower_attempts
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    console.log("Recent attempts in DB (Bypassing RLS):", JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    await pool.end();
  }
}

check();
