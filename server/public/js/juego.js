// Variables globales
let tipoApuestaActual = 'numero';
let valorApuesta = 0;
let apuestaActualId = null;

const wheel = document.getElementById('wheel');
const spinBtn = document.querySelector('.spin-button');
const statusEl = document.querySelector('.stat-status');
const betInput = document.getElementById('bet-amount');
const saldoElement = document.querySelector('.badge-value');

// Inicializar la ruleta
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
    li.innerHTML = `${numero} <span class="color-label">${colorLabel}</span>`;
    numerosLista.appendChild(li);
  });
}

// Cargar últimas apuestas en la UI
if (window.ultimasApuestasData && window.ultimasApuestasData.length > 0) {
  const apuestasLista = document.querySelector('.stat-card:nth-child(3) .stat-list');
  window.ultimasApuestasData.forEach(apuesta => {
    const gano = apuesta.estado === 'Ganada';
    const li = document.createElement('li');
    li.className = `bet-item ${gano ? 'win' : 'loss'}`;
    li.innerHTML = `${apuesta.tipoApuesta} - $${apuesta.monto} <span class="bet-result">${gano ? 'Victoria' : 'Derrota'}</span>`;
    apuestasLista.appendChild(li);
  });
}

// Selección de tipo de apuesta
document.querySelectorAll('.bet-type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bet-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    tipoApuestaActual = btn.dataset.type;
    
    // Mostrar u ocultar el selector de número
    const numeroInput = document.getElementById('numero-input');
    numeroInput.style.display = (tipoApuestaActual === 'numero') ? 'block' : 'none';
  });
});

// Función para girar la ruleta
async function spin() {
  if (spinning) return;
  
  const monto = parseInt(betInput.value);
  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido');
    return;
  }
  
  // Obtener valor de la apuesta según tipo
  if (tipoApuestaActual === 'numero') {
    valorApuesta = parseInt(document.getElementById('numero-apuesta').value);
  } else {
    valorApuesta = tipoApuestaActual; // 'rojo', 'negro', etc.
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
    
    // Ahora sí girar la ruleta
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
    
    // Actualizar listas de últimos números y apuestas
    actualizarHistorial(numeroGanador, data.gano, parseInt(betInput.value));
    
  } catch (error) {
    console.error('Error al procesar resultado:', error);
  }

  spinning = false;
  spinBtn.disabled = false;
  wheel.style.transition = 'none';
  wheel.style.transform = `rotate(${currentRotation}deg)`;
  void wheel.offsetWidth;
}

function actualizarHistorial(numero, gano, monto) {
  // Actualizar últimos 5 números
  const numerosLista = document.querySelector('.stat-card:nth-child(2) .stat-list');
  const color = (numero===0) ? 'green' : (isRed(numero) ? 'red' : 'black');
  const colorLabel = (numero===0) ? 'Verde' : (isRed(numero) ? 'Rojo' : 'Negro');
  
  const li = document.createElement('li');
  li.className = `stat-item ${color}`;
  li.innerHTML = `${numero} <span class="color-label">${colorLabel}</span>`;
  numerosLista.insertBefore(li, numerosLista.firstChild);
  
  // Mantener solo 5
  while (numerosLista.children.length > 5) {
    numerosLista.removeChild(numerosLista.lastChild);
  }
  
  // Actualizar últimas 5 apuestas
  const apuestasLista = document.querySelector('.stat-card:nth-child(3) .stat-list');
  const li2 = document.createElement('li');
  li2.className = `bet-item ${gano ? 'win' : 'loss'}`;
  li2.innerHTML = `${tipoApuestaActual} - $${monto} <span class="bet-result">${gano ? 'Victoria' : 'Derrota'}</span>`;
  apuestasLista.insertBefore(li2, apuestasLista.firstChild);
  
  while (apuestasLista.children.length > 5) {
    apuestasLista.removeChild(apuestasLista.lastChild);
  }
}

// Event listeners
spinBtn.addEventListener('click', spin);

// Quick bet buttons
document.querySelectorAll('.quick-bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const amount = parseInt(btn.getAttribute('data-amount'));
    const currentValue = parseInt(betInput.value) || 0;
    betInput.value = currentValue + amount;
  });
});