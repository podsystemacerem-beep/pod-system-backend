const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

async function runDiagnostics() {
  try {
    console.log('=== POD System Backend Diagnostic ===\n');

    // Check environment variables
    console.log('Environment Variables:');
    console.log('PORT:', process.env.PORT || 'Not set (will use 5000)');
    console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ NOT SET');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ NOT SET');
    console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE || 'Not set');

    console.log('\n=== Testing MongoDB Connection ===');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ MongoDB connected successfully!');

    // Check for collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections in database:');
    collections.forEach(c => console.log('  -', c.name));

    // Check users
    const User = require('./src/models/User');
    const userCount = await User.countDocuments({});
    console.log('\nTotal users in database:', userCount);

    // Find jake user
    const jakeUser = await User.findOne({ email: 'jake@gmail.com' });
    if (jakeUser) {
      console.log('\n✓ Jake user found!');
      console.log('  Name:', jakeUser.name);
      console.log('  Email:', jakeUser.email);
      console.log('  Role:', jakeUser.role);
      console.log('  Area:', jakeUser.area);
      console.log('  Password hash:', jakeUser.password.substring(0, 20) + '...');
    } else {
      console.log('\n✗ Jake user NOT found in database');
      
      // List all users
      const allUsers = await User.find({}).select('name email role');
      if (allUsers.length > 0) {
        console.log('\nAll users in database:');
        allUsers.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
      } else {
        console.log('\nNo users found in database');
      }
    }

    await mongoose.connection.close();
    process.exit(0);

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

runDiagnostics();
