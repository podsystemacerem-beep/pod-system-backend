const express = require('express');
const User = require('../models/User');
const Bill = require('../models/Bill');
const Delivery = require('../models/Delivery');
const Report = require('../models/Report');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Manage messenger accounts
router.get('/messengers', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const messengers = await User.find({ role: 'messenger' }).select('-password');
    res.json(messengers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/messengers', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { name, email, password, employeeId, phone, area } = req.body;

    const user = new User({
      name,
      email,
      password,
      role: 'messenger',
      employeeId,
      phone,
      area,
    });

    await user.save();
    res.status(201).json({ message: 'Messenger created', user: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/messengers/:id', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { name, email, phone, area, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, area, isActive },
      { new: true }
    ).select('-password');

    res.json({ message: 'Messenger updated', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/messengers/:id', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const messengerId = req.params.id;
    
    // Prevent deleting your own account
    if (messengerId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete all deliveries assigned to this messenger
    await Delivery.deleteMany({ messengerId });
    
    // Update all bills assigned to this messenger (unassign them)
    await Bill.updateMany(
      { assignedTo: messengerId },
      { assignedTo: null, status: 'unassigned' }
    );
    
    // Delete the messenger user
    const user = await User.findByIdAndDelete(messengerId);
    if (!user) {
      return res.status(404).json({ error: 'Messenger not found' });
    }
    
    res.json({ message: 'Messenger deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Input bills
router.post('/bills', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { bills } = req.body;

    const createdBills = await Bill.insertMany(bills.map(bill => ({
      ...bill,
      status: 'unassigned',
    })));

    res.status(201).json({ message: 'Bills created', count: createdBills.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bills
router.get('/bills', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { status, route, billType } = req.query;
    const query = {};

    if (status) query.status = status;
    if (route) query.route = route;
    if (billType) query.billType = billType;

    const bills = await Bill.find(query)
      .populate('assignedTo', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign bills to messengers
router.post('/assign-bills', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { billIds, messengerId } = req.body;

    const updatedBills = await Bill.updateMany(
      { _id: { $in: billIds } },
      { assignedTo: messengerId, status: 'assigned' }
    );

    // Create deliveries
    for (const billId of billIds) {
      const delivery = new Delivery({
        billId,
        messengerId,
        coordinatorId: req.userId,
        status: 'assigned',
      });
      await delivery.save();
    }

    res.json({ message: 'Bills assigned successfully', updated: updatedBills.modifiedCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify delivery proof
router.put('/deliveries/:id/verify', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { verificationStatus, verificationNotes } = req.body;
    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus,
        verificationNotes,
        verifiedBy: req.userId,
        verifiedAt: new Date(),
      },
      { new: true }
    );

    res.json({ message: 'Delivery verified', delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery tracking
router.get('/tracking', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('messengerId', 'name email area')
      .populate('billId')
      .sort({ createdAt: -1 });

    const stats = {
      total: deliveries.length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      pending: deliveries.filter(d => d.status === 'pending' || d.status === 'assigned').length,
      verified: deliveries.filter(d => d.verificationStatus === 'verified').length,
    };

    res.json({ deliveries, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reassign delivery to different messenger
router.put('/deliveries/:id/reassign', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const { newMessengerId } = req.body;
    const delivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      { messengerId: newMessengerId, status: 'assigned' },
      { new: true }
    ).populate('messengerId').populate('billId');

    res.json({ message: 'Delivery reassigned successfully', delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
