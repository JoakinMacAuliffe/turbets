const User = require('../models/User');

// Middleware de autenticación para rutas del backend
async function requireAuth(req, res, next) {
  try {
    if (!req.signedCookies.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const session = JSON.parse(req.signedCookies.user);
    if (!session?.id) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }

    // Traer información desde MongoDB
    const usuario = await User.findById(session.id).lean();
    if (!usuario) {
      res.clearCookie('user');
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    res.locals.user = {
      id: usuario._id.toString(),
      username: usuario.username,
      fullname: usuario.fullname,
      email: usuario.email,
      fechaNacimiento: usuario.fechaNacimiento,
      saldo: usuario.saldo,
    };
    res.locals.isLoggedIn = true;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.clearCookie('user');
    return res.status(401).json({ error: 'Error de autenticación' });
  }
}

module.exports = { requireAuth };
