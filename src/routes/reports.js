const express = require('express');
const Report = require('../models/Report');
const Delivery = require('../models/Delivery');
const Bill = require('../models/Bill');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Generate Daily Situation Report
router.post('/dsr', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { reportDate } = req.body;
    const date = reportDate ? new Date(reportDate) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const deliveries = await Delivery.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).populate('messengerId').populate('billId');

    const bills = await Bill.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const totalBillsProcessed = bills.length;
    const totalBillsDelivered = deliveries.filter(d => d.status === 'delivered').length;
    const totalDisconnectionNotices = bills.filter(b => b.billType === 'disconnection_notice').length;
    const noticesDelivered = deliveries.filter(d => d.status === 'delivered' && d.billId.billType === 'disconnection_notice').length;
    const failureCount = deliveries.filter(d => d.status === 'failed').length;
    const deliveryRate = totalBillsProcessed > 0 ? (totalBillsDelivered / totalBillsProcessed) * 100 : 0;

    // Messenger performance
    const messengerPerformance = [];
    const messengers = await User.find({ role: 'messenger' });

    for (const messenger of messengers) {
      const messengerDeliveries = deliveries.filter(d => d.messengerId._id.toString() === messenger._id.toString());
      const assigned = messengerDeliveries.length;
      const delivered = messengerDeliveries.filter(d => d.status === 'delivered').length;
      const failed = messengerDeliveries.filter(d => d.status === 'failed').length;
      const performanceScore = assigned > 0 ? (delivered / assigned) * 100 : 0;

      messengerPerformance.push({
        messengerId: messenger._id,
        messengerName: messenger.name,
        assigned,
        delivered,
        failed,
        performanceScore,
      });
    }

    // Compute simple CPM-like estimates from historical timestamps where available
    const assignmentDurations = []; // bill.createdAt -> delivery.createdAt
    const deliveryExecutionDurations = []; // delivery.createdAt -> delivery.deliveryDate
    const proofCaptureDurations = []; // delivery.deliveryDate -> first proof.timestamp
    const verificationDurations = []; // delivery.deliveryDate -> verifiedAt

    deliveries.forEach(d => {
      try {
        if (d.billId && d.billId.createdAt && d.createdAt) {
          assignmentDurations.push(d.createdAt - d.billId.createdAt);
        }
        if (d.createdAt && d.deliveryDate) {
          deliveryExecutionDurations.push(d.deliveryDate - d.createdAt);
        }
        if (d.deliveryDate && d.proofImages && d.proofImages.length) {
          const firstProof = d.proofImages[0];
          if (firstProof.timestamp) proofCaptureDurations.push(new Date(firstProof.timestamp) - d.deliveryDate);
        }
        if (d.deliveryDate && d.verifiedAt) {
          verificationDurations.push(new Date(d.verifiedAt) - d.deliveryDate);
        }
      } catch (e) {
        // ignore malformed timestamps
      }
    });

    const avg = arr => (arr && arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);

    const defaults = {
      assignment: 30 * 60 * 1000,
      deliveryExecution: 480 * 60 * 1000,
      proofCapture: 120 * 60 * 1000,
      verification: 60 * 60 * 1000,
      reporting: 30 * 60 * 1000,
    };

    const assignmentMs = avg(assignmentDurations) || defaults.assignment;
    const deliveryExecMs = avg(deliveryExecutionDurations) || defaults.deliveryExecution;
    const proofCaptureMs = avg(proofCaptureDurations) || defaults.proofCapture;
    const verificationMs = avg(verificationDurations) || defaults.verification;
    const reportingMs = defaults.reporting;

    const stages = [
      { stage: 'Route Assignment', duration: Math.round(assignmentMs / 60000), dependency: 'Start' },
      { stage: 'Delivery Execution', duration: Math.round(deliveryExecMs / 60000), dependency: 'Route Assignment' },
      { stage: 'Proof Capture', duration: Math.round(proofCaptureMs / 60000), dependency: 'Delivery Execution' },
      { stage: 'Proof Verification', duration: Math.round(verificationMs / 60000), dependency: 'Proof Capture' },
      { stage: 'Reporting', duration: Math.round(reportingMs / 60000), dependency: 'Proof Verification' },
    ];

    const totalMs = assignmentMs + deliveryExecMs + proofCaptureMs + verificationMs + reportingMs;
    const estimatedCompletion = new Date(Date.now() + totalMs);

    const report = new Report({
      reportDate: new Date(),
      reportType: 'daily_situation_report',
      coordinator: req.userId,
      data: {
        totalBillsProcessed,
        totalBillsDelivered,
        totalDisconnectionNotices,
        noticesDelivered,
        failureCount,
        deliveryRate,
        messengerPerformance,
      },
      criticalPath: {
        stages,
        estimatedCompletion,
      },
    });

    await report.save();

    res.status(201).json({ message: 'Report generated', report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all reports
router.get('/', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const reports = await Report.find()
      .populate('coordinator', 'name email')
      .sort({ reportDate: -1 });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
