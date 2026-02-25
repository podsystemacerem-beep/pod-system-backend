const express = require('express');
const Bill = require('../models/Bill');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get bills inventory
router.get('/inventory', authMiddleware, roleMiddleware(['coordinator', 'admin']), async (req, res) => {
  try {
    const inventory = await Bill.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bills by route
router.get('/by-route/:route', authMiddleware, async (req, res) => {
  try {
    const bills = await Bill.find({ route: req.params.route })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
