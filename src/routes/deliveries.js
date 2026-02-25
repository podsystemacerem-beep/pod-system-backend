const express = require('express');
const Delivery = require('../models/Delivery');
const Bill = require('../models/Bill');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all deliveries
router.get('/', authMiddleware, async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('messengerId', 'name email area')
      .populate('billId')
      .sort({ createdAt: -1 });

    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery by status
router.get('/status/:status', authMiddleware, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ status: req.params.status })
      .populate('messengerId', 'name email area')
      .populate('billId')
      .sort({ createdAt: -1 });

    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
