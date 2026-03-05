const bcryptjs = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = require('./src/models/User');
    
    console.log('=== Login Test ===\n');
    
    const user = await User.findOne({ email: 'jake@gmail.com' });
    
    if (!user) {
      console.log('✗ User not found');
      process.exit(1);
    }
    
    console.log('✓ User found: jake');
    console.log('  Password hash:', user.password.substring(0, 30) + '...');
    
    // Test password comparison
    const testPassword = '••••';
    console.log('\nTesting password:', testPassword);
    
    const isValid = await user.comparePassword(testPassword);
    console.log('  Password match:', isValid ? '✓ YES' : '✗ NO');
    
    // Also test with the literal password string
    const isValid2 = await user.comparePassword('••••');
    console.log('  Password match (literal):', isValid2 ? '✓ YES' : '✗ NO');
    
    // Test with common passwords
    const passwords = ['1111', 'password', '••••', 'Password123!'];
    console.log('\nTrying different passwords:');
    for (const pwd of passwords) {
      const match = await user.comparePassword(pwd);
      console.log(`  ${pwd}: ${match ? '✓ MATCH' : '✗ no match'}`);
    }
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
