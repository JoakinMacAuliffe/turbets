const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { engine } = require("express-handlebars");
const app = express();

// Llaves secretas
require("dotenv").config({ path: require("path").join(__dirname, "keys.env") });
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
  });

const User = require("./models/User");
const Transaction = require("./models/Transaction");
const Apuesta = require("./models/Apuesta");

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
      }
    },
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Body Parser

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

async function requireAuth(req, res, next) {
  try {
    if (!req.signedCookies.user) return res.redirect("/acceso");

    const session = JSON.parse(req.signedCookies.user);
    if (!session?.id) return res.redirect("/acceso");

    // Traer informacion desde MongoDB
    const usuario = await User.findById(session.id).lean();
    if (!usuario) {
      res.clearCookie("user");
      return res.redirect("/acceso");
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
    console.error("Auth error:", err);
    res.clearCookie("user");
    return res.redirect("/acceso");
  }
}

// Configuracion de imagenes y CSS en el directorio /public/

app.use(express.static(path.join(__dirname, "public")));

// RUTAS POST

// Configuracion de ruta POST para registrarse

app.post("/registro", async (req, res) => {
  const {
    fullname,
    username,
    email,
    password,
    "password-confirm": passwordConfirm,
    "fecha-nacimiento": fechaNacimiento,
  } = req.body;

  // Función para registrar un error
  function renderRegistro(error) {
    res.render("registro", {
      pageTitle: "Turbets - Registro",
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
    return renderRegistro("Por favor complete todos los campos");
  }
  // Validar que las contraseñas coincidan
  if (password !== passwordConfirm) {
    return renderRegistro("Las contraseñas no coinciden");
  }

  try {
    const emailExists = await User.findOne({ email });
    // Verificar si el email ya está registrado
    if (emailExists) {
      return renderRegistro("El correo electrónico ya está registrado");
    }

    // Verificar si el nombre de usuario ya existe
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return renderRegistro("El nombre de usuario ya está en uso");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Crear y guardar el nuevo usuario
    const newUser = new User({
      fullname,
      username,
      email,
      passwordHash,
      fechaNacimiento,
      saldo: 0,
    });

    await newUser.save();
    console.log("Usuario registrado: ", username);
    console.log("Total usuarios: ", await User.countDocuments());

    // Redirigir al login
    res.redirect("/acceso");
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return renderRegistro(
      "Error al crear la cuenta. Por favor intente de nuevo."
    );
  }
});

// Ruta POST para inicio de sesión
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  function renderAcceso(error) {
    return res.render("acceso", {
      pageTitle: "Turbets - Acceso",
      error,
    });
  }

  // Verificar campos vacios
  if (!email || !password) {
    return renderAcceso("Por favor ingrese email y contraseña");
  }

  try {
    // Buscar usuario en MongoDB
    const usuario = await User.findOne({ email });
    if (!usuario) {
      return renderAcceso("Credenciales inválidas");
    }

    // Verifiar contraseña con bcrypt
    const ok = await bcrypt.compare(password, usuario.passwordHash);
    if (!ok) {
      return renderAcceso("Credenciales inválidas");
    }

    const userData = {
      id: usuario._id.toString(), // ID de MongoDB
      username: usuario.username,
    };

    res.cookie("user", JSON.stringify(userData), {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // La sesion dura 7 dias
    });

    return res.redirect("/perfil");
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return renderAcceso("Error al iniciar sesión. Por favor intente de nuevo.");
  }
});

// POST para cerrar sesion
app.post("/logout", (req, res) => {
  res.clearCookie("user");
  return res.redirect("/");
});

// POST para deposito
app.post("/deposito", requireAuth, async (req, res) => {
  try {
    const { monto } = req.body;
    const amount = Number(monto);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).render("realizar-transaccion", {
        pageTitle: "Turbets - Depositar",
        saldo: res.locals.user.saldo,
        depositoError: "Monto inválido. Ingrese un número mayor a 0.",
      });
    }

    const usuarioActualizado = await User.findByIdAndUpdate(
      res.locals.user.id,
      { $inc: { saldo: amount } },
      { new: true }
    ).lean();

    if (!usuarioActualizado) {
      res.clearCookie("user");
      return res.redirect("/acceso");
    }

    const postBalance = usuarioActualizado.saldo;
    const preBalance = postBalance - amount;

    await Transaction.create({
      type: "DEPOSITO",
      user_id: usuarioActualizado._id,
      amount,
      prebalance: preBalance,
      postbalance: postBalance,
    });

    return res.render("realizar-transaccion", {
      pageTitle: "Turbets - Depositar",
      saldo: usuarioActualizado.saldo,
      depositoSuccess: "Depósito realizado exitosamente.",
    });
  } catch (err) {
    console.error("Error en depósito:", err);
    return res.status(500).render("realizar-transaccion", {
      pageTitle: "Turbets - Depositar",
      saldo: res.locals.user.saldo,
      depositoError: "No se pudo procesar el depósito. Intente nuevamente.",
    });
  }
});

// POST para retiro
app.post("/retiro", requireAuth, async (req, res) => {
  try {
    const { monto } = req.body;
    const amount = Number(monto);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).render("realizar-transaccion", {
        pageTitle: "Turbets - Depositar",
        saldo: res.locals.user.saldo,
        retiroError: "Monto inválido. Ingrese un número mayor a 0.",
      });
    }

    // Solo actualiza si hay saldo suficiente (condición atómica)
    const usuarioActualizado = await User.findOneAndUpdate(
      { _id: res.locals.user.id, saldo: { $gte: amount } },
      { $inc: { saldo: -amount } },
      { new: true }
    ).lean();

    if (!usuarioActualizado) {
      return res.status(400).render("realizar-transaccion", {
        pageTitle: "Turbets - Depositar",
        saldo: res.locals.user.saldo,
        retiroError: "Saldo insuficiente para realizar el retiro.",
      });
    }

    const postBalance = usuarioActualizado.saldo;
    const preBalance = postBalance + amount;

    await Transaction.create({
      type: "RETIRO",
      user_id: usuarioActualizado._id,
      amount,
      prebalance: preBalance,
      postbalance: postBalance,
    });

    return res.render("realizar-transaccion", {
      pageTitle: "Turbets - Depositar",
      saldo: usuarioActualizado.saldo,
      retiroSuccess: "Retiro realizado exitosamente.",
    });
  } catch (err) {
    console.error("Error en retiro:", err);
    return res.status(500).render("realizar-transaccion", {
      pageTitle: "Turbets - Depositar",
      saldo: res.locals.user.saldo,
      retiroError: "No se pudo procesar el retiro. Intente nuevamente.",
    });
  }
});

// POST para apuestas

app.post("/apuesta", requireAuth, async (req, res) => {
  try {
    const { monto, tipoApuesta, valor } = req.body;

    const usuario = await User.findById(res.locals.user.id);

    if (usuario.saldo < monto) {
      return res.status(400).json({ error: "Saldo insuficiente "});
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
      estado: 'En progreso'
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

app.post("/resultado-apuesta", requireAuth, async (req, res) => {
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
})

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

// RUTAS GET

app.get("/", (req, res) => {
  res.render("index", { pageTitle: "Turbets - Inicio" });
});

app.get("/acceso", (req, res) =>
  res.render("acceso", { pageTitle: "Turbets - Acceso" })
);

app.get("/recuperar-contrasena", (req, res) => {
  res.render("recuperar-contrasena", { 
    pageTitle: "Turbets - Recuperar Contraseña",
    showPasswordFields: false
  });
});

app.post("/recuperar-contrasena", async (req, res) => {
  try {
    const { email, newPassword, confirmPassword, step } = req.body;

    // Si es el primer paso, verificar que el usuario existe
    if (!step || step !== 'reset') {
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.render("recuperar-contrasena", {
          pageTitle: "Turbets - Recuperar Contraseña",
          error: "No existe una cuenta con ese correo electrónico",
          showPasswordFields: false
        });
      }

      // Usuario existe, mostrar campos de contraseña
      return res.render("recuperar-contrasena", {
        pageTitle: "Turbets - Recuperar Contraseña",
        showPasswordFields: true,
        email: email
      });
    }

    // Segundo paso: cambiar la contraseña
    if (step === 'reset') {
      // Validar que las contraseñas coincidan
      if (newPassword !== confirmPassword) {
        return res.render("recuperar-contrasena", {
          pageTitle: "Turbets - Recuperar Contraseña",
          error: "Las contraseñas no coinciden",
          showPasswordFields: true,
          email: email
        });
      }

      // Buscar usuario y actualizar contraseña
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.render("recuperar-contrasena", {
          pageTitle: "Turbets - Recuperar Contraseña",
          error: "Error al procesar la solicitud",
          showPasswordFields: false
        });
      }

      // Hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.passwordHash = hashedPassword;
      await user.save();

      // Redirigir al login con mensaje de éxito
      return res.render("acceso", {
        pageTitle: "Turbets - Acceso",
        success: "Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña."
      });
    }

  } catch (error) {
    console.error("Error en recuperación de contraseña:", error);
    res.render("recuperar-contrasena", {
      pageTitle: "Turbets - Recuperar Contraseña",
      error: "Error al procesar la solicitud",
      showPasswordFields: false
    });
  }
});

app.get("/info-app", (req, res) =>
  res.render("info-app", {
    pageTitle: "Turbets - Información",
    bodyClass: "info_app",
  })
);
app.get("/registro", (req, res) =>
  res.render("registro", { pageTitle: "Turbets - Registro" })
);
app.get("/ruleta", requireAuth, (req, res) =>
  res.render("ruleta", { pageTitle: "Turbets - Ruleta" })
);

app.get("/perfil", requireAuth, (req, res) => {
  const u = res.locals.user || {};
  const birthDate = u.fechaNacimiento ? formatDateUTC(u.fechaNacimiento) : "";
  res.render("perfil", {
    pageTitle: "Turbets - Mi Perfil",
    fullname: u.fullname,
    username: u.username,
    email: u.email,
    birthDate,
    saldo: u.saldo,
  });
});

app.post("/editar-perfil", requireAuth, async (req, res) => {
  try {
    const { fullname, username, email, birthDate, card_number } = req.body;
    const userId = req.session.userId;

    // Validar que el username no esté siendo usado por otro usuario
    if (username !== res.locals.user.username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.render("perfil", {
          pageTitle: "Turbets - Mi Perfil",
          fullname: res.locals.user.fullname,
          username: res.locals.user.username,
          email: res.locals.user.email,
          birthDate: res.locals.user.fechaNacimiento ? formatDateUTC(res.locals.user.fechaNacimiento) : "",
          saldo: res.locals.user.saldo,
          error: "El nombre de usuario ya está en uso"
        });
      }
    }

    // Validar que el email no esté siendo usado por otro usuario
    if (email !== res.locals.user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingEmail) {
        return res.render("perfil", {
          pageTitle: "Turbets - Mi Perfil",
          fullname: res.locals.user.fullname,
          username: res.locals.user.username,
          email: res.locals.user.email,
          birthDate: res.locals.user.fechaNacimiento ? formatDateUTC(res.locals.user.fechaNacimiento) : "",
          saldo: res.locals.user.saldo,
          error: "El correo electrónico ya está en uso"
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
    res.redirect("/perfil");
  } catch (error) {
    console.error("Error actualizando perfil:", error);
    res.render("perfil", {
      pageTitle: "Turbets - Mi Perfil",
      fullname: res.locals.user.fullname,
      username: res.locals.user.username,
      email: res.locals.user.email,
      birthDate: res.locals.user.fechaNacimiento ? formatDateUTC(res.locals.user.fechaNacimiento) : "",
      saldo: res.locals.user.saldo,
      error: "Error al actualizar el perfil"
    });
  }
});

app.get("/cambiar-contrasena", requireAuth, (req, res) => {
  res.render("cambiar-contrasena", {
    pageTitle: "Turbets - Cambiar Contraseña"
  });
});

app.post("/cambiar-contrasena", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      return res.render("cambiar-contrasena", {
        pageTitle: "Turbets - Cambiar Contraseña",
        error: "Las contraseñas no coinciden"
      });
    }
    
    // Validar longitud mínima
    if (newPassword.length < 6) {
      return res.render("cambiar-contrasena", {
        pageTitle: "Turbets - Cambiar Contraseña",
        error: "La contraseña debe tener al menos 6 caracteres"
      });
    }
    
    // Obtener usuario
    const usuario = await User.findById(res.locals.user.id);
    
    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, usuario.passwordHash);
    if (!isMatch) {
      return res.render("cambiar-contrasena", {
        pageTitle: "Turbets - Cambiar Contraseña",
        error: "La contraseña actual es incorrecta"
      });
    }
    
    // Hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    usuario.passwordHash = await bcrypt.hash(newPassword, salt);
    await usuario.save();
    
    res.render("cambiar-contrasena", {
      pageTitle: "Turbets - Cambiar Contraseña",
      success: "Contraseña cambiada exitosamente"
    });
    
  } catch (error) {
    res.render("cambiar-contrasena", {
      pageTitle: "Turbets - Cambiar Contraseña",
      error: "Error al cambiar la contraseña"
    });
  }
});

app.get("/deposito", requireAuth, (req, res) => {
  const u = res.locals.user || {};
  res.render("realizar-transaccion", {
    pageTitle: "Turbets - Depositar",
    saldo: u.saldo,
  });
});

app.get("/juego", requireAuth, async (req, res) => {
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

    res.render("juego", {
      pageTitle: "Turbets - Juego",
      saldo: u.saldo,
      ultimosNumeros: JSON.stringify(ultimosNumeros),
      ultimasApuestas: JSON.stringify(apuestasFormateadas)
    });
  } catch (error) {
    console.error("Error al cargar juego:", error);
    res.render("juego", {
      pageTitle: "Turbets - Juego",
      saldo: res.locals.user?.saldo || 0,
      ultimosNumeros: JSON.stringify([]),
      ultimasApuestas: JSON.stringify([])
    });
  }
});

app.get("/transacciones", requireAuth, async (req, res) => {
  try {
    // Obtener datos para filtrar
    const limit = parseInt(req.query.limit) || 50;
    const type = req.query.type || '';
    const dateFrom = req.query.dateFrom || '';
    const dateTo = req.query.dateTo || '';

    // Crear query
    const query = { user_id: res.locals.user.id };
    
    // Filtrar por tipo
    if (type) {
      query.type = type;
    }
    
    // Filtrar por fecha
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.render('transacciones', {
      pageTitle: 'Turbets - Transacciones',
      transactions,
      limit,
      type,
      dateFrom,
      dateTo
    });
  } catch (error) {
    console.error('Error importando transacciones:', error);
    res.render('transacciones', {
      pageTitle: 'Turbets - Transacciones',
      transactions: [],
      error: 'Error al cargar las transacciones'
    });
  }
});

// Configuracion de puerto

app.listen(PORT, () => {
  console.log("Server corriendo en http://107.20.221.33:" + PORT);
});
