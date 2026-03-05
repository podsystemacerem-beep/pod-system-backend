const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

console.log('=== POD System Backend Diagnostic ===\n');

// Check environment variables
console.log('Environment Variables:');
console.log('PORT:', process.env.PORT || 'Not set (will use 5000)');
console.log('NODE_ENV:', process.env.NODE_ENV || 'Not set');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✓ Set' : '✗ NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✓ Set' : '✗ NOT SET');
console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE || 'Not set');

console.log('\n=== Testing MongoDB Connection ===');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✓ MongoDB connected successfully!');
  
  // List collections
  mongoose.connection.db.listCollections().toArray((err, collections) => {
    if (!err) {
      console.log('\nCollections in database:');
      collections.forEach(c => console.log('  -', c.name));
    }
    
    // Check for users
    const User = require('./src/models/User');
    User.countDocuments({}, (err, count) => {
      console.log('\nTotal users in database:', count);
      
      // List users with 'jake' email
      User.findOne({ email: 'jake@gmail.com' }, (err, user) => {
        if (user) {
          console.log('\n✓ Jake user found!');
          console.log('  Name:', user.name);
          console.log('  Email:', user.email);
          console.log('  Role:', user.role);
          console.log('  Area:', user.area);
        } else {
          console.log('\n✗ Jake user NOT found in database');
        }
        
        mongoose.connection.close();
        process.exit(0);
      });
    });
  });
})
.catch(err => {
  console.error('✗ MongoDB connection failed!');
  console.error('Error:', err.message);
  process.exit(1);
});
