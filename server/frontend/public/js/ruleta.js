// ========== CONFIGURACIÓN Y CONSTANTES ==========
const numbersCW = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const isRed   = n => redSet.has(n);
const isGreen = n => n === 0;

const seg = 360 / numbersCW.length; // ~9.7297° por sector
const startAngle = -90 - seg/2;     // centra el "0" en la parte superior

// ========== VARIABLES GLOBALES ==========
let tipoApuestaActual = 'pleno';
let valorApuesta = 0;
let apuestaActualId = null;
let currentRotation = 0;
let spinning = false;
let lastWinIdx = null;

// ========== ELEMENTOS DEL DOM ==========
const wheel = document.getElementById('wheel');
const spinBtn = document.querySelector('.spin-button');
const statusEl = document.querySelector('.stat-status');
const betInput = document.getElementById('bet-amount');
const saldoElement = document.querySelector('.badge-value');

// ========== FUNCIONES DE RENDERIZADO DE LA RULETA ==========
function paintWheel(){
  const parts = numbersCW.map((n,i) => {
    const color = isGreen(n) ? 'var(--green)' : (isRed(n) ? 'var(--red)' : 'var(--black)');
    const from = (i * seg).toFixed(6);
    const to   = ((i+1) * seg).toFixed(6);
    return `${color} ${from}deg ${to}deg`;
  });

  const bg = `
    radial-gradient(circle at 50% 50%, #0000 58%, rgba(255,255,255,.06) 58.2% 59%, #0000 59%),
    conic-gradient(from ${startAngle}deg, ${parts.join(',')})
  `;
  
  wheel.style.background = bg;
}

function drawLabels(){
  const labelsWrap = document.createElement('div');
  labelsWrap.className = 'labels';
  wheel.appendChild(labelsWrap);

  const R = wheel.clientWidth / 2 - 25;

  numbersCW.forEach((n, i) => {
    const label = document.createElement('div');
    label.className = 'label' + (n === 0 ? ' green' : '');
    label.textContent = n;

    const phi = startAngle + (i + 0.5) * seg;
    const rad = phi * Math.PI / 180;
    const x = Math.cos(rad) * R;
    const y = Math.sin(rad) * R;

    label.style.setProperty('--pos', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`);
    label.style.transform = `translate(-50%, -50%) var(--pos) rotate(${phi + 90}deg)`;
    labelsWrap.appendChild(label);
  });
}

// ========== FUNCIONES DE JUEGO ==========
function indexAtPointer(rotation){
  const rel = ((-rotation - 90 - startAngle) % 360 + 360) % 360;
  return Math.floor(rel / seg) % numbersCW.length;
}

function formatearNombreApuesta(tipo) {
  const nombres = {
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
    'falta': 'Falta',
    'pasa': 'Pasa'
  };
  return nombres[tipo] || tipo;
}

function showResult(n){
  const color = (n===0) ? 'VERDE' : (isRed(n) ? 'ROJO' : 'NEGRO');
  const dot = (n===0) ? 'dot-green' : (isRed(n) ? 'dot-red' : 'dot-black');
  statusEl.innerHTML = `
    <span class="result-chip" role="status">
      <span class="result-dot ${dot}"></span>
      ${n} — ${color}
    </span>
  `;
}

async function spin() {
  if (spinning) return;
  
  const monto = parseInt(betInput.value);
  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido');
    return;
  }
  
  // Obtener valor de la apuesta según tipo
  if (tipoApuestaActual === 'pleno') {
    valorApuesta = parseInt(document.getElementById('numero-apuesta').value);
  } else if (tipoApuestaActual === 'caballo') {
    valorApuesta = document.getElementById('caballo-apuesta').value;
  } else if (tipoApuestaActual === 'transversal') {
    valorApuesta = document.getElementById('transversal-apuesta').value;
  } else if (tipoApuestaActual === 'cuadro') {
    valorApuesta = document.getElementById('cuadro-apuesta').value;
  } else if (tipoApuestaActual === 'seisena') {
    valorApuesta = document.getElementById('seisena-apuesta').value;
  } else if (tipoApuestaActual === 'docena') {
    valorApuesta = parseInt(document.getElementById('docena-apuesta').value);
  } else if (tipoApuestaActual === 'columna') {
    valorApuesta = parseInt(document.getElementById('columna-apuesta').value);
  } else if (tipoApuestaActual === 'dos-docenas') {
    valorApuesta = document.getElementById('dos-docenas-apuesta').value;
  } else if (tipoApuestaActual === 'dos-columnas') {
    valorApuesta = document.getElementById('dos-columnas-apuesta').value;
  } else {
    valorApuesta = tipoApuestaActual;
  }
  
  // Crear apuesta en el servidor
  try {
    const response = await fetch('/apuesta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        monto: monto,
        tipoApuesta: tipoApuestaActual,
        valor: valorApuesta
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      alert(data.error || 'Error al realizar apuesta');
      return;
    }
    
    apuestaActualId = data.apuestaId;
    saldoElement.textContent = `$${data.nuevoSaldo}`;
    
    // Girar la ruleta
    spinning = true;
    spinBtn.disabled = true;
    statusEl.textContent = 'Girando…';

    const extraTurns = (Math.floor(Math.random()*4) + 4) * 360;
    const randomAngle = Math.floor(Math.random() * 360);
    const duration = (Math.random() * (5 - 3) + 3).toFixed(2);

    currentRotation += (extraTurns + randomAngle);
    wheel.style.transition = `transform ${duration}s cubic-bezier(.12,.63,.16,1)`;
    wheel.style.transform = `rotate(${currentRotation}deg)`;

    wheel.addEventListener('transitionend', onEnd, { once:true });
    
  } catch (error) {
    alert('Error de conexión');
    console.error(error);
  }
}

async function onEnd() {
  currentRotation = ((currentRotation % 360) + 360) % 360;
  const idx = indexAtPointer(currentRotation);
  const numeroGanador = numbersCW[idx];

  // Marcar visualmente
  const labels = wheel.querySelectorAll('.label');
  if (lastWinIdx !== null && labels[lastWinIdx]) 
    labels[lastWinIdx].classList.remove('win');
  if (labels[idx]) labels[idx].classList.add('win');
  lastWinIdx = idx;

  showResult(numeroGanador);

  // Enviar resultado al servidor
  try {
    const response = await fetch('/resultado-apuesta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apuestaId: apuestaActualId,
        numeroGanador: numeroGanador
      })
    });
    
    const data = await response.json();
    
    if (data.gano) {
      statusEl.innerHTML += ` <span style="color: #4ade80;">¡GANASTE $${data.pago}!</span>`;
    } else {
      statusEl.innerHTML += ` <span style="color: #ef4444;">Perdiste</span>`;
    }
    
    saldoElement.textContent = `$${data.nuevoSaldo}`;
    
    // Actualizar historial
    actualizarHistorial(numeroGanador, data.gano, parseInt(betInput.value), data.pago);
    
  } catch (error) {
    console.error('Error al procesar resultado:', error);
  }

  spinning = false;
  spinBtn.disabled = false;
  wheel.style.transition = 'none';
  wheel.style.transform = `rotate(${currentRotation}deg)`;
  void wheel.offsetWidth;
}

function actualizarHistorial(numero, gano, monto, pago = 0) {
  // Actualizar últimos 5 números
  const numerosLista = document.querySelector('.stat-card:nth-child(2) .stat-list');
  const color = (numero===0) ? 'green' : (isRed(numero) ? 'red' : 'black');
  const colorLabel = (numero===0) ? 'Verde' : (isRed(numero) ? 'Rojo' : 'Negro');
  
  const li = document.createElement('li');
  li.className = `stat-item ${color}`;
  li.innerHTML = `${numero} - ${colorLabel}`;
  numerosLista.insertBefore(li, numerosLista.firstChild);
  
  while (numerosLista.children.length > 5) {
    numerosLista.removeChild(numerosLista.lastChild);
  }
  
  // Actualizar últimas 5 apuestas
  const apuestasLista = document.querySelector('.stat-card:nth-child(3) .stat-list');
  
  // Ocultar placeholder si existe
  const placeholder = apuestasLista.querySelector('.empty-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  
  const li2 = document.createElement('li');
  li2.className = `bet-item ${gano ? 'win' : 'loss'}`;
  const nombreFormateado = formatearNombreApuesta(tipoApuestaActual);
  
  // Asegurar que monto y pago sean números válidos
  const montoValido = parseFloat(monto) || 0;
  const pagoValido = parseFloat(pago) || 0;
  
  // Calcular variación del saldo
  // Si gana: el pago es la ganancia pura (ya se descontó el monto al apostar)
  // Si pierde: se pierde el monto apostado
  const variacion = gano ? pagoValido : -montoValido;
  const variacionTexto = variacion >= 0 ? `+$${variacion}` : `-$${Math.abs(variacion)}`;
  const variacionColor = variacion >= 0 ? '#4ade80' : '#ef4444';
  
  li2.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>${nombreFormateado} - $${montoValido}</span>
        <span class="bet-result">${gano ? 'Victoria' : 'Derrota'}</span>
      </div>
      <div style="font-size: 0.85rem; color: ${variacionColor}; font-weight: 600;">
        ${variacionTexto}
      </div>
    </div>
  `;
  apuestasLista.insertBefore(li2, apuestasLista.firstChild);
  
  // Mantener solo 5 apuestas (sin contar el placeholder)
  const apuestasItems = apuestasLista.querySelectorAll('.bet-item');
  if (apuestasItems.length > 5) {
    // Eliminar las apuestas más antiguas (más allá de 5)
    for (let i = 5; i < apuestasItems.length; i++) {
      apuestasLista.removeChild(apuestasItems[i]);
    }
  }
}

paintWheel();
drawLabels();

// Cargar últimos números y apuestas del servidor
if (window.ultimosNumerosData && window.ultimosNumerosData.length > 0) {
  const numerosLista = document.querySelector('.stat-card:nth-child(2) .stat-list');
  window.ultimosNumerosData.forEach(numero => {
    const color = (numero===0) ? 'green' : (isRed(numero) ? 'red' : 'black');
    const colorLabel = (numero===0) ? 'Verde' : (isRed(numero) ? 'Rojo' : 'Negro');
    const li = document.createElement('li');
    li.className = `stat-item ${color}`;
    li.innerHTML = `${numero} - ${colorLabel}`;
    numerosLista.appendChild(li);
  });
}

if (window.ultimasApuestasData && window.ultimasApuestasData.length > 0) {
  const apuestasLista = document.querySelector('.stat-card:nth-child(3) .stat-list');
  
  // Ocultar placeholder si existe
  const placeholder = apuestasLista.querySelector('.empty-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  
  window.ultimasApuestasData.forEach(apuesta => {
    const gano = apuesta.estado === 'Ganada';
    const li = document.createElement('li');
    li.className = `bet-item ${gano ? 'win' : 'loss'}`;
    const nombreFormateado = formatearNombreApuesta(apuesta.tipoApuesta);
    
    // Asegurar que monto y pago sean números válidos
    const monto = parseFloat(apuesta.monto) || 0;
    const pago = parseFloat(apuesta.pago) || 0;
    
    // Calcular variación del saldo
    // Si gana: el pago es la ganancia pura (ya se descontó el monto al apostar)
    // Si pierde: se pierde el monto apostado
    const variacion = gano ? pago : -monto;
    const variacionTexto = variacion >= 0 ? `+$${variacion}` : `-$${Math.abs(variacion)}`;
    const variacionColor = variacion >= 0 ? '#4ade80' : '#ef4444';
    
    li.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 0.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>${nombreFormateado} - $${monto}</span>
          <span class="bet-result">${gano ? 'Victoria' : 'Derrota'}</span>
        </div>
        <div style="font-size: 0.85rem; color: ${variacionColor}; font-weight: 600;">
          ${variacionTexto}
        </div>
      </div>
    `;
    apuestasLista.appendChild(li);
  });
}

spinBtn.addEventListener('click', spin);

// Selección de tipo de apuesta
document.querySelectorAll('.bet-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bet-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tipoApuestaActual = btn.dataset.type;
    
    // Ocultar todos los inputs primero
    const inputs = [
      'numero-input', 'caballo-input', 'transversal-input', 'cuadro-input', 
      'seisena-input', 'docena-input', 'columna-input', 
      'dos-docenas-input', 'dos-columnas-input'
    ];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    
    // Mostrar el input correspondiente
    const inputMap = {
      'pleno': 'numero-input',
      'caballo': 'caballo-input',
      'transversal': 'transversal-input',
      'cuadro': 'cuadro-input',
      'seisena': 'seisena-input',
      'docena': 'docena-input',
      'columna': 'columna-input',
      'dos-docenas': 'dos-docenas-input',
      'dos-columnas': 'dos-columnas-input'
    };
    
    const inputId = inputMap[tipoApuestaActual];
    if (inputId) {
      const el = document.getElementById(inputId);
      if (el) el.style.display = 'block';
    }
  });
});

// Botones para monto de apuesta
document.querySelectorAll('.quick-bet-btn-header').forEach(btn => {
  btn.addEventListener('click', () => {
    const amount = parseInt(btn.getAttribute('data-amount'));
    const currentValue = parseInt(betInput.value) || 0;
    betInput.value = currentValue + amount;
  });
});