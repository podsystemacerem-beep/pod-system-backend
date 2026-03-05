const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');

const EMAIL = process.argv[2] || 'testuser@example.com';

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const res = await User.findOneAndDelete({ email: EMAIL });
    if (res) {
      console.log(`Deleted user: ${res.email} (id: ${res._id})`);
    } else {
      console.log(`No user found with email: ${EMAIL}`);
    }
  } catch (err) {
    console.error('Error:', err.message || err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
