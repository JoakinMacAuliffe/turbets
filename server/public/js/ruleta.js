const numbersCW = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const redSet = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const isRed   = n => redSet.has(n);
const isGreen = n => n === 0;

const seg = 360 / numbersCW.length; // ~9.7297° por sector
const startAngle = -90 - seg/2;     // centra el "0" en la parte superior

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
  
  // Apply directly to wheel background (static, doesn't rotate)
  wheel.style.background = bg;
}

function drawLabels(){
  const labelsWrap = document.createElement('div');
  labelsWrap.className = 'labels';
  wheel.appendChild(labelsWrap);

  const R = wheel.clientWidth / 2 - 25; // radio para posicionar cerca del borde

  numbersCW.forEach((n, i) => {
    const label = document.createElement('div');
    label.className = 'label' + (n === 0 ? ' green' : '');
    label.textContent = n;

    // Position labels to match the gradient sectors
    const phi = startAngle + (i + 0.5) * seg;
    const rad = phi * Math.PI / 180;
    const x = Math.cos(rad) * R;
    const y = Math.sin(rad) * R;

    label.style.setProperty('--pos', `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`);
    label.style.transform = `translate(-50%, -50%) var(--pos) rotate(${phi + 90}deg)`;
    labelsWrap.appendChild(label);
  });
}

let currentRotation = 0, spinning = false, lastWinIdx = null;

function spin(){
  if (spinning) return;
  spinning = true; spinBtn.disabled = true; statusEl.textContent = 'Girando…';

  const extraTurns = (Math.floor(Math.random()*4) + 4) * 360;
  const randomAngle = Math.floor(Math.random() * 360);
  const duration = (Math.random() * (5 - 3) + 3).toFixed(2);

  currentRotation += (extraTurns + randomAngle);
  wheel.style.transition = `transform ${duration}s cubic-bezier(.12,.63,.16,1)`;
  wheel.style.transform = `rotate(${currentRotation}deg)`;

  wheel.addEventListener('transitionend', onEnd, { once:true });
}

function onEnd(){
  // normaliza a 0–360 para evitar overflow acumulado
  currentRotation = ((currentRotation % 360) + 360) % 360;

  const idx = indexAtPointer(currentRotation);
  const n = numbersCW[idx];

  // marca visual
  const labels = wheel.querySelectorAll('.label');
  if (lastWinIdx !== null && labels[lastWinIdx]) labels[lastWinIdx].classList.remove('win');
  if (labels[idx]) labels[idx].classList.add('win');
  lastWinIdx = idx;

  showResult(n);
  spinning = false; spinBtn.disabled = false;

  wheel.style.transition = 'none';
  wheel.style.transform = `rotate(${currentRotation}deg)`;
  void wheel.offsetWidth;
}

// Con startAngle = -90 - seg/2, el centro del 0 queda en el puntero (arriba).
// Debemos compensar ese startAngle para mapear el ángulo del puntero al índice.
// Fórmula: idx = floor( (((-rotation - 90) - startAngle) mod 360) / seg )
function indexAtPointer(rotation){
  const rel = ((-rotation - 90 - startAngle) % 360 + 360) % 360;
  return Math.floor(rel / seg) % numbersCW.length;
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