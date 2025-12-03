const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Apuesta = require('../models/Apuesta');

const { requireAuth } = require('../middleware/auth');

// POST para apuestas
router.post('/apuesta', requireAuth, async (req, res) => {
  try {
    const { monto, tipoApuesta, valor } = req.body;

    const usuario = await User.findById(res.locals.user.id);

    if (usuario.saldo < monto) {
      return res.status(400).json({ error: 'Saldo insuficiente '});
    }

    // Descontar del saldo
    usuario.saldo -= monto;
    await usuario.save();

    // Crear registro de apuesta en MongoDB
    const apuesta = new Apuesta({
      user_id: usuario._id,
      monto: monto,
      tipoApuesta: tipoApuesta,
      valorApostado: valor,
    });
    await apuesta.save();

    res.json({
      success: true,
      apuestaId: apuesta._id,
      nuevoSaldo: usuario.saldo
    });

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
});

// POST para resultado de la apuesta
router.post('/resultado-apuesta', requireAuth, async (req, res) => {
  try {
    const { apuestaId, numeroGanador } = req.body;

    const apuesta = await Apuesta.findById(apuestaId);
    const usuario = await User.findById(res.locals.user.id);

    // Determinar si gano
    const gano = verificarApuesta(apuesta.tipoApuesta, apuesta.valorApostado, numeroGanador);
    const multiplicador = obtenerMultiplicador(apuesta.tipoApuesta);

    let pago = 0;
    if (gano) {
      const montoNumerico = parseFloat(apuesta.monto.toString());
      pago = Math.floor(montoNumerico * multiplicador);
      usuario.saldo += pago;
      apuesta.estado = 'Ganada';
    } else {
      apuesta.estado = 'Perdida';
    }

    apuesta.numeroGanador = numeroGanador;
    apuesta.pago = pago;

    await apuesta.save();
    await usuario.save();

    res.json({
      success: true,
      gano: gano,
      pago: pago,
      nuevoSaldo: usuario.saldo
    });

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
});

// Funciones auxiliares para apuestas

function verificarApuesta(tipo, valor, numeroGanador) {
    const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
    
    const esCero = numeroGanador === 0;

    switch(tipo) {

        case 'pleno':
            return valor === numeroGanador;
        
        case 'caballo': // valor será "num1,num2"
            const caballo = valor.split(',').map(n => parseInt(n.trim()));
            return caballo.includes(numeroGanador);
        
        case 'transversal': // valor será "num1-num2-num3"
            const transversal = valor.split('-').map(n => parseInt(n.trim()));
            return transversal.includes(numeroGanador);
        
        case 'cuadro': // valor será "num1,num2,num3,num4"
            const cuadro = valor.split(',').map(n => parseInt(n.trim()));
            return cuadro.includes(numeroGanador);
        
        case 'seisena': // valor será "inicio-fin" ej: "1-6"
            const [inicio, fin] = valor.split('-').map(n => parseInt(n.trim()));
            return numeroGanador >= inicio && numeroGanador <= fin;
        
        case 'rojo': 
            return !esCero && redSet.has(numeroGanador);

        case 'negro': 
            return !esCero && !redSet.has(numeroGanador);

        case 'par': 
            return !esCero && numeroGanador % 2 === 0;

        case 'impar': 
            return !esCero && numeroGanador % 2 === 1;
        
        case 'falta': // 1-18
            return !esCero && numeroGanador >= 1 && numeroGanador <= 18;
        
        case 'pasa': // 19-36
            return !esCero && numeroGanador >= 19 && numeroGanador <= 36;
            
        case 'docena': // 'valor' será 1 (1-12), 2 (13-24) o 3 (25-36)
            if (esCero) return false;
            if (valor === 1) return numeroGanador >= 1 && numeroGanador <= 12;
            if (valor === 2) return numeroGanador >= 13 && numeroGanador <= 24;
            if (valor === 3) return numeroGanador >= 25 && numeroGanador <= 36;
            return false;
        
        case 'columna': // 'valor' será 1, 2 o 3
            if (esCero) return false;
            // Columna 1: 1,4,7,10,13,16,19,22,25,28,31,34
            // Columna 2: 2,5,8,11,14,17,20,23,26,29,32,35
            // Columna 3: 3,6,9,12,15,18,21,24,27,30,33,36
            return numeroGanador % 3 === (valor === 3 ? 0 : valor);
        
        case 'dos-docenas': // valor será "1-2" o "2-3"
            if (esCero) return false;
            if (valor === '1-2') return numeroGanador >= 1 && numeroGanador <= 24;
            if (valor === '2-3') return numeroGanador >= 13 && numeroGanador <= 36;
            return false;
        
        case 'dos-columnas': // valor será "1-2" o "2-3"
            if (esCero) return false;
            const resto = numeroGanador % 3;
            if (valor === '1-2') return resto === 1 || resto === 2;
            if (valor === '2-3') return resto === 2 || resto === 0;
            return false;
            
        default: 
            return false;
    }
}

function obtenerMultiplicador(tipo) {
  const multiplicadores = {
    'pleno': 36,
    'caballo': 18,
    'transversal': 12,
    'cuadro': 9,
    'seisena': 6,
    'docena': 3,
    'columna': 3,
    'dos-docenas': 1.5,
    'dos-columnas': 1.5,
    'rojo': 2,
    'negro': 2,
    'par': 2,
    'impar': 2,
    'falta': 2,
    'pasa': 2,
  };
  return multiplicadores[tipo] || 1;
}

module.exports = router;
