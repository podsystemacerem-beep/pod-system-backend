const mongoose = require('mongoose');
require('dotenv').config();

async function createAdminAndCoordinator() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = require('./src/models/User');
    
    console.log('=== Creating Admin and Coordinator Accounts ===\n');
    
    // Create Admin
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@gmail.com',
      password: 'admin123',
      role: 'admin',
      phone: '9999',
      area: 'Central',
      secretOrPrivateKey: 'admin-secret-key',
    });
    
    await adminUser.save();
    console.log('✓ Admin account created!');
    console.log('  Email: admin@gmail.com');
    console.log('  Password: admin123');
    console.log('  Role: admin\n');
    
    // Create Coordinator
    const coordinatorUser = new User({
      name: 'Coordinator User',
      email: 'coordinator@gmail.com',
      password: 'coordinator123',
      role: 'coordinator',
      phone: '8888',
      area: 'North Zone',
      secretOrPrivateKey: 'coordinator-secret-key',
    });
    
    await coordinatorUser.save();
    console.log('✓ Coordinator account created!');
    console.log('  Email: coordinator@gmail.com');
    console.log('  Password: coordinator123');
    console.log('  Role: coordinator\n');
    
    // List all accounts
    const allUsers = await User.find({}).select('name email role');
    console.log('=== All Accounts ===');
    allUsers.forEach(u => console.log(`${u.role.padEnd(12)} - ${u.name} (${u.email})`));
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

createAdminAndCoordinator();
