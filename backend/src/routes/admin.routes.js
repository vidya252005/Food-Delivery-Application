const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateAdmin);

router.get('/restaurants/pending', adminController.listPending);
router.post('/restaurants/:id/verify', adminController.verify);
router.post('/restaurants/:id/reject', adminController.reject);

module.exports = router;
