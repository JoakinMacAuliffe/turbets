const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');

const app = express();

// Llaves secretas
require("dotenv").config({ path: require("path").join(__dirname, "keys.env") });
const MONGO_URI = process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT;

if (!MONGO_URI || !JWT_SECRET) {
  console.error("Falta JWT_URI o COOKIE_SECRET en keys.env");
  process.exit(1);
}

// Conexión a MongoDB
mongoose.connect(MONGO_URI).then(() => {
    console.log("Conexión exitosa a MongoDB Atlas");
  }).catch((err) => {
    console.error("Error conectando a MongoDB", err);
    process.exit(1);
  });

// Definir schemas
const User = require("./models/User");
const Transaction = require("./models/Transaction");
const Apuesta = require("./models/Apuesta");

// BodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Formatear fechas en UTC
function formatDateUTC(dateInput) {
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return "";
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch (_) {
    return "";
  }
}

// Configuracion de puerto

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