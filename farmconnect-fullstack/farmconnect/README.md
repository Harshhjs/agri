# 🌱 FarmConnect - Agricultural Marketplace

A full-stack web application connecting farmers and traders directly.

## 🚀 Quick Start

### Prerequisites
- Node.js v16+ (download from https://nodejs.org)

### Setup & Run

```bash
# 1. Open terminal in this folder
cd farmconnect

# 2. Install dependencies
npm install

# 3. Start the server
npm start

# 4. Open your browser
# Visit: http://localhost:3000
```

---

## 👤 Demo Accounts

| Role   | Email                    | Password   |
|--------|--------------------------|------------|
| Admin  | harsh@farmconnect.in     | admin123   |
| Farmer | ramesh@gmail.com         | farmer123  |
| Buyer  | priya@gmail.com          | buyer123   |

---

## ✨ Features

### Authentication
- ✅ Register (as Farmer or Buyer)
- ✅ Login / Logout
- ✅ JWT-based session (persists on refresh)
- ✅ Role-based access control

### Pages & Functionality
| Page | Description |
|------|-------------|
| 🏠 Home | Landing page with hero section |
| 📊 Dashboard | Stats, recent products |
| 🛒 Marketplace | Browse all products with search & filter |
| 📋 My Products | Farmer: list, edit, delete own products |
| 📈 Price Trends | Market price overview by category |
| 🌤️ Weather | Live weather forecast (uses wttr.in) |
| 📖 Knowledge Hub | Agriculture articles & guides |
| 📰 News | Agricultural news feed |
| 📞 Contact | Contact form (saves to database) |
| 👥 Users | Admin: manage all users |
| ⚙️ Settings | Profile update, password change |

### Backend API
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/profile` — Update profile
- `PUT /api/auth/password` — Change password
- `GET /api/products` — List all products
- `POST /api/products` — Add product (farmer/admin)
- `PUT /api/products/:id` — Edit product
- `DELETE /api/products/:id` — Delete product
- `GET /api/weather?city=Delhi` — Live weather
- `POST /api/contact` — Submit contact form
- `GET /api/users` — List users (admin only)
- `GET /api/stats` — Dashboard stats

---

## 🗄️ Database

Uses **SQLite** (file-based, no setup needed).
Database file: `farmconnect.db` (auto-created on first run)

### Tables
- `users` — Registered users
- `products` — Product listings
- `contacts` — Contact form submissions
- `cart` — Cart items

---

## 🌤️ Weather

Live weather is powered by [wttr.in](https://wttr.in) — **no API key required**.
Requires internet connection when fetching weather.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express.js
- **Database:** SQLite (better-sqlite3)
- **Auth:** JWT + bcryptjs
- **Weather:** wttr.in free API

---

## 📁 Project Structure

```
farmconnect/
├── server.js          ← Express backend (all API routes)
├── package.json       ← Dependencies
├── farmconnect.db     ← SQLite database (auto-created)
├── public/
│   └── index.html     ← Complete frontend
└── README.md
```
