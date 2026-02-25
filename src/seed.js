const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  employeeId: String,
  phone: String,
  area: String,
  isActive: Boolean,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Create admin user only
    const adminUser = {
      name: 'Administrator',
      email: 'admin@gmail.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      employeeId: 'ADMIN-001',
      phone: '0000-0000000',
      area: 'HQ',
      isActive: true
    };

    const createdUsers = await User.insertMany([adminUser]);
    console.log('Created admin user:');
    createdUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`);
    });

    console.log('\nSeeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
