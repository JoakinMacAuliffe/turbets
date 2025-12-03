const express = require('express');
const router = express.Router();

// Importar rutas
const publicRoutes = require('./routes/public');
const gameRoutes = require('./routes/game');
const userRoutes = require('./routes/user');

// Usar rutas
router.use('/', publicRoutes);
router.use('/', gameRoutes);
router.use('/', userRoutes);

module.exports = router;
