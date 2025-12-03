const express = require('express');
const router = express.Router();

// Importar rutas
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const gameRoutes = require('./routes/game');
const profileRoutes = require('./routes/profile');

// Usar rutas
router.use('/', authRoutes);
router.use('/', transactionRoutes);
router.use('/', gameRoutes);
router.use('/', profileRoutes);

module.exports = router;
