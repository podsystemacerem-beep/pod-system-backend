const mongoose = require('mongoose');
require('dotenv').config();

// Connect and check
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  
  // Direct database check
  mongoose.connection.db.collection('users').find({}).toArray((err, docs) => {
    if (err) {
      console.error('Error querying:', err.message);
    } else {
      console.log('Total users:', docs.length);
      console.log('Users:');
      docs.forEach(doc => {
        console.log(`- ${doc.name} (${doc.email})`);
      });
    }
    mongoose.connection.close();
  });
})
.catch(err => console.error('Connection error:', err.message));
