const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  route: {
    type: String,
    required: false,
  },
  area: String,
  billType: {
    type: String,
    enum: ['regular_bill', 'disconnection_notice'],
    default: 'regular_bill',
  },
  billingMonth: Date,
  amount: Number,
  status: {
    type: String,
    enum: ['unassigned', 'assigned', 'delivered'],
    default: 'unassigned',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  quantity: {
    type: Number,
    default: 1,
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Bill', billSchema);
