const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const User = require('../models/User');

const { requireAuth } = require('../middleware/auth');

// Formatear fechas en UTC
function formatDateUTC(dateInput) {
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch (_) {
    return '';
  }
}

// POST para editar perfil
router.post('/editar-perfil', requireAuth, async (req, res) => {
  try {
    const { fullname, username, email, birthDate, card_number } = req.body;
    const userId = res.locals.user.id;

    // Validar que el username no esté siendo usado por otro usuario
    if (username !== res.locals.user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.render('perfil', {
          pageTitle: 'Turbets - Mi Perfil',
          fullname: res.locals.user.fullname,
          username: res.locals.user.username,
          email: res.locals.user.email,
          birthDate: res.locals.user.fechaNacimiento ? formatDateUTC(res.locals.user.fechaNacimiento) : '',
          saldo: res.locals.user.saldo,
          isLoggedIn: true,
          error: 'El nombre de usuario ya está en uso'
        });
      }
    }

    // Validar que el email no esté siendo usado por otro usuario
    if (email !== res.locals.user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        return res.render('perfil', {
          pageTitle: 'Turbets - Mi Perfil',
          fullname: res.locals.user.fullname,
          username: res.locals.user.username,
          email: res.locals.user.email,
          birthDate: res.locals.user.fechaNacimiento ? formatDateUTC(res.locals.user.fechaNacimiento) : '',
          saldo: res.locals.user.saldo,
          isLoggedIn: true,
          error: 'El correo electrónico ya está en uso'
        });
      }
    }

    // Actualizar el usuario
    const updateData = {
      fullname,
      username,
      email,
      fechaNacimiento: birthDate ? new Date(birthDate) : undefined
    };

    if (card_number) {
      updateData.card_number = card_number;
    }

    await User.findByIdAndUpdate(userId, updateData);

    // Redirigir con mensaje de éxito
    res.redirect('/perfil');
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.render('perfil', {
      pageTitle: 'Turbets - Mi Perfil',
      fullname: res.locals.user.fullname,
      username: res.locals.user.username,
      email: res.locals.user.email,
      birthDate: res.locals.user.fechaNacimiento ? formatDateUTC(res.locals.user.fechaNacimiento) : '',
      saldo: res.locals.user.saldo,
      isLoggedIn: true,
      error: 'Error al actualizar el perfil'
    });
  }
});

// POST para cambiar contraseña
router.post('/cambiar-contrasena', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      return res.render('cambiar-contrasena', {
        pageTitle: 'Turbets - Cambiar Contraseña',
        isLoggedIn: true,
        error: 'Las contraseñas no coinciden'
      });
    }
    
    // Obtener usuario
    const usuario = await User.findById(res.locals.user.id);
    
    if (!usuario) {
      return res.render('cambiar-contrasena', {
        pageTitle: 'Turbets - Cambiar Contraseña',
        isLoggedIn: true,
        error: 'Usuario no encontrado'
      });
    }
    
    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, usuario.passwordHash);
    if (!isMatch) {
      return res.render('cambiar-contrasena', {
        pageTitle: 'Turbets - Cambiar Contraseña',
        isLoggedIn: true,
        error: 'La contraseña actual es incorrecta'
      });
    }
    
    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    usuario.passwordHash = await bcrypt.hash(newPassword, salt);
    await usuario.save();
    
    res.render('cambiar-contrasena', {
      pageTitle: 'Turbets - Cambiar Contraseña',
      isLoggedIn: true,
      success: 'Contraseña cambiada exitosamente'
    });
    
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.render('cambiar-contrasena', {
      pageTitle: 'Turbets - Cambiar Contraseña',
      isLoggedIn: true,
      error: 'Error al cambiar la contraseña'
    });
  }
});

module.exports = router;
