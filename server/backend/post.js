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

  // Validaciones adicionales
  // Email formato
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return renderRegistro("Por favor ingrese un correo electrónico válido");
  }

  // Password longitud mínima
  if (typeof password !== 'string' || password.length < 6) {
    return renderRegistro("La contraseña debe tener al menos 6 caracteres");
  }

  // Username y fullname mínimos
  if (typeof username !== 'string' || username.trim().length < 3) {
    return renderRegistro("El nombre de usuario debe tener al menos 3 caracteres");
  }
  if (typeof fullname !== 'string' || fullname.trim().length < 3) {
    return renderRegistro("Por favor ingrese su nombre completo");
  }

  // Fecha de nacimiento -> validar formato y edad >= 18
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) {
    return renderRegistro("Fecha de nacimiento inválida");
  }
  const edadMs = Date.now() - nacimiento.getTime();
  const edad = Math.abs(new Date(edadMs).getUTCFullYear() - 1970);
  if (edad < 18) {
    return renderRegistro("Debes ser mayor de 18 años para registrarte");
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
      saldo: 5000,
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
  let { email, password } = req.body;

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

  // Trim y normalizar email
  email = typeof email === 'string' ? email.trim().toLowerCase() : '';
  
  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return renderAcceso("Por favor ingrese un correo electrónico válido");
  }

  // Validar que password sea string y tenga longitud razonable
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    return renderAcceso("Contraseña inválida");
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

    // Verificar si hay una URL de redirección guardada
    const redirectUrl = req.signedCookies.redirectAfterLogin || "/perfil";
    
    // Limpiar la cookie de redirección
    res.clearCookie("redirectAfterLogin");

    return res.redirect(redirectUrl);
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

    // Solo actualiza si hay saldo suficiente
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

app.post("/editar-perfil", requireAuth, async (req, res) => {
  try {
    const { fullname, username, email, birthDate, card_number } = req.body;
    const userId = res.locals.user.id;

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
          isLoggedIn: true,
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
          isLoggedIn: true,
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
      isLoggedIn: true,
      error: "Error al actualizar el perfil"
    });
  }
});