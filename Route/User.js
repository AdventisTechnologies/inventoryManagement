const express = require('express');
const userController = require('../Controller/User');

const router = express.Router();

router.post('/login', userController.login);

module.exports = router;