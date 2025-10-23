const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const { engine } = require("express-handlebars");
const app = express();

require('dotenv').config();

const PORT = process.env.PORT || 80;

// Configuracion de MongoDB

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://jfmac:KQEogjzO79qsuLaf@cluster0.2thrxtf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "942526675799825891b49d576df24f36d1d485c7530a6ede771306ed25949300";

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

// POST /acceso - Manejar inicio de sesión
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
      username: usuario.username,
      fullname: usuario.fullname,
      email: usuario.email,
      fechaNacimiento: usuario.fechaNacimiento,
      saldo: usuario.saldo,
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

// POST /logout
app.post("/logout", (req, res) => {
  res.clearCookie("user");
  return res.redirect("/");
});

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

function requireAuth(req, res, next) {
  if (!res.locals.user) return res.redirect("/acceso");
  next();
}

// Configuracion de imagenes y CSS en el directorio /public/

app.use(express.static(path.join(__dirname, "public")));

// Configuracion de rutas

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
app.get("/ruleta", (req, res) =>
  res.render("ruleta", { pageTitle: "Turbets - Ruleta" })
);

app.get("/perfil", requireAuth, (req, res) => {
  const u = res.locals.user || {};
  res.render("perfil", {
    pageTitle: "Turbets - Mi Perfil",
    fullname: u.fullname,
    username: u.username,
    email: u.email,
    birthDate: u.fechaNacimiento,
    saldo: u.saldo,
  });
});
app.get("/deposito", (req, res) =>
  res.render("deposito", { pageTitle: "Turbets - Depositar", isLoggedIn: true })
);
app.get("/juego", (req, res) =>
  res.render("juego", { pageTitle: "Turbets - Juego", isLoggedIn: true })
);
app.get("/transacciones", (req, res) =>
  res.render("transacciones", {
    pageTitle: "Turbets - Transacciones",
    isLoggedIn: true,
  })
);

// Configuracion de puerto

app.listen(PORT, () => {
  console.log("Server corriendo en http://107.20.221.33:" + PORT);
});
