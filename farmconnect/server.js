const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();
const db = new Database('farmconnect.db');
const JWT_SECRET = 'farmconnect_jwt_secret_2024_secure';
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── DATABASE SETUP ─────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'buyer',
    location TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    verified INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT DEFAULT '',
    price REAL NOT NULL,
    unit TEXT DEFAULT 'kg',
    quantity INTEGER DEFAULT 0,
    location TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    harvest_date TEXT,
    tier TEXT DEFAULT 'standard',
    seller_id INTEGER,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seller_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    quantity INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// ─── SEED DATA ───────────────────────────────────────────────────
function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) return;

  console.log('🌱 Seeding database with sample data...');

  const adminHash = bcrypt.hashSync('admin123', 10);
  const farmerHash = bcrypt.hashSync('farmer123', 10);
  const buyerHash = bcrypt.hashSync('buyer123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (name,email,password,role,location,phone,verified,status) VALUES (?,?,?,?,?,?,?,?)'
  );

  insertUser.run('Harsh Choudhary', 'harsh@farmconnect.in', adminHash, 'admin', 'New Delhi, India', '9304782747', 1, 'active');
  const farmerId = insertUser.run('Ramesh Kumar', 'ramesh@gmail.com', farmerHash, 'farmer', 'Haryana, India', '9876543210', 1, 'active').lastInsertRowid;
  insertUser.run('Suresh Patel', 'suresh@gmail.com', farmerHash, 'farmer', 'Gujarat, India', '9812345678', 0, 'active');
  insertUser.run('Priya Singh', 'priya@gmail.com', buyerHash, 'buyer', 'Mumbai, India', '9998765432', 1, 'active');

  const insertProduct = db.prepare(
    'INSERT INTO products (name,category,description,price,unit,quantity,location,phone,harvest_date,tier,seller_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  );

  insertProduct.run('Apple (Shimla)', 'fruits', 'Fresh red apples from Shimla hills, crisp and sweet', 150, 'kg', 250, 'Himachal Pradesh, India', '93047827476', '2024-11-15', 'premium', farmerId);
  insertProduct.run('Wheat Seeds (HD-2967)', 'seeds', 'High-yielding wheat variety suitable for North Indian plains', 45, 'kg', 200, 'Haryana, India', '93047827476', null, 'standard', farmerId);
  insertProduct.run('Organic Fertilizer', 'fertilizer', '100% organic compost fertilizer for all crops', 15, 'kg', 1000, 'Karnataka, India', '93047827476', null, 'premium', farmerId);
  insertProduct.run('Premium Basmati Rice', 'rice', 'Aged basmati rice with extra long grains', 120, 'kg', 500, 'Punjab, India', '93047827476', '2024-10-20', 'premium', farmerId);
  insertProduct.run('Farm Tractor (Second Hand)', 'equipment', 'Mahindra 475 DI, 2019 model, good condition', 450000, 'piece', 1, 'Rajasthan, India', '93047827476', null, 'standard', farmerId);
  insertProduct.run('Tomato (Desi)', 'vegetables', 'Farm-fresh desi tomatoes, no pesticides', 25, 'kg', 300, 'Maharashtra, India', '93047827476', null, 'standard', farmerId);
  insertProduct.run('Sunflower Seeds', 'seeds', 'High oil content sunflower seeds for planting', 35, 'kg', 150, 'Karnataka, India', '93047827476', null, 'standard', farmerId);
  insertProduct.run('DAP Fertilizer', 'fertilizer', 'Di-ammonium phosphate fertilizer for fast growth', 1350, 'kg', 200, 'Haryana, India', '93047827476', null, 'premium', farmerId);
  insertProduct.run('Mango (Alphonso)', 'fruits', 'Premium Alphonso mangoes from Ratnagiri', 200, 'kg', 100, 'Maharashtra, India', '93047827476', null, 'premium', farmerId);
  insertProduct.run('Onion', 'vegetables', 'Fresh onions, large size', 20, 'kg', 600, 'Maharashtra, India', '93047827476', null, 'standard', farmerId);
  insertProduct.run('Paddy Seeds (IR-64)', 'seeds', 'IR-64 paddy variety suitable for lowland farming', 55, 'kg', 300, 'Odisha, India', '93047827476', null, 'standard', farmerId);

  console.log('✅ Database seeded successfully!');
}
seedDatabase();

// ─── MIDDLEWARE ──────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function farmerOrAdmin(req, res, next) {
  if (!['farmer', 'admin'].includes(req.user.role)) return res.status(403).json({ error: 'Farmer or Admin access required' });
  next();
}

// ─── AUTH ROUTES ─────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password, role, location, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (existing) return res.status(400).json({ error: 'This email is already registered' });

    const hash = bcrypt.hashSync(password, 10);
    const allowedRoles = ['buyer', 'farmer'];
    const userRole = allowedRoles.includes(role) ? role : 'buyer';
    const result = db.prepare(
      'INSERT INTO users (name,email,password,role,location,phone) VALUES (?,?,?,?,?,?)'
    ).run(name, email, hash, userRole, location || '', phone || '');

    const user = db.prepare('SELECT id,name,email,role,location,phone,verified,status,created_at FROM users WHERE id=?').get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.status === 'inactive') return res.status(403).json({ error: 'Your account has been disabled' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,location,phone,verified,status,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.put('/api/auth/profile', authMiddleware, (req, res) => {
  const { name, location, phone } = req.body;
  db.prepare('UPDATE users SET name=?,location=?,phone=? WHERE id=?').run(name, location, phone, req.user.id);
  res.json({ success: true });
});

app.put('/api/auth/password', authMiddleware, (req, res) => {
  const { current, newPassword } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(current, user.password)) return res.status(400).json({ error: 'Current password is incorrect' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password=? WHERE id=?').run(hash, req.user.id);
  res.json({ success: true });
});

// ─── PRODUCTS ROUTES ─────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category, location, search } = req.query;
  let query = `SELECT p.*, u.name as seller_name, u.phone as seller_phone 
               FROM products p LEFT JOIN users u ON p.seller_id=u.id 
               WHERE p.status='active'`;
  const params = [];
  if (category) { query += ' AND p.category=?'; params.push(category); }
  if (location) { query += ' AND p.location LIKE ?'; params.push(`%${location}%`); }
  if (search) { query += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  query += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

app.get('/api/products/my', authMiddleware, farmerOrAdmin, (req, res) => {
  const products = db.prepare(`SELECT p.*, u.name as seller_name FROM products p 
    LEFT JOIN users u ON p.seller_id=u.id 
    WHERE p.seller_id=? AND p.status='active' 
    ORDER BY p.created_at DESC`).all(req.user.id);
  res.json(products);
});

app.post('/api/products', authMiddleware, farmerOrAdmin, (req, res) => {
  try {
    const { name, category, description, price, unit, quantity, location, phone, harvest_date, tier } = req.body;
    if (!name || !category || !price) return res.status(400).json({ error: 'Name, category and price are required' });
    const result = db.prepare(
      'INSERT INTO products (name,category,description,price,unit,quantity,location,phone,harvest_date,tier,seller_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    ).run(name, category, description || '', parseFloat(price), unit || 'kg', parseInt(quantity) || 0, location || '', phone || '', harvest_date || null, tier || 'standard', req.user.id);
    res.json(db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id=? AND status="active"').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });

  const { name, category, description, price, unit, quantity, location, phone, harvest_date, tier } = req.body;
  db.prepare('UPDATE products SET name=?,category=?,description=?,price=?,unit=?,quantity=?,location=?,phone=?,harvest_date=?,tier=? WHERE id=?')
    .run(name, category, description, parseFloat(price), unit, parseInt(quantity), location, phone, harvest_date || null, tier, req.params.id);
  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Not found' });
  if (product.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorized' });
  db.prepare('UPDATE products SET status="deleted" WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── WEATHER ROUTE ───────────────────────────────────────────────
app.get('/api/weather', (req, res) => {
  const city = req.query.city || 'Delhi';
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;

  const request = https.get(url, { headers: { 'User-Agent': 'FarmConnect/1.0' } }, (response) => {
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const json = JSON.parse(data);
        const curr = json.current_condition[0];
        res.json({
          city: json.nearest_area?.[0]?.areaName?.[0]?.value || city,
          state: json.nearest_area?.[0]?.region?.[0]?.value || '',
          country: json.nearest_area?.[0]?.country?.[0]?.value || 'India',
          temp_c: parseInt(curr.temp_C),
          feels_like: parseInt(curr.FeelsLikeC),
          humidity: parseInt(curr.humidity),
          wind_speed: parseInt(curr.windspeedKmph),
          wind_dir: curr.winddir16Point,
          description: curr.weatherDesc[0].value,
          uv: parseInt(curr.uvIndex),
          visibility: parseInt(curr.visibility),
          cloud_cover: parseInt(curr.cloudcover),
          pressure: parseInt(curr.pressure),
          forecast: (json.weather || []).slice(0, 3).map(d => ({
            date: d.date,
            max: parseInt(d.maxtempC),
            min: parseInt(d.mintempC),
            desc: d.hourly?.[4]?.weatherDesc?.[0]?.value || '',
            rain_chance: d.hourly?.[4]?.chanceofrain || '0'
          }))
        });
      } catch {
        res.status(500).json({ error: 'Could not parse weather data' });
      }
    });
  });

  request.on('error', () => {
    res.status(500).json({ error: 'Weather service unavailable. Please check your internet connection.' });
  });

  request.setTimeout(8000, () => {
    request.destroy();
    res.status(500).json({ error: 'Weather request timed out' });
  });
});

// ─── CONTACT ROUTE ───────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ error: 'Name, email and message are required' });
  db.prepare('INSERT INTO contacts (name,email,phone,subject,message) VALUES (?,?,?,?,?)').run(name, email, phone || '', subject || '', message);
  res.json({ success: true, message: 'Your message has been sent! We will reply within 24 hours.' });
});

app.get('/api/contacts', authMiddleware, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all());
});

// ─── USERS ROUTES (admin) ────────────────────────────────────────
app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id,name,email,role,location,phone,verified,status,created_at FROM users ORDER BY created_at DESC').all());
});

app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
  const { name, email, password, role, location, phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Required fields missing' });
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return res.status(400).json({ error: 'Email already exists' });
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name,email,password,role,location,phone) VALUES (?,?,?,?,?,?)').run(name, email, hash, role || 'buyer', location || '', phone || '');
  const user = db.prepare('SELECT id,name,email,role,location,phone,verified,status,created_at FROM users WHERE id=?').get(result.lastInsertRowid);
  res.json(user);
});

app.put('/api/users/:id/status', authMiddleware, adminOnly, (req, res) => {
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare('UPDATE users SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

app.put('/api/users/:id/verify', authMiddleware, adminOnly, (req, res) => {
  const user = db.prepare('SELECT verified FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET verified=? WHERE id=?').run(user.verified ? 0 : 1, req.params.id);
  res.json({ success: true });
});

app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ─── STATS ───────────────────────────────────────────────────────
app.get('/api/stats', authMiddleware, (req, res) => {
  const products = db.prepare('SELECT COUNT(*) as c FROM products WHERE status="active"').get().c;
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const contacts = db.prepare('SELECT COUNT(*) as c FROM contacts').get().c;
  res.json({ products, users, contacts, activity: 'Active' });
});

// ─── CATCH ALL ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌱 FarmConnect is running!`);
  console.log(`🌐 Open: http://localhost:${PORT}`);
  console.log(`\n📋 Demo Accounts:`);
  console.log(`   Admin  → harsh@farmconnect.in  / admin123`);
  console.log(`   Farmer → ramesh@gmail.com       / farmer123`);
  console.log(`   Buyer  → priya@gmail.com        / buyer123\n`);
});
