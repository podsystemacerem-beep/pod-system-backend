const mongoose = require('mongoose');
require('dotenv').config();

async function checkAdminAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const User = require('./src/models/User');
    
    console.log('=== Checking Admin/Coordinator Accounts ===\n');
    
    // Find admin accounts
    const admins = await User.find({ role: 'admin' });
    console.log(`Total admin accounts: ${admins.length}`);
    if (admins.length > 0) {
      admins.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    }
    
    // Find coordinator accounts
    const coordinators = await User.find({ role: 'coordinator' });
    console.log(`\nTotal coordinator accounts: ${coordinators.length}`);
    if (coordinators.length > 0) {
      coordinators.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    }
    
    // Find messenger accounts
    const messengers = await User.find({ role: 'messenger' });
    console.log(`\nTotal messenger accounts: ${messengers.length}`);
    if (messengers.length > 0) {
      messengers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
    }
    
    // Check for admin@gmail.com specifically
    console.log('\n=== Looking for admin@gmail.com ===');
    const adminUser = await User.findOne({ email: 'admin@gmail.com' });
    if (adminUser) {
      console.log('✓ Found!');
      console.log('  Name:', adminUser.name);
      console.log('  Email:', adminUser.email);
      console.log('  Role:', adminUser.role);
    } else {
      console.log('✗ admin@gmail.com NOT FOUND');
    }
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

checkAdminAccounts();
