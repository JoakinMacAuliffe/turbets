const express = require('express');
const router = express.Router();

// RUTAS GET - Páginas públicas

router.get('/', (req, res) => {
  res.render('index', { pageTitle: 'Turbets - Inicio' });
});

router.get('/acceso', (req, res) =>
  res.render('acceso', { pageTitle: 'Turbets - Acceso' })
);

router.get('/recuperar-contrasena', (req, res) => {
  res.render('recuperar-contrasena', { 
    pageTitle: 'Turbets - Recuperar Contraseña',
    showPasswordFields: false
  });
});

router.get('/info-app', (req, res) =>
  res.render('info-app', {
    pageTitle: 'Turbets - Información',
    bodyClass: 'info_app',
  })
);

router.get('/registro', (req, res) =>
  res.render('registro', { pageTitle: 'Turbets - Registro' })
);

module.exports = router;
