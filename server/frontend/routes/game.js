const express = require('express');
const router = express.Router();

const Apuesta = require('../../backend/models/Apuesta');

const { requireAuth } = require('../middleware/auth');

router.get('/ruleta', requireAuth, (req, res) =>
  res.render('ruleta', { pageTitle: 'Turbets - Ruleta' })
);

router.get('/juego', requireAuth, async (req, res) => {
  try {
    const u = res.locals.user || {};
    
    // Obtener últimos 5 números ganadores (globales, de todas las apuestas)
    const ultimosNumerosData = await Apuesta.find({ 
      numeroGanador: { $ne: null }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('numeroGanador')
    .lean();

    const ultimosNumeros = ultimosNumerosData.map(a => a.numeroGanador);

    // Obtener últimas 5 apuestas del usuario actual
    const ultimasApuestas = await Apuesta.find({ 
      user_id: u.id,
      numeroGanador: { $ne: null }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

    const apuestasFormateadas = ultimasApuestas.map(a => ({
      tipoApuesta: a.tipoApuesta,
      monto: parseFloat(a.monto.toString()),
      estado: a.estado,
      numeroGanador: a.numeroGanador,
      pago: a.pago ? parseFloat(a.pago.toString()) : 0
    }));

    res.render('juego', {
      pageTitle: 'Turbets - Juego',
      saldo: u.saldo,
      ultimosNumeros: JSON.stringify(ultimosNumeros),
      ultimasApuestas: JSON.stringify(apuestasFormateadas)
    });
  } catch (error) {
    console.error('Error al cargar juego:', error);
    res.render('juego', {
      pageTitle: 'Turbets - Juego',
      saldo: res.locals.user?.saldo || 0,
      ultimosNumeros: JSON.stringify([]),
      ultimasApuestas: JSON.stringify([])
    });
  }
});

module.exports = router;
