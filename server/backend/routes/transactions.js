const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Transaction = require('../models/Transaction');

const { requireAuth } = require('../middleware/auth');

// POST para depósito
router.post('/deposito', requireAuth, async (req, res) => {
  try {
    const { monto } = req.body;
    const amount = Number(monto);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).render('realizar-transaccion', {
        pageTitle: 'Turbets - Depositar',
        saldo: res.locals.user.saldo,
        depositoError: 'Monto inválido. Ingrese un número mayor a 0.',
      });
    }

    const usuarioActualizado = await User.findByIdAndUpdate(
      res.locals.user.id,
      { $inc: { saldo: amount } },
      { new: true }
    ).lean();

    if (!usuarioActualizado) {
      res.clearCookie('user');
      return res.redirect('/acceso');
    }

    const postBalance = usuarioActualizado.saldo;
    const preBalance = postBalance - amount;

    await Transaction.create({
      type: 'DEPOSITO',
      user_id: usuarioActualizado._id,
      amount,
      prebalance: preBalance,
      postbalance: postBalance,
    });

    return res.render('realizar-transaccion', {
      pageTitle: 'Turbets - Depositar',
      saldo: usuarioActualizado.saldo,
      depositoSuccess: 'Depósito realizado exitosamente.',
    });
  } catch (err) {
    console.error('Error en depósito:', err);
    return res.status(500).render('realizar-transaccion', {
      pageTitle: 'Turbets - Depositar',
      saldo: res.locals.user.saldo,
      depositoError: 'No se pudo procesar el depósito. Intente nuevamente.',
    });
  }
});

// POST para retiro
router.post('/retiro', requireAuth, async (req, res) => {
  try {
    const { monto } = req.body;
    const amount = Number(monto);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).render('realizar-transaccion', {
        pageTitle: 'Turbets - Depositar',
        saldo: res.locals.user.saldo,
        retiroError: 'Monto inválido. Ingrese un número mayor a 0.',
      });
    }

    // Solo actualiza si hay saldo suficiente
    const usuarioActualizado = await User.findOneAndUpdate(
      { _id: res.locals.user.id, saldo: { $gte: amount } },
      { $inc: { saldo: -amount } },
      { new: true }
    ).lean();

    if (!usuarioActualizado) {
      return res.status(400).render('realizar-transaccion', {
        pageTitle: 'Turbets - Depositar',
        saldo: res.locals.user.saldo,
        retiroError: 'Saldo insuficiente para realizar el retiro.',
      });
    }

    const postBalance = usuarioActualizado.saldo;
    const preBalance = postBalance + amount;

    await Transaction.create({
      type: 'RETIRO',
      user_id: usuarioActualizado._id,
      amount,
      prebalance: preBalance,
      postbalance: postBalance,
    });

    return res.render('realizar-transaccion', {
      pageTitle: 'Turbets - Depositar',
      saldo: usuarioActualizado.saldo,
      retiroSuccess: 'Retiro realizado exitosamente.',
    });
  } catch (err) {
    console.error('Error en retiro:', err);
    return res.status(500).render('realizar-transaccion', {
      pageTitle: 'Turbets - Depositar',
      saldo: res.locals.user.saldo,
      retiroError: 'No se pudo procesar el retiro. Intente nuevamente.',
    });
  }
});

module.exports = router;
