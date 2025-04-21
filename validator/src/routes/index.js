const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Example route
router.get('/users', userController.getUsers);

module.exports = router;
