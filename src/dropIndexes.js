const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function dropIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Drop the users collection to clear all indexes
    try {
      await mongoose.connection.collection('users').drop();
      console.log('✓ Dropped users collection and indexes');
    } catch (err) {
      console.log('Users collection may not exist, continuing...');
    }

    console.log('✓ MongoDB indexes cleared');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropIndexes();
