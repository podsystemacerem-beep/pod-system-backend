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

    // CPM Calculation: Duration per Activity
    // Activity A: Route Assignment - from first bill assigned to last bill assigned
    let assignmentStartTime = null;
    let assignmentEndTime = null;
    
    deliveries.forEach(d => {
      if (d.billId && d.billId.createdAt) {
        const assignTime = new Date(d.billId.createdAt);
        if (!assignmentStartTime || assignTime < assignmentStartTime) {
          assignmentStartTime = assignTime;
        }
        if (!assignmentEndTime || assignTime > assignmentEndTime) {
          assignmentEndTime = assignTime;
        }
      }
    });

    const assignmentDurationMs = (assignmentStartTime && assignmentEndTime) 
      ? assignmentEndTime - assignmentStartTime 
      : 60 * 60 * 1000; // Default 60 mins
    const assignmentDurationMins = Math.round(assignmentDurationMs / 60000);

    // Activity B: Delivery Execution - from first delivery to last delivery
    let deliveryStartTime = null;
    let deliveryEndTime = null;
    
    deliveries.forEach(d => {
      if (d.deliveryDate) {
        const delivTime = new Date(d.deliveryDate);
        if (!deliveryStartTime || delivTime < deliveryStartTime) {
          deliveryStartTime = delivTime;
        }
        if (!deliveryEndTime || delivTime > deliveryEndTime) {
          deliveryEndTime = delivTime;
        }
      }
    });

    const deliveryExecutionMs = (deliveryStartTime && deliveryEndTime)
      ? deliveryEndTime - deliveryStartTime
      : 480 * 60 * 1000; // Default 480 mins
    const deliveryExecutionMins = Math.round(deliveryExecutionMs / 60000);

    // Activity C: Proof Verification - from first verified bill to last verified bill
    let verificationStartTime = null;
    let verificationEndTime = null;
    
    deliveries.forEach(d => {
      if (d.verifiedAt) {
        const verifyTime = new Date(d.verifiedAt);
        if (!verificationStartTime || verifyTime < verificationStartTime) {
          verificationStartTime = verifyTime;
        }
        if (!verificationEndTime || verifyTime > verificationEndTime) {
          verificationEndTime = verifyTime;
        }
      }
    });

    const proofVerificationMs = (verificationStartTime && verificationEndTime)
      ? verificationEndTime - verificationStartTime
      : 60 * 60 * 1000; // Default 60 mins
    const proofVerificationMins = Math.round(proofVerificationMs / 60000);

    // Activity D: Reporting - from end of verification to report generation
    const reportingDurationMins = 30;

    // CPM Forward Pass: Calculate ES (Earliest Start) and EF (Earliest Finish)
    // Linear Path: A -> B -> C -> D
    const activities = [
      { id: 'A', name: 'Route Assignment', duration: assignmentDurationMins, predecessor: null },
      { id: 'B', name: 'Delivery Execution', duration: deliveryExecutionMins, predecessor: 'A' },
      { id: 'C', name: 'Proof Verification', duration: proofVerificationMins, predecessor: 'B' },
      { id: 'D', name: 'Reporting', duration: reportingDurationMins, predecessor: 'C' },
    ];

    // Forward Pass: Calculate ES (Earliest Start) and EF (Earliest Finish)
    activities.forEach((activity) => {
      if (activity.predecessor === null) {
        activity.ES = 0;
      } else {
        const predActivity = activities.find(a => a.id === activity.predecessor);
        activity.ES = predActivity.EF;
      }
      activity.EF = activity.ES + activity.duration;
    });

    // Backward Pass: Calculate LS (Latest Start) and LF (Latest Finish)
    const projectDuration = activities[activities.length - 1].EF;
    
    for (let i = activities.length - 1; i >= 0; i--) {
      const activity = activities[i];
      if (i === activities.length - 1) {
        activity.LF = activity.EF;
      } else {
        const successorId = activities.find(a => a.predecessor === activity.id)?.id;
        const successor = activities.find(a => a.id === successorId);
        activity.LF = successor.LS;
      }
      activity.LS = activity.LF - activity.duration;
    }

    // Calculate Slack and identify Critical Path
    activities.forEach(activity => {
      activity.slack = activity.LS - activity.ES;
      activity.isCritical = activity.slack === 0;
    });

    const criticalPathActivities = activities.filter(a => a.isCritical);

    const stages = activities.map(a => ({
      activity: a.id,
      stage: a.name,
      duration: a.duration,
      ES: a.ES,
      EF: a.EF,
      LS: a.LS,
      LF: a.LF,
      slack: a.slack,
      isCritical: a.isCritical,
      predecessor: a.predecessor || 'Start',
    }));

    const estimatedCompletion = new Date(Date.now() + projectDuration * 60000);

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
        projectDuration: projectDuration,
        stages,
        criticalPath: criticalPathActivities.map(a => a.id).join(' -> '),
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
