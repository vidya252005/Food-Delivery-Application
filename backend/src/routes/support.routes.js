const express = require('express');
const supportController = require('../controllers/supportController');

const router = express.Router();

router.post('/', supportController.create);
router.get('/', supportController.listAll);

module.exports = router;
