require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { localDate } = require('./validation');
async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const hash = await bcrypt.hash('SweetyDemo123!', 12);
    const { rows: [user] } = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id', ['Demo Patient','demo@sweety.app',hash]);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const today = localDate(timeZone);
    const data = [['morning',108],['after_breakfast',142],['after_lunch',126],['after_dinner',119]];
    for (const [slot,value] of data) await pool.query('INSERT INTO readings(user_id,reading_date,slot,value) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,reading_date,slot) DO UPDATE SET value=EXCLUDED.value',[user.id,today,slot,value]);
    console.log('Demo account: demo@sweety.app / SweetyDemo123!');
  } finally { await pool.end(); }
}
seed().catch(e=>{console.error(e);process.exit(1);});
