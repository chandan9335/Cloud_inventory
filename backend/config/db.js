const mongoose = require('mongoose');
const { seed } = require('../seed/seed');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI must be set in the environment');
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected:', mongoose.connection.host, '| DB:', mongoose.connection.name);
  await seed();
}

module.exports = { connectDB };
