const mongoose = require('mongoose');
require('dotenv').config();

async function deleteAndRecreateUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = require('./src/models/User');
    
    console.log('=== Deleting and recreating Jake user ===\n');
    
    // Delete existing Jake user
    const result = await User.deleteOne({ email: 'jake@gmail.com' });
    console.log(`Deleted: ${result.deletedCount} user(s)`);
    
    // Create new Jake user with a proper password
    const newUser = new User({
      name: 'jake',
      email: 'jake@gmail.com',
      password: 'password123',  // Simple password for testing
      role: 'messenger',
      phone: '1111',
      area: 'je',
    });
    
    await newUser.save();
    console.log('✓ New Jake user created!');
    console.log('  Name:', newUser.name);
    console.log('  Email:', newUser.email);
    console.log('  Password: password123');
    console.log('  Role:', newUser.role);
    console.log('  Hash:', newUser.password.substring(0, 30) + '...');
    
    // Test if password works
    const testUser = await User.findOne({ email: 'jake@gmail.com' });
    const isMatch = await testUser.comparePassword('password123');
    console.log('\n✓ Password verification test:', isMatch ? 'PASS' : 'FAIL');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

deleteAndRecreateUser();
