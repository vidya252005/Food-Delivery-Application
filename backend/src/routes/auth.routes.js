const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/user/register', authController.registerUser);
router.post('/user/login', authController.loginUser);
router.post('/admin/login', authController.loginAdmin);
router.post('/google', authController.googleLogin);
router.post('/restaurant/register', authController.registerRestaurant);
router.post('/restaurant/login', authController.loginRestaurant);

module.exports = router;
