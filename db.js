// ════════════════════════════════════════════════════
//  db.js  –  Pure-JS JSON file-based database
//  No native modules. No Python. No build tools.
// ════════════════════════════════════════════════════
const fs   = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(table) { return path.join(DATA_DIR, `${table}.json`); }

function readTable(table) {
  const fp = filePath(table);
  if (!fs.existsSync(fp)) { fs.writeFileSync(fp, JSON.stringify({ rows: [], nextId: 1 })); }
  try { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
  catch { return { rows: [], nextId: 1 }; }
}

function writeTable(table, data) {
  fs.writeFileSync(filePath(table), JSON.stringify(data, null, 2));
}

class Table {
  constructor(name) { this.name = name; }

  _load() { return readTable(this.name); }
  _save(data) { writeTable(this.name, data); }

  all(predicate) {
    const { rows } = this._load();
    return predicate ? rows.filter(predicate) : rows;
  }

  get(predicate) {
    return this._load().rows.find(predicate) || null;
  }

  insert(record) {
    const data = this._load();
    const row = { ...record, id: data.nextId++, created_at: new Date().toISOString() };
    data.rows.push(row);
    this._save(data);
    return row;
  }

  update(predicate, changes) {
    const data = this._load();
    let updated = 0;
    data.rows = data.rows.map(r => {
      if (predicate(r)) { updated++; return { ...r, ...changes }; }
      return r;
    });
    this._save(data);
    return updated;
  }

  delete(predicate) {
    const data = this._load();
    const before = data.rows.length;
    data.rows = data.rows.filter(r => !predicate(r));
    this._save(data);
    return before - data.rows.length;
  }

  count(predicate) {
    return this.all(predicate).length;
  }
}

const db = {
  users:    new Table('users'),
  products: new Table('products'),
  contacts: new Table('contacts'),
};

module.exports = db;
