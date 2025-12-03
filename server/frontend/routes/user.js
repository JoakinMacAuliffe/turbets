const express = require('express');
const router = express.Router();

const Transaction = require('../../backend/models/Transaction');
const Apuesta = require('../../backend/models/Apuesta');

const { requireAuth } = require('../middleware/auth');
const { formatDateUTC } = require('../utils/formatters');

router.get('/perfil', requireAuth, (req, res) => {
  const u = res.locals.user || {};
  const birthDate = u.fechaNacimiento ? formatDateUTC(u.fechaNacimiento) : '';
  res.render('perfil', {
    pageTitle: 'Turbets - Mi Perfil',
    fullname: u.fullname,
    username: u.username,
    email: u.email,
    birthDate,
    saldo: u.saldo,
  });
});

router.get('/cambiar-contrasena', requireAuth, (req, res) => {
  res.render('cambiar-contrasena', {
    pageTitle: 'Turbets - Cambiar Contraseña',
    isLoggedIn: true
  });
});

router.get('/deposito', requireAuth, (req, res) => {
  const u = res.locals.user || {};
  res.render('realizar-transaccion', {
    pageTitle: 'Turbets - Depositar',
    saldo: u.saldo,
  });
});

router.get('/transacciones', requireAuth, async (req, res) => {
  try {
    // Obtener datos para filtrar
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    // Crear query
    const query = { user_id: res.locals.user.id };
    
    // Filtrar por tipo
    if (type) {
      query.type = type;
    }
    
    // Filtrar por fecha
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.render('transacciones', {
      pageTitle: 'Turbets - Transacciones',
      transactions,
      limit,
      type,
      dateFrom,
      dateTo
    });
  } catch (error) {
    console.error('Error importando transacciones:', error);
    res.render('transacciones', {
      pageTitle: 'Turbets - Transacciones',
      transactions: [],
      error: 'Error al cargar las transacciones'
    });
  }
});

router.get('/historial-apuestas', requireAuth, async (req, res) => {
  try {
    // Obtener datos para filtrar
    const limit = parseInt(req.query.limit) || 50;
    const estado = req.query.estado || '';
    const tipoApuesta = req.query.tipoApuesta || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    // Crear query
    const query = { 
      user_id: res.locals.user.id,
      numeroGanador: { $ne: null } // Solo apuestas completadas
    };
    
    // Filtrar por estado
    if (estado) {
      query.estado = estado;
    }
    
    // Filtrar por tipo de apuesta
    if (tipoApuesta) {
      query.tipoApuesta = tipoApuesta;
    }
    
    // Filtrar por fecha
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const apuestas = await Apuesta.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Formatear montos y pagos
    const apuestasFormateadas = apuestas.map(a => ({
      ...a,
      monto: a.monto ? parseFloat(a.monto.toString()) : 0,
      pago: a.pago ? parseFloat(a.pago.toString()) : 0
    }));

    res.render('historial-apuestas', {
      pageTitle: 'Turbets - Historial de Apuestas',
      isLoggedIn: true,
      apuestas: apuestasFormateadas,
      limit,
      estado,
      tipoApuesta,
      dateFrom,
      dateTo
    });
  } catch (error) {
    console.error('Error cargando historial de apuestas:', error);
    res.render('historial-apuestas', {
      pageTitle: 'Turbets - Historial de Apuestas',
      isLoggedIn: true,
      apuestas: [],
      error: 'Error al cargar el historial de apuestas'
    });
  }
});

module.exports = router;
