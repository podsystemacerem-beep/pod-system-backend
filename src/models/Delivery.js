const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  billId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    required: true,
  },
  messengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  coordinatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in-progress', 'delivered', 'failed', 'verified'],
    default: 'pending',
  },
  deliveryDate: Date,
  failureReason: String,
  proofImages: [{
    url: String,
    timestamp: Date,
    size: Number,
  }],
  customerSignature: String,
  notes: String,
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  verificationNotes: String,
  route: String,
  address: String,
  customerName: String,
  accountNumber: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Delivery', deliverySchema);
