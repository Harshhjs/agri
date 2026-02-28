// seed.js  –  Populates the database with sample data on first run
const bcrypt = require('bcryptjs');
const db     = require('./db');

module.exports = function seedDatabase() {
  if (db.users.count() > 0) return; // already seeded

  console.log('🌱 Seeding database with demo data...');

  const adminPw  = bcrypt.hashSync('admin123',  10);
  const farmerPw = bcrypt.hashSync('farmer123', 10);
  const buyerPw  = bcrypt.hashSync('buyer123',  10);

  const admin  = db.users.insert({ name:'Harsh Choudhary', email:'harsh@farmconnect.in',  password:adminPw,  role:'admin',  location:'New Delhi, India',     phone:'9304782747',  verified:true,  status:'active' });
  const farmer = db.users.insert({ name:'Ramesh Kumar',    email:'ramesh@gmail.com',        password:farmerPw, role:'farmer', location:'Haryana, India',        phone:'9876543210',  verified:true,  status:'active' });
               db.users.insert({ name:'Suresh Patel',   email:'suresh@gmail.com',        password:farmerPw, role:'farmer', location:'Gujarat, India',        phone:'9812345678',  verified:false, status:'active' });
               db.users.insert({ name:'Priya Singh',    email:'priya@gmail.com',         password:buyerPw,  role:'buyer',  location:'Mumbai, India',         phone:'9998765432',  verified:true,  status:'active' });

  const fid = farmer.id;
  const pid = [
    { name:'Apple (Shimla)',          category:'fruits',     description:'Fresh red apples from Shimla hills, crisp and sweet',               price:150,    unit:'kg',    quantity:250, location:'Himachal Pradesh, India', phone:'93047827476', harvest_date:'2024-11-15', tier:'premium'  },
    { name:'Wheat Seeds (HD-2967)',   category:'seeds',      description:'High-yielding wheat variety suitable for North Indian plains',       price:45,     unit:'kg',    quantity:200, location:'Haryana, India',          phone:'93047827476', harvest_date:null,         tier:'standard' },
    { name:'Organic Fertilizer',      category:'fertilizer', description:'100% organic compost fertilizer for all crops',                     price:15,     unit:'kg',    quantity:1000,location:'Karnataka, India',         phone:'93047827476', harvest_date:null,         tier:'premium'  },
    { name:'Premium Basmati Rice',    category:'rice',       description:'Aged basmati rice with extra long grains',                          price:120,    unit:'kg',    quantity:500, location:'Punjab, India',            phone:'93047827476', harvest_date:'2024-10-20', tier:'premium'  },
    { name:'Farm Tractor (2nd Hand)', category:'equipment',  description:'Mahindra 475 DI, 2019 model, good condition',                      price:450000, unit:'piece', quantity:1,   location:'Rajasthan, India',         phone:'93047827476', harvest_date:null,         tier:'standard' },
    { name:'Tomato (Desi)',           category:'vegetables', description:'Farm-fresh desi tomatoes, no pesticides',                           price:25,     unit:'kg',    quantity:300, location:'Maharashtra, India',       phone:'93047827476', harvest_date:null,         tier:'standard' },
    { name:'Sunflower Seeds',         category:'seeds',      description:'High oil content sunflower seeds for planting',                     price:35,     unit:'kg',    quantity:150, location:'Karnataka, India',         phone:'93047827476', harvest_date:null,         tier:'standard' },
    { name:'DAP Fertilizer',          category:'fertilizer', description:'Di-ammonium phosphate fertilizer for fast growth',                  price:1350,   unit:'kg',    quantity:200, location:'Haryana, India',          phone:'93047827476', harvest_date:null,         tier:'premium'  },
    { name:'Mango (Alphonso)',        category:'fruits',     description:'Premium Alphonso mangoes from Ratnagiri',                           price:200,    unit:'kg',    quantity:100, location:'Maharashtra, India',       phone:'93047827476', harvest_date:null,         tier:'premium'  },
    { name:'Onion',                   category:'vegetables', description:'Fresh onions, large size, no chemicals',                            price:20,     unit:'kg',    quantity:600, location:'Maharashtra, India',       phone:'93047827476', harvest_date:null,         tier:'standard' },
    { name:'Paddy Seeds (IR-64)',     category:'seeds',      description:'IR-64 paddy variety suitable for lowland farming',                  price:55,     unit:'kg',    quantity:300, location:'Odisha, India',            phone:'93047827476', harvest_date:null,         tier:'standard' },
  ].map(p => db.products.insert({ ...p, seller_id:fid, status:'active' }));

  console.log(`✅ Seeded: ${db.users.count()} users, ${db.products.count()} products`);
};
