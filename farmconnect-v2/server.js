// ════════════════════════════════════════════════════════════════
//  server.js  –  FarmConnect Backend
//  Pure JS. No Python. No native modules. Works on Windows/Mac/Linux
// ════════════════════════════════════════════════════════════════
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const https   = require('https');
const path    = require('path');
const db      = require('./db');
const seed    = require('./seed');

const app        = express();
const JWT_SECRET = 'farmconnect_jwt_secret_2024_secure_key';
const PORT       = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Seed demo data on startup
seed();

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function farmerOrAdmin(req, res, next) {
  if (!['farmer','admin'].includes(req.user.role))
    return res.status(403).json({ error: 'Farmer or Admin access required' });
  next();
}

// ─────────────────────────────────────────────
//  AUTH ROUTES
// ─────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, location, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (db.users.get(u => u.email === email))
      return res.status(400).json({ error: 'This email is already registered' });

    const hash     = bcrypt.hashSync(password, 10);
    const userRole = ['buyer','farmer'].includes(role) ? role : 'buyer';
    const user     = db.users.insert({ name, email, password:hash, role:userRole, location:location||'', phone:phone||'', verified:false, status:'active' });
    const { password:_, ...safe } = user;
    const token = jwt.sign({ id:user.id, email:user.email, role:user.role, name:user.name }, JWT_SECRET, { expiresIn:'7d' });
    res.json({ token, user:safe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = db.users.get(u => u.email === email);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid email or password' });
    if (user.status === 'inactive')
      return res.status(403).json({ error: 'Your account has been disabled. Contact support.' });

    const token = jwt.sign({ id:user.id, email:user.email, role:user.role, name:user.name }, JWT_SECRET, { expiresIn:'7d' });
    const { password:_, ...safe } = user;
    res.json({ token, user:safe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.users.get(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password:_, ...safe } = user;
  res.json(safe);
});

app.put('/api/auth/profile', auth, (req, res) => {
  const { name, location, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.users.update(u => u.id === req.user.id, { name, location:location||'', phone:phone||'' });
  res.json({ success:true });
});

app.put('/api/auth/password', auth, (req, res) => {
  const { current, newPassword } = req.body;
  const user = db.users.get(u => u.id === req.user.id);
  if (!bcrypt.compareSync(current, user.password))
    return res.status(400).json({ error: 'Current password is incorrect' });
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  db.users.update(u => u.id === req.user.id, { password: bcrypt.hashSync(newPassword, 10) });
  res.json({ success:true });
});

// ─────────────────────────────────────────────
//  PRODUCTS ROUTES
// ─────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category, location, search } = req.query;
  let rows = db.products.all(p => p.status === 'active');

  if (category) rows = rows.filter(p => p.category === category);
  if (location) rows = rows.filter(p => (p.location||'').toLowerCase().includes(location.toLowerCase()));
  if (search)   rows = rows.filter(p =>
    (p.name||'').toLowerCase().includes(search.toLowerCase()) ||
    (p.description||'').toLowerCase().includes(search.toLowerCase())
  );

  // Attach seller name
  rows = rows.map(p => {
    const seller = db.users.get(u => u.id === p.seller_id);
    return { ...p, seller_name: seller ? seller.name : '' };
  });

  res.json(rows.reverse()); // newest first
});

app.get('/api/products/my', auth, farmerOrAdmin, (req, res) => {
  const rows = db.products
    .all(p => p.seller_id === req.user.id && p.status === 'active')
    .reverse();
  res.json(rows);
});

app.post('/api/products', auth, farmerOrAdmin, (req, res) => {
  try {
    const { name, category, description, price, unit, quantity, location, phone, harvest_date, tier } = req.body;
    if (!name || !category || price === undefined)
      return res.status(400).json({ error: 'Name, category and price are required' });

    const product = db.products.insert({
      name, category,
      description: description||'',
      price: parseFloat(price),
      unit: unit||'kg',
      quantity: parseInt(quantity)||0,
      location: location||'',
      phone: phone||'',
      harvest_date: harvest_date||null,
      tier: tier||'standard',
      seller_id: req.user.id,
      status: 'active'
    });
    res.json(product);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/products/:id', auth, (req, res) => {
  const id      = parseInt(req.params.id);
  const product = db.products.get(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Not authorized to edit this product' });

  const { name, category, description, price, unit, quantity, location, phone, harvest_date, tier } = req.body;
  db.products.update(p => p.id === id, {
    name, category,
    description: description||'',
    price: parseFloat(price),
    unit: unit||'kg',
    quantity: parseInt(quantity)||0,
    location: location||'',
    phone: phone||'',
    harvest_date: harvest_date||null,
    tier: tier||'standard',
  });
  res.json(db.products.get(p => p.id === id));
});

app.delete('/api/products/:id', auth, (req, res) => {
  const id      = parseInt(req.params.id);
  const product = db.products.get(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Not authorized' });
  db.products.update(p => p.id === id, { status:'deleted' });
  res.json({ success:true });
});

// ─────────────────────────────────────────────
//  WEATHER  (uses wttr.in – no API key needed)
// ─────────────────────────────────────────────
app.get('/api/weather', (req, res) => {
  const city = (req.query.city || 'Delhi').trim();
  const url  = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;

  const request = https.get(url, { headers:{ 'User-Agent':'FarmConnect/1.0' } }, (response) => {
    let raw = '';
    response.on('data', d => raw += d);
    response.on('end', () => {
      try {
        const j    = JSON.parse(raw);
        const curr = j.current_condition[0];
        res.json({
          city:        j.nearest_area?.[0]?.areaName?.[0]?.value || city,
          state:       j.nearest_area?.[0]?.region?.[0]?.value   || '',
          country:     j.nearest_area?.[0]?.country?.[0]?.value  || 'India',
          temp_c:      parseInt(curr.temp_C),
          feels_like:  parseInt(curr.FeelsLikeC),
          humidity:    parseInt(curr.humidity),
          wind_speed:  parseInt(curr.windspeedKmph),
          wind_dir:    curr.winddir16Point,
          description: curr.weatherDesc[0].value,
          uv:          parseInt(curr.uvIndex),
          visibility:  parseInt(curr.visibility),
          cloud_cover: parseInt(curr.cloudcover),
          pressure:    parseInt(curr.pressure),
          forecast: (j.weather||[]).slice(0,3).map(d => ({
            date:       d.date,
            max:        parseInt(d.maxtempC),
            min:        parseInt(d.mintempC),
            desc:       d.hourly?.[4]?.weatherDesc?.[0]?.value || '',
            rain_chance:d.hourly?.[4]?.chanceofrain || '0'
          }))
        });
      } catch { res.status(500).json({ error:'Could not parse weather data' }); }
    });
  });

  request.on('error', () => res.status(500).json({ error:'Weather service unavailable. Check your internet connection.' }));
  request.setTimeout(8000, () => { request.destroy(); res.status(500).json({ error:'Weather request timed out' }); });
});

// ─────────────────────────────────────────────
//  CONTACT
// ─────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: 'Name, email and message are required' });
  db.contacts.insert({ name, email, phone:phone||'', subject:subject||'', message });
  res.json({ success:true, message:"Message received! We'll reply within 24 hours." });
});

app.get('/api/contacts', auth, adminOnly, (req, res) => {
  res.json(db.contacts.all().reverse());
});

// ─────────────────────────────────────────────
//  USERS (Admin only)
// ─────────────────────────────────────────────
app.get('/api/users', auth, adminOnly, (req, res) => {
  res.json(db.users.all().map(({ password:_, ...u }) => u).reverse());
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { name, email, password, role, location, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Required fields missing' });
  if (db.users.get(u => u.email === email)) return res.status(400).json({ error: 'Email already exists' });
  const user = db.users.insert({ name, email, password:bcrypt.hashSync(password,10), role:role||'buyer', location:location||'', phone:phone||'', verified:false, status:'active' });
  const { password:_, ...safe } = user;
  res.json(safe);
});

app.put('/api/users/:id/status', auth, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  if (!['active','inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot disable your own account' });
  db.users.update(u => u.id === id, { status });
  res.json({ success:true });
});

app.put('/api/users/:id/verify', auth, adminOnly, (req, res) => {
  const id   = parseInt(req.params.id);
  const user = db.users.get(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.users.update(u => u.id === id, { verified: !user.verified });
  res.json({ success:true });
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  const id = parseInt(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  db.users.delete(u => u.id === id);
  res.json({ success:true });
});

// ─────────────────────────────────────────────
//  STATS
// ─────────────────────────────────────────────
app.get('/api/stats', auth, (req, res) => {
  res.json({
    products: db.products.count(p => p.status === 'active'),
    users:    db.users.count(),
    contacts: db.contacts.count(),
  });
});

// ─────────────────────────────────────────────
//  SPA FALLBACK
// ─────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n🌱 FarmConnect is running!');
  console.log(`🌐 Open in browser: http://localhost:${PORT}`);
  console.log('\n📋 Demo Accounts:');
  console.log('   Admin  → harsh@farmconnect.in  / admin123');
  console.log('   Farmer → ramesh@gmail.com       / farmer123');
  console.log('   Buyer  → priya@gmail.com        / buyer123\n');
});
