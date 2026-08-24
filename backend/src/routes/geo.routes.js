const express = require('express');
const geoController = require('../controllers/geoController');

const router = express.Router();

router.get('/reverse', geoController.reverse);

module.exports = router;
