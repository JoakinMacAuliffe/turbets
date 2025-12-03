const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { engine } = require("express-handlebars");
const app = express();

// Llaves secretas
require("dotenv").config({ path: require("path").join(__dirname, "backend", "keys.env") });
const MONGO_URI = process.env.MONGO_URI;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const PORT = process.env.PORT;

if (!MONGO_URI || !COOKIE_SECRET) {
  console.error("Falta MONGO_URI o COOKIE_SECRET en keys.env");
  process.exit(1);
}

// Configuracion de MongoDB

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Conexión exitosa a MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Error conectando a MongoDB", err);
    process.exit(1);
  });

// Manejadores de reconexión de MongoDB
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado. Intentando reconectar...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconectado exitosamente');
});

mongoose.connection.on('error', (err) => {
  console.error('Error de MongoDB:', err);
});

// Importar routers
const backendRouter = require('./backend');
const frontendRouter = require('./frontend');

// Configuracion de cookies

app.use(cookieParser(COOKIE_SECRET));

// Configuracion de handlebars

app.engine(
  "handlebars",
  engine({
    extname: ".handlebars", // Para que vea los archivos .handlebars
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views", "layouts"),
    partialsDir: path.join(__dirname, "views", "partials"), // Partials son elementos compuestos, en este caso, el header
    helpers: {
      eq: (a, b) => a === b,
      add: (a, b) => a + b,
      formatDate: (date) => { // Helper para que salgan bien las fechas
        if (!date) return "";
        const d = new Date(date);
        return `${String(d.getUTCDate()).padStart(2, "0")}/${String(
          d.getUTCMonth() + 1
        ).padStart(2, "0")}/${d.getUTCFullYear()}`;
      },
      shortId: (id) => {
        if (!id) return '';
        return id.toString().substring(0, 8).toUpperCase();
      },
      formatTipoApuesta: (tipo) => {
        const tipos = {
          'pleno': 'Pleno',
          'caballo': 'Caballo',
          'transversal': 'Transversal',
          'cuadro': 'Cuadro',
          'seisena': 'Seisena',
          'docena': 'Docena',
          'columna': 'Columna',
          'dos-docenas': 'Dos Docenas',
          'dos-columnas': 'Dos Columnas',
          'rojo': 'Rojo',
          'negro': 'Negro',
          'par': 'Par',
          'impar': 'Impar',
          'falta': 'Falta (1-18)',
          'pasa': 'Pasa (19-36)'
        };
        return tipos[tipo] || tipo;
      },
      formatValorApostado: (valor, tipo) => {
        if (!valor) return '-';
        
        // Para apuestas simples (rojo, negro, par, impar, falta, pasa)
        if (['rojo', 'negro', 'par', 'impar', 'falta', 'pasa'].includes(tipo)) {
          return '-';
        }
        
        // Para docenas y columnas
        if (tipo === 'docena') {
          const docenas = { '1': '1ra (1-12)', '2': '2da (13-24)', '3': '3ra (25-36)' };
          return docenas[valor] || `Docena ${valor}`;
        }
        
        if (tipo === 'columna') {
          const columnas = { '1': '1ra', '2': '2da', '3': '3ra' };
          return `${columnas[valor] || valor} columna`;
        }
        
        // Para dos docenas y dos columnas
        if (tipo === 'dos-docenas') {
          return valor === '1-2' ? '1ra y 2da (1-24)' : '2da y 3ra (13-36)';
        }
        
        if (tipo === 'dos-columnas') {
          return valor === '1-2' ? '1ra y 2da columnas' : '2da y 3ra columnas';
        }
        
        // Para seisena (rango)
        if (tipo === 'seisena') {
          return valor.replace('-', ' a ');
        }
        
        // Para otros tipos (pleno, caballo, transversal, cuadro)
        // Reemplazar separadores por comas y espacios
        return valor.toString().replace(/,/g, ', ').replace(/-/g, ', ');
      }
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Body Parser

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Funcion para que los handlebars lean la sesion correctamente

app.use((req, res, next) => {
  let user = null;
  if (req.signedCookies.user) {
    try {
      user = JSON.parse(req.signedCookies.user);
    } catch (e) {
      // Cookie invalida
      res.clearCookie("user");
    }
  }
  res.locals.user = user;
  res.locals.isLoggedIn = !!user;
  next();
});

// Configuracion de imagenes y CSS en el directorio /public/

app.use(express.static(path.join(__dirname, "public")));

// Usar routers
app.use('/', backendRouter);
app.use('/', frontendRouter);

// Manejadores de errores no capturados
process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err);
  console.error('Stack:', err.stack);
  // No salir del proceso, PM2 lo manejará
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa rechazada no manejada:', reason);
  console.error('Promesa:', promise);
});

app.listen(PORT, () => {
  console.log("Server corriendo en http://107.20.221.33:" + PORT);
});
