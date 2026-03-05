const mongoose = require('mongoose');
require('dotenv').config();

async function fixUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = require('./src/models/User');
    
    console.log('=== Fixing Jake User ===\n');
    
    // Delete existing Jake user
    await User.deleteOne({ email: 'jake@gmail.com' });
    console.log('Deleted old Jake user');
    
    // Create new Jake user with ALL required fields
    const newUser = new User({
      name: 'jake',
      email: 'jake@gmail.com',
      password: 'password123',
      role: 'messenger',
      phone: '1111',
      area: 'je',
      secretOrPrivateKey: 'secret-key-12345',  // Set a proper value
    });
    
    await newUser.save();
    console.log('✓ Jake user recreated with all fields!');
    console.log('\nLogin Credentials:');
    console.log('  Email: jake@gmail.com');
    console.log('  Password: password123');
    console.log('\nUser Data:');
    console.log('  Name:', newUser.name);
    console.log('  Role:', newUser.role);
    console.log('  Phone:', newUser.phone);
    console.log('  Area:', newUser.area);
    console.log('  SecretOrPrivateKey:', newUser.secretOrPrivateKey);
    
    // Verify password works
    const testUser = await User.findOne({ email: 'jake@gmail.com' });
    const isMatch = await testUser.comparePassword('password123');
    console.log('\n✓ Password verification:', isMatch ? 'PASS' : 'FAIL');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

fixUser();
