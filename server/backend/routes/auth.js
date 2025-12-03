const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();

const User = require('../models/User');

// POST para registrarse
router.post('/registro', async (req, res) => {
  const {
    fullname,
    username,
    email,
    password,
    'password-confirm': passwordConfirm,
    'fecha-nacimiento': fechaNacimiento,
  } = req.body;

  // Función para registrar un error
  function renderRegistro(error) {
    res.render('registro', {
      pageTitle: 'Turbets - Registro',
      error: error,
    });
  }

  // Validar que esten completos los campos
  if (
    !fullname ||
    !username ||
    !email ||
    !password ||
    !passwordConfirm ||
    !fechaNacimiento
  ) {
    return renderRegistro('Por favor complete todos los campos');
  }
  // Validar que las contraseñas coincidan
  if (password !== passwordConfirm) {
    return renderRegistro('Las contraseñas no coinciden');
  }

  // Validaciones adicionales
  // Email formato
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return renderRegistro('Por favor ingrese un correo electrónico válido');
  }

  // Password longitud mínima
  if (typeof password !== 'string' || password.length < 6) {
    return renderRegistro('La contraseña debe tener al menos 6 caracteres');
  }

  // Username y fullname mínimos
  if (typeof username !== 'string' || username.trim().length < 3) {
    return renderRegistro('El nombre de usuario debe tener al menos 3 caracteres');
  }
  if (typeof fullname !== 'string' || fullname.trim().length < 3) {
    return renderRegistro('Por favor ingrese su nombre completo');
  }

  // Fecha de nacimiento -> validar formato y edad >= 18
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) {
    return renderRegistro('Fecha de nacimiento inválida');
  }
  const edadMs = Date.now() - nacimiento.getTime();
  const edad = Math.abs(new Date(edadMs).getUTCFullYear() - 1970);
  if (edad < 18) {
    return renderRegistro('Debes ser mayor de 18 años para registrarte');
  }

  try {
    const emailExists = await User.findOne({ email });
    // Verificar si el email ya está registrado
    if (emailExists) {
      return renderRegistro('El correo electrónico ya está registrado');
    }

    // Verificar si el nombre de usuario ya existe
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return renderRegistro('El nombre de usuario ya está en uso');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Crear y guardar el nuevo usuario
    const newUser = new User({
      fullname,
      username,
      email,
      passwordHash,
      fechaNacimiento,
      saldo: 5000,
    });

    await newUser.save();
    console.log('Usuario registrado: ', username);
    console.log('Total usuarios: ', await User.countDocuments());

    // Redirigir al login
    res.redirect('/acceso');
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return renderRegistro(
      'Error al crear la cuenta. Por favor intente de nuevo.'
    );
  }
});

// POST para inicio de sesión
router.post('/login', async (req, res) => {
  let { email, password } = req.body;

  function renderAcceso(error) {
    return res.render('acceso', {
      pageTitle: 'Turbets - Acceso',
      error,
    });
  }

  // Verificar campos vacios
  if (!email || !password) {
    return renderAcceso('Por favor ingrese email y contraseña');
  }

  // Trim y normalizar email
  email = typeof email === 'string' ? email.trim().toLowerCase() : '';
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return renderAcceso('Por favor ingrese un correo electrónico válido');
  }

  // Validar que password sea string y tenga longitud razonable
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    return renderAcceso('Contraseña inválida');
  }

  try {
    // Buscar usuario en MongoDB
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return renderAcceso('Credenciales inválidas');
    }

    // Verifiar contraseña con bcrypt
    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      return renderAcceso('Credenciales inválidas');
    }

    const userData = {
      id: usuario._id.toString(), // ID de MongoDB
      username: usuario.username,
    };

    res.cookie('user', JSON.stringify(userData), {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // La sesion dura 7 dias
    });

    // Verificar si hay una URL de redirección guardada
    const redirectUrl = req.signedCookies.redirectAfterLogin || '/perfil';
    
    // Limpiar la cookie de redirección
    res.clearCookie('redirectAfterLogin');

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return renderAcceso('Error al iniciar sesión. Por favor intente de nuevo.');
  }
});

// POST para cerrar sesion
router.post('/logout', (req, res) => {
  res.clearCookie('user');
  return res.redirect('/');
});

// POST para recuperar contraseña
router.post('/recuperar-contrasena', async (req, res) => {
  try {
    const { email, newPassword, confirmPassword, step } = req.body;

    // Si es el primer paso, verificar que el usuario existe
    if (!step || step !== 'reset') {
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.render('recuperar-contrasena', {
          pageTitle: 'Turbets - Recuperar Contraseña',
          error: 'No existe una cuenta con ese correo electrónico',
          showPasswordFields: false
        });
      }

      // Usuario existe, mostrar campos de contraseña
      return res.render('recuperar-contrasena', {
        pageTitle: 'Turbets - Recuperar Contraseña',
        showPasswordFields: true,
        email: email
      });
    }

    // Segundo paso: cambiar la contraseña
    if (step === 'reset') {
      // Validar que las contraseñas coincidan
      if (newPassword !== confirmPassword) {
        return res.render('recuperar-contrasena', {
          pageTitle: 'Turbets - Recuperar Contraseña',
          error: 'Las contraseñas no coinciden',
          showPasswordFields: true,
          email: email
        });
      }

      // Buscar usuario y actualizar contraseña
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.render('recuperar-contrasena', {
          pageTitle: 'Turbets - Recuperar Contraseña',
          error: 'Error al procesar la solicitud',
          showPasswordFields: false
        });
      }

      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.passwordHash = hashedPassword;
      await user.save();

      // Redirigir al login con mensaje de éxito
      return res.render('acceso', {
        pageTitle: 'Turbets - Acceso',
        success: 'Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.'
      });
    }

  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.render('recuperar-contrasena', {
      pageTitle: 'Turbets - Recuperar Contraseña',
      error: 'Error al procesar la solicitud',
      showPasswordFields: false
    });
  }
});

module.exports = router;
