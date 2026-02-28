# 🌱 FarmConnect - Agricultural Marketplace

> ✅ **No Python required. No C++ build tools. Works on any Windows/Mac/Linux machine.**

## 🚀 Quick Start (3 Steps)

### Step 1 – Make sure Node.js is installed
Download from: https://nodejs.org (choose LTS version)

### Step 2 – Install dependencies
Open a terminal/command prompt in this folder and run:
```bash
npm install
```
> This should complete in ~10 seconds with no errors. Only pure JavaScript packages are used.

### Step 3 – Start the server
```bash
npm start
```

### Step 4 – Open in browser
Visit: **http://localhost:3000**

---

## 👤 Demo Accounts

| Role   | Email                  | Password   |
|--------|------------------------|------------|
| Admin  | harsh@farmconnect.in   | admin123   |
| Farmer | ramesh@gmail.com       | farmer123  |
| Buyer  | priya@gmail.com        | buyer123   |

---

## ✅ Why This Version Works on Windows

Previous version used `better-sqlite3` which requires:
- Python 3
- C++ build tools (Visual Studio)
- node-gyp compilation

**This version uses:**
- Pure JavaScript JSON file-based database
- Zero native modules
- Zero compilation step
- Works out of the box on **Windows, Mac, Linux**

---

## 📁 Project Structure

```
farmconnect/
├── server.js        ← Express backend + all API routes
├── db.js            ← Pure JS database (JSON files)
├── seed.js          ← Seeds demo data on first run
├── package.json     ← Only pure-JS dependencies
├── data/            ← Auto-created; stores all data as JSON
│   ├── users.json
│   ├── products.json
│   └── contacts.json
├── public/
│   └── index.html   ← Complete frontend (single file)
└── README.md
```

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 Auth | Login, Register, Logout (JWT, persists on refresh) |
| 👥 Roles | Admin / Farmer / Buyer (different UI per role) |
| 🛒 Marketplace | Browse, search, filter products |
| 📋 My Products | Farmer: add, edit, delete own listings |
| 📊 Dashboard | Stats + recent products |
| 🌤️ Weather | Live forecast via wttr.in (no API key needed) |
| 📞 Contact | Form saves to database |
| 👤 User Mgmt | Admin can add/disable/verify/delete users |
| ⚙️ Settings | Update profile + change password |
| 📰 News & Knowledge Hub | Agricultural content |

---

## 🌤️ Weather

Powered by **wttr.in** (free, no API key).
Requires active internet connection.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JS |
| Backend | Node.js + Express.js |
| Database | JSON files (pure JS, no compilation) |
| Auth | JWT + bcryptjs |
| Weather | wttr.in free API |
