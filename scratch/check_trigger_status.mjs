import pg from 'pg';

const checkTrigger = async () => {
  console.log('DATABASE_URL env:', process.env.DATABASE_URL);
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Chauphan708@db.qukuafjaqkcmcegksovp.supabase.co:5432/postgres";
  const pool = new pg.Pool({ connectionString });
  
  try {
    // Check triggers on profiles
    const triggersRes = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = 'profiles';
    `);
    console.log('--- TRIGGERS ON profiles ---');
    console.log(triggersRes.rows);

    // Check functions
    const funcRes = await pool.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name LIKE '%profile%';
    `);
    console.log('--- PROFILE FUNCTIONS ---');
    console.log(funcRes.rows);

    // Let's count profiles vs auth.users
    const countProfiles = await pool.query('SELECT count(*) FROM public.profiles');
    const countAuth = await pool.query('SELECT count(*) FROM auth.users');
    console.log(`Profiles count: ${countProfiles.rows[0].count}`);
    console.log(`Auth.users count: ${countAuth.rows[0].count}`);

    // Let's print students in profiles that do not exist in auth.users
    const diffRes = await pool.query(`
      SELECT id, email, role, name, password
      FROM public.profiles p
      WHERE NOT EXISTS (
        SELECT 1 FROM auth.users u WHERE u.email = p.email
      )
      LIMIT 10;
    `);
    console.log('--- PROFILES NOT IN AUTH.USERS ---');
    console.log(diffRes.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
};

checkTrigger();
