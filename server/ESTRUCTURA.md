# Estructura del Servidor Turbets

## 📁 Organización de Carpetas

```
server/
├── backend/                    # API y lógica del servidor
│   ├── middleware/
│   │   └── auth.js            # Middleware de autenticación para API
│   ├── models/                # Modelos de MongoDB
│   │   ├── Apuesta.js
│   │   ├── Transaction.js
│   │   └── User.js
│   ├── routes/                # Rutas POST (API)
│   │   ├── auth.js           # Registro, login, logout, recuperar contraseña
│   │   ├── game.js           # Apuestas y resultados de juego
│   │   ├── profile.js        # Editar perfil, cambiar contraseña
│   │   └── transactions.js   # Depósitos y retiros
│   ├── index.js              # Router principal del backend
│   └── keys.env              # Variables de entorno
│
├── frontend/                   # Vistas y páginas
│   ├── middleware/
│   │   └── auth.js            # Middleware de autenticación para vistas
│   ├── routes/                # Rutas GET (páginas)
│   │   ├── public.js         # Páginas públicas (home, login, registro)
│   │   ├── game.js           # Páginas del juego (ruleta, juego)
│   │   └── user.js           # Páginas del usuario (perfil, transacciones)
│   ├── utils/
│   │   └── formatters.js     # Funciones de utilidad (formateo de fechas)
│   └── index.js              # Router principal del frontend
│
├── public/                     # Archivos estáticos (CSS, JS, imágenes)
├── views/                      # Templates Handlebars
├── server.js                   # Servidor principal Express
└── package.json               # Dependencias del proyecto
```

## 🔧 Arquitectura

### Backend (API)
- **Rutas POST** para operaciones que modifican datos
- Respuestas en JSON para endpoints de juego
- Renderiza vistas para formularios (registro, login, etc.)

### Frontend (Vistas)
- **Rutas GET** para servir páginas HTML
- Middleware de autenticación con redirección
- Renderiza templates Handlebars

### Server Principal
- Configura Express, Handlebars y MongoDB
- Importa y usa los routers de backend y frontend
- Maneja archivos estáticos y middleware global

## 🚀 Flujo de Requests

1. **Request llega a `server.js`**
2. Middleware global (cookies, body-parser, session)
3. Se enruta a:
   - `backend/` si es una operación de API
   - `frontend/` si es una página/vista
4. Cada módulo maneja su lógica específica
5. Respuesta al cliente

## 📝 Beneficios de esta Estructura

✅ **Modular**: Cada archivo tiene una responsabilidad clara  
✅ **Escalable**: Fácil agregar nuevas rutas sin modificar archivos existentes  
✅ **Mantenible**: Código organizado por funcionalidad  
✅ **Separación clara**: Backend (API) vs Frontend (Vistas)  
✅ **Reutilizable**: Middlewares y utilidades compartidas
