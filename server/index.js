require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { SLOTS, validateReading } = require('./validation');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const tokenFor = user => jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
function auth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Please log in to continue.' }); }
}
const slotLabel = { morning: 'Morning (fasting)', after_breakfast: 'After breakfast', after_lunch: 'After lunch', after_dinner: 'After dinner' };

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows: [user] } = await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email', [name.trim(), email.trim().toLowerCase(), hash]);
    res.status(201).json({ token: tokenFor(user), user });
  } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' }); throw e; }
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const { rows: [user] } = await pool.query('SELECT id,name,email,password_hash FROM users WHERE email=$1', [email?.trim().toLowerCase()]);
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
  delete user.password_hash;
  res.json({ token: tokenFor(user), user });
}));
app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
  const { rows: [user] } = await pool.query('SELECT id,name,email FROM users WHERE id=$1', [req.user.id]);
  if (!user) return res.status(401).json({ error: 'Account not found.' });
  res.json({ user });
}));

app.get('/api/readings', auth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id, reading_date AS date, slot, value FROM readings WHERE user_id=$1 ORDER BY reading_date DESC, CASE slot WHEN \'morning\' THEN 1 WHEN \'after_breakfast\' THEN 2 WHEN \'after_lunch\' THEN 3 ELSE 4 END', [req.user.id]);
  res.json(rows.map(r => ({ ...r, date: r.date.toISOString ? r.date.toISOString().slice(0,10) : String(r.date).slice(0,10) })));
}));
app.post('/api/readings', auth, asyncRoute(async (req, res) => {
  const error = validateReading(req.body); if (error) return res.status(400).json({ error });
  const { date, slot, value } = req.body;
  const { rows: [existing] } = await pool.query('SELECT slot FROM readings WHERE user_id=$1 AND reading_date=$2', [req.user.id, date]);
  const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int AS count FROM readings WHERE user_id=$1 AND reading_date=$2', [req.user.id, date]);
  if (existing?.slot === slot) return res.status(409).json({ error: `You already have an ${slotLabel[slot]} reading for this date.` });
  const { rows: same } = await pool.query('SELECT 1 FROM readings WHERE user_id=$1 AND reading_date=$2 AND slot=$3', [req.user.id, date, slot]);
  if (same.length) return res.status(409).json({ error: `You already have an ${slotLabel[slot]} reading for this date.` });
  if (count >= 4) return res.status(409).json({ error: 'You can add only 4 readings per day.' });
  const { rows: [row] } = await pool.query('INSERT INTO readings(user_id,reading_date,slot,value) VALUES($1,$2,$3,$4) RETURNING id,reading_date AS date,slot,value', [req.user.id, date, slot, Number(value)]);
  res.status(201).json({ ...row, date: String(row.date).slice(0,10) });
}));
app.put('/api/readings/:id', auth, asyncRoute(async (req, res) => {
  const error = validateReading(req.body); if (error) return res.status(400).json({ error });
  const { date, slot, value } = req.body;
  const { rows: [current] } = await pool.query('SELECT id,reading_date AS date,slot FROM readings WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!current) return res.status(404).json({ error: 'Reading not found.' });
  const { rows: [conflict] } = await pool.query('SELECT id FROM readings WHERE user_id=$1 AND reading_date=$2 AND slot=$3 AND id<>$4', [req.user.id,date,slot,req.params.id]);
  if (conflict) return res.status(409).json({ error: `You already have an ${slotLabel[slot]} reading for this date.` });
  if (String(current.date).slice(0,10) !== date) {
    const { rows: [{ count }] } = await pool.query('SELECT COUNT(*)::int AS count FROM readings WHERE user_id=$1 AND reading_date=$2 AND id<>$3', [req.user.id,date,req.params.id]);
    if (count >= 4) return res.status(409).json({ error: 'You can add only 4 readings per day.' });
  }
  const { rows: [row] } = await pool.query('UPDATE readings SET reading_date=$1,slot=$2,value=$3 WHERE id=$4 AND user_id=$5 RETURNING id,reading_date AS date,slot,value', [date,slot,Number(value),req.params.id,req.user.id]);
  res.json({ ...row, date: String(row.date).slice(0,10) });
}));
app.delete('/api/readings/:id', auth, asyncRoute(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM readings WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rowCount) return res.status(404).json({ error: 'Reading not found.' });
  res.status(204).end();
}));
app.get('/api/reports', auth, asyncRoute(async (req, res) => {
  const { date } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || date > new Date().toISOString().slice(0,10)) return res.status(400).json({ error: 'Please choose a valid date that is not in the future.' });
  const monthStart = `${date.slice(0,7)}-01`;
  const previous = new Date(`${monthStart}T00:00:00Z`); previous.setUTCDate(0);
  const previousStart = previous.toISOString().slice(0,10), previousEnd = `${previous.toISOString().slice(0,7)}-${String(new Date(Date.UTC(previous.getUTCFullYear(), previous.getUTCMonth()+1,0)).getUTCDate()).padStart(2,'0')}`;
  const [daily, mtd, monthly, list] = await Promise.all([
    pool.query('SELECT COUNT(*)::int count, MAX(value)::int highest, MIN(value)::int lowest, ROUND(AVG(value)::numeric,1)::float average FROM readings WHERE user_id=$1 AND reading_date=$2',[req.user.id,date]),
    pool.query('SELECT COUNT(*)::int count, MAX(value)::int highest, MIN(value)::int lowest, ROUND(AVG(value)::numeric,1)::float average FROM readings WHERE user_id=$1 AND reading_date BETWEEN $2 AND $3',[req.user.id,monthStart,date]),
    pool.query('SELECT COUNT(*)::int count, MAX(value)::int highest, MIN(value)::int lowest, ROUND(AVG(value)::numeric,1)::float average FROM readings WHERE user_id=$1 AND reading_date BETWEEN $2 AND $3',[req.user.id,previousStart,previousEnd]),
    pool.query('SELECT id, reading_date AS date, slot, value FROM readings WHERE user_id=$1 AND reading_date=$2 ORDER BY CASE slot WHEN \'morning\' THEN 1 WHEN \'after_breakfast\' THEN 2 WHEN \'after_lunch\' THEN 3 ELSE 4 END',[req.user.id,date])
  ]);
  const shape = result => result.rows[0];
  res.json({ daily: shape(daily), monthToDate: shape(mtd), monthly: shape(monthly), readings: list.rows.map(r=>({...r,date:String(r.date).slice(0,10)})), ranges: { daily: date, monthToDate: `${monthStart} – ${date}`, monthly: `${previousStart} – ${previousEnd}` } });
}));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Something went wrong. Please try again.' }); });
const port = process.env.PORT || 4000;
if (require.main === module) app.listen(port, () => console.log(`Sweety API listening on ${port}`));
module.exports = { app, pool };
