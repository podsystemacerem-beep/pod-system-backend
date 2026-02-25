const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportDate: {
    type: Date,
    default: Date.now,
  },
  reportType: {
    type: String,
    enum: ['daily_situation_report', 'performance_metrics', 'delivery_summary'],
    default: 'daily_situation_report',
  },
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  data: {
    totalBillsProcessed: Number,
    totalBillsDelivered: Number,
    totalDisconnectionNotices: Number,
    noticesDelivered: Number,
    failureCount: Number,
    deliveryRate: Number,
    messengerPerformance: [{
      messengerId: mongoose.Schema.Types.ObjectId,
      messengerName: String,
      assigned: Number,
      delivered: Number,
      failed: Number,
      performanceScore: Number,
    }],
  },
  routePerformance: [{
    route: String,
    area: String,
    billsProcessed: Number,
    billsDelivered: Number,
    completionRate: Number,
  }],
  criticalPath: {
    stages: [{
      stage: String,
      duration: Number,
      dependency: String,
    }],
    estimatedCompletion: Date,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Report', reportSchema);
