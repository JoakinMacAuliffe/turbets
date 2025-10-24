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
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Body Parser

app.use(bodyParser.urlencoded({ extended: true }));

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
app.post('/deposito', requireAuth, async (req, res) => {
  try {
    const { monto } = req.body;
    const amount = Number(monto);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).render('deposito', {
        pageTitle: 'Turbets - Depositar',
        saldo: res.locals.user.saldo,
        error: 'Monto inválido. Ingrese un número mayor a 0.'
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

    return res.render('deposito', {
      pageTitle: 'Turbets - Depositar',
      saldo: usuarioActualizado.saldo,
      success: 'Depósito realizado exitosamente.'
    });
  } catch (err) {
    console.error('Error en depósito:', err);
    return res.status(500).render('deposito', {
      pageTitle: 'Turbets - Depositar',
      saldo: res.locals.user.saldo,
      error: 'No se pudo procesar el depósito. Intente nuevamente.'
    });
  }
});

// POST para retiro
app.post('/retiro', requireAuth, async (req, res) => {
  try {
    const { monto } = req.body;
    const amount = Number(monto);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).render('deposito', {
        pageTitle: 'Turbets - Depositar',
        saldo: res.locals.user.saldo,
        error: 'Monto inválido. Ingrese un número mayor a 0.'
      });
    }

    // Solo actualiza si hay saldo suficiente (condición atómica)
    const usuarioActualizado = await User.findOneAndUpdate(
      { _id: res.locals.user.id, saldo: { $gte: amount } },
      { $inc: { saldo: -amount } },
      { new: true }
    ).lean();

    if (!usuarioActualizado) {
      return res.status(400).render('deposito', {
        pageTitle: 'Turbets - Depositar',
        saldo: res.locals.user.saldo,
        error: 'Saldo insuficiente para realizar el retiro.'
      });
    }

    return res.render('deposito', {
      pageTitle: 'Turbets - Depositar',
      saldo: usuarioActualizado.saldo,
      success: 'Retiro realizado exitosamente.'
    });
  } catch (err) {
    console.error('Error en retiro:', err);
    return res.status(500).render('deposito', {
      pageTitle: 'Turbets - Depositar',
      saldo: res.locals.user.saldo,
      error: 'No se pudo procesar el retiro. Intente nuevamente.'
    });
  }
});

// RUTAS GET

app.get("/", (req, res) => {
  res.render("index", { pageTitle: "Turbets - Inicio" });
});

app.get("/acceso", (req, res) =>
  res.render("acceso", { pageTitle: "Turbets - Acceso" })
);
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

app.get("/deposito", requireAuth, (req, res) => {
  const u = res.locals.user || {};
  res.render("deposito", {
    pageTitle: "Turbets - Depositar",
    saldo: u.saldo,
  });
});
app.get("/juego", requireAuth, (req, res) => {
  const u = res.locals.user || {};
  res.render("juego", {
    pageTitle: "Turbets - Juego",
    saldo: u.saldo,
  });
});
app.get("/transacciones", requireAuth, (req, res) =>
  res.render("transacciones", { pageTitle: "Turbets - Transacciones" })
);

// Configuracion de puerto

app.listen(PORT, () => {
  console.log("Server corriendo en http://107.20.221.33:" + PORT);
});
