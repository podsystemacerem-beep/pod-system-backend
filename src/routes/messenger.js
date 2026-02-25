const express = require('express');
const Delivery = require('../models/Delivery');
const Bill = require('../models/Bill');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get messenger's assigned deliveries
router.get('/routes', authMiddleware, async (req, res) => {
  try {
    const deliveries = await Delivery.find({ messengerId: req.userId })
      .populate('billId')
      .sort({ createdAt: -1 });

    const stats = {
      total: deliveries.length,
      delivered: deliveries.filter(d => d.status === 'delivered').length,
      failed: deliveries.filter(d => d.status === 'failed').length,
      pending: deliveries.filter(d => d.status === 'pending' || d.status === 'assigned').length,
    };

    res.json({ deliveries, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update delivery status
router.put('/deliveries/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status, failureReason, notes } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (delivery.messengerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    delivery.status = status;
    if (status === 'failed') {
      delivery.failureReason = failureReason;
    }
    if (notes) delivery.notes = notes;
    delivery.deliveryDate = new Date();
    delivery.updatedAt = new Date();

    // Enforce proof requirement: do not allow marking as delivered without proof
    if (status === 'delivered') {
      if (!delivery.proofImages || delivery.proofImages.length === 0) {
        return res.status(400).json({ error: 'Proof image required before marking delivered' });
      }
    }

    await delivery.save();

    // Update bill status
    if (status === 'delivered') {
      await Bill.findByIdAndUpdate(delivery.billId, { status: 'delivered' });
    }

    res.json({ message: 'Delivery status updated', delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload proof image
router.post('/deliveries/:id/proof', authMiddleware, async (req, res) => {
  try {
    const { imageData } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (delivery.messengerId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const proofImage = {
      url: imageData,
      timestamp: new Date(),
      size: imageData.length,
    };

    delivery.proofImages.push(proofImage);
    delivery.status = 'delivered';
    delivery.deliveryDate = new Date();
    delivery.updatedAt = new Date();

    await delivery.save();

    // Update bill status
    await Bill.findByIdAndUpdate(delivery.billId, { status: 'delivered' });

    res.json({ message: 'Proof uploaded successfully', delivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List messenger's deliveries (FR-M11: show completed and pending)
router.get('/deliveries', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { messengerId: req.userId };
    if (status) query.status = status;

    const deliveries = await Delivery.find(query)
      .populate('billId')
      .sort({ createdAt: -1 });

    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get delivery details
router.get('/deliveries/:id', authMiddleware, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('billId')
      .populate('messengerId', 'name email phone');

    if (!delivery) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json(delivery);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
