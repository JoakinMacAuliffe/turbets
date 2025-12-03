const User = require('../../backend/models/User');

// Middleware de autenticación para el frontend
async function requireAuth(req, res, next) {
  try {
    if (!req.signedCookies.user) {
      // Guardar la URL original donde el usuario quería ir
      res.cookie('redirectAfterLogin', req.originalUrl, {
        signed: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000, // Expira en 10 minutos
      });
      return res.redirect('/acceso');
    }

    const session = JSON.parse(req.signedCookies.user);
    if (!session?.id) {
      res.cookie('redirectAfterLogin', req.originalUrl, {
        signed: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
      return res.redirect('/acceso');
    }

    // Traer informacion desde MongoDB
    const usuario = await User.findById(session.id).lean();
    if (!usuario) {
      res.clearCookie('user');
      res.cookie('redirectAfterLogin', req.originalUrl, {
        signed: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
      });
      return res.redirect('/acceso');
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
    return res.redirect('/acceso');
  }
}

module.exports = { requireAuth };
