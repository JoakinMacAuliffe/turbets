# Entrega 1: Sitio HTML + CSS

**Fecha de entrega:** 7 de septiembre a las 23:59  
**Disponible:** 21 de agosto 00:00 – 8 de septiembre 23:59  
**Formato de entrega:** cuadro de entrada de texto, URL de página web, grabación multimedia, o carga de archivo.  
**Puntos:** 0  

---

## Descripción del Proyecto
El proyecto semestral consiste en el desarrollo de un **casino online** que implementa el juego de la **ruleta europea**.

### Experiencia del Usuario Objetivo
Un usuario interesado en juegos de casino ingresa al sitio web y observa que se trata de una plataforma de casino online especializada en ruleta. Después de explorar la información del juego, decide registrarse para comenzar a apostar.

Una vez registrado e iniciada la sesión, accede a su panel principal donde puede ver:

- Su saldo actual de fichas virtuales  
- Historial de sus apuestas y resultados  
- Mesa de ruleta disponible para jugar  

El usuario se dirige a la mesa de ruleta, donde puede realizar diferentes tipos de apuestas, coloca sus fichas en las opciones deseadas, gira la ruleta y espera el resultado. El sistema actualiza automáticamente su saldo según los resultados obtenidos.

Durante sus sesiones de juego, puede consultar estadísticas de sus partidas, revisar el historial de números ganadores recientes, y gestionar su perfil de usuario. La plataforma mantiene un registro completo de todas sus actividades de juego.

---

## Objetivo
Desarrollar la **interfaz visual completa** del casino online utilizando **exclusivamente HTML y CSS**, sin frameworks, creando todas las páginas necesarias con navegación funcional.

---

## Páginas Requeridas

### 1. Página de Inicio
Landing site con links para acceder a las siguientes secciones:
- Registro de usuario
- Acceso al casino
- Información de la aplicación y sus desarrolladores
- Información sobre la ruleta y sus reglas

### 2. Registro de usuario
Formulario con los siguientes campos:
- Nombre completo  
- Correo electrónico  
- Nombre de usuario  
- Contraseña y confirmación  
- Fecha de nacimiento  

### 3. Acceso al casino
Formulario con los siguientes campos:
- Nombre de usuario  
- Contraseña  

> Esta página debe redirigir al perfil de usuario, aunque en esta etapa no es necesario validar credenciales.

### 4. Información sobre la aplicación y sus desarrolladores
Debe incluir:
- Objetivos de la aplicación  
- Equipo de desarrollo  
- Tecnologías utilizadas  
- Aclaración de que es un proyecto académico  

### 5. Información sobre la Ruleta y sus Reglas
Debe incluir:
- Reglas del juego  
- Tipos de apuesta  
- Probabilidades y pagos  
- Consejos de juego responsable  

### 6. Perfil de Usuario
Debe mostrar:
- Información personal del usuario  
- Saldo actual  
- Últimas 5 transacciones de la cuenta (fecha, tipo, monto)  
- Acceso a la mesa de ruleta  

### 7. Simulación de transacciones
Debe permitir:
- **Depositar dinero** (campo de monto y botón)  
- **Retirar dinero** (campo de monto y botón)  
- Mostrar saldo actual  

### 8. Mesa de Ruleta
Debe incluir:
- Tablero de ruleta europea (números 0–36, imagen suficiente en esta entrega)  
- Indicador del estado del juego (recibiendo apuestas, esperando resultado, pagando)  
- Saldo disponible para apostar  
- Últimos 5 números ganadores (con indicación de color)  
- Últimas 5 apuestas realizadas (tipo, monto, resultado, variación del saldo)  
- Link para volver a la página de perfil  

---

## Restricciones Técnicas

### Tecnologías
- Solo **HTML y CSS**, sin frameworks  
- Uso obligatorio de **HTML semántico**  
- Funcionamiento asegurado en **Google Chrome**  

### Diseño
- Viewports entre **1728×864 y 1920×1080 px**  
- Una **única hoja de estilo** compartida en todas las páginas  
- Diseño responsive proporcional (sin necesidad de breakpoints específicos)  
- Esquema de colores homogéneo  
- Tipografía clara y legible  

### Navegación
- Todas las páginas interconectadas  
- Menú de navegación consistente  
- Sin restricciones de acceso (no autenticación real)  

### Contenido
- Datos ficticios para historial y estadísticas  
- Información completa solo en **desarrolladores** y **ruleta**  
- Se permite **placeholder text** excepto en la sección de desarrolladores  

---
