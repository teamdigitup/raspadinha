// Aguarda firebase.js carregar
window.addEventListener('load', () => {
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id')) || 1;
  const raspadinhas = window._RASPADINHAS;
  const jogo = raspadinhas[id];
  if (!jogo) { window.location.href = "index.html"; return; }

  document.getElementById('game-titulo').textContent = jogo.nome;
  document.getElementById('game-desc').textContent = jogo.desc;
  document.getElementById('game-custo').textContent = jogo.custo.toFixed(2).replace('.', ',');
  document.getElementById('game-max').textContent = "R$ " + jogo.maxPremio.toLocaleString('pt-BR');

  initScratch(id, jogo);
});

function initScratch(id, jogo) {
  const canvas = document.getElementById('scratch-canvas');
  const ctx = canvas.getContext('2d');
  let scratched = false;
  let scratchPercent = 0;
  let premio = null;

  // Sorteia prêmio
  premio = sortearPremio(jogo);

  // Desenha fundo do prêmio
  ctx.fillStyle = '#1a1a35';
  ctx.fillRect(0, 0, 320, 320);
  ctx.fillStyle = '#f5c518';
  ctx.font = 'bold 28px Inter';
  ctx.textAlign = 'center';
  if (premio.valor > 0) {
    ctx.fillText('🏆 VOCÊ GANHOU!', 160, 130);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 36px Inter';
    ctx.fillText('R$ ' + premio.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 160, 185);
  } else {
    ctx.fillText('😔 Não foi dessa vez', 160, 140);
    ctx.fillStyle = '#888';
    ctx.font = '18px Inter';
    ctx.fillText('Tente novamente!', 160, 185);
  }

  // Camada de raspar
  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createLinearGradient(0, 0, 320, 320);
  grad.addColorStop(0, '#2a2a4a');
  grad.addColorStop(1, '#1a1a35');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 320, 320);

  // Texto na camada
  ctx.fillStyle = '#f5c518';
  ctx.font = 'bold 22px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('🎰 RASPE AQUI', 160, 150);
  ctx.font = '14px Inter';
  ctx.fillStyle = '#888';
  ctx.fillText('Arraste o dedo ou mouse', 160, 180);

  ctx.globalCompositeOperation = 'destination-out';

  let isDrawing = false;

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function scratch(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 28, 0, Math.PI * 2);
    ctx.fill();
    checkReveal();
  }

  canvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
  canvas.addEventListener('mousemove', scratch);
  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); });
  canvas.addEventListener('touchmove', scratch);
  canvas.addEventListener('touchend', () => isDrawing = false);

  function checkReveal() {
    const imageData = ctx.getImageData(0, 0, 320, 320);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] < 128) transparent++;
    }
    scratchPercent = (transparent / (320 * 320)) * 100;
    if (scratchPercent > 40 && !scratched) {
      scratched = true;
      revelarPremio(premio, id, jogo);
    }
  }
}

function sortearPremio(jogo) {
  // Probabilidades: 70% sem prêmio, 30% com prêmio
  const rand = Math.random();
  if (rand > 0.30) return { valor: 0 };

  const premios = getPremios(jogo.maxPremio);
  const total = premios.reduce((a, b) => a + b.chance, 0);
  let r = Math.random() * total;
  for (const p of premios) {
    r -= p.chance;
    if (r <= 0) return p;
  }
  return premios[premios.length - 1];
}

function getPremios(max) {
  if (max <= 1000) return [
    { valor: 1000, chance: 1 }, { valor: 500, chance: 3 },
    { valor: 100, chance: 8 }, { valor: 50, chance: 15 },
    { valor: 20, chance: 25 }, { valor: 5, chance: 48 }
  ];
  if (max <= 10000) return [
    { valor: 10000, chance: 0.5 }, { valor: 5000, chance: 1 },
    { valor: 1000, chance: 3 }, { valor: 500, chance: 8 },
    { valor: 100, chance: 20 }, { valor: 50, chance: 67.5 }
  ];
  if (max <= 12000) return [
    { valor: 12000, chance: 0.3 }, { valor: 5000, chance: 1 },
    { valor: 1000, chance: 3 }, { valor: 500, chance: 8 },
    { valor: 200, chance: 20 }, { valor: 50, chance: 67.7 }
  ];
  return [
    { valor: 20000, chance: 0.1 }, { valor: 10000, chance: 0.5 },
    { valor: 5000, chance: 1 }, { valor: 1000, chance: 5 },
    { valor: 500, chance: 10 }, { valor: 100, chance: 83.4 }
  ];
}

async function revelarPremio(premio, id, jogo) {
  const auth = window._auth;
  const db = window._db;
  const user = auth?.currentUser;

  document.getElementById('scratch-hint').classList.add('hidden');

  if (!user) {
    mostrarResultado(premio);
    return;
  }

  // Debita custo
  const { getDoc, updateDoc, addDoc, collection, doc, serverTimestamp } = {
    getDoc: window._getDoc, updateDoc: window._updateDoc,
    addDoc: window._addDoc, collection: window._collection,
    doc: window._doc, serverTimestamp: window._serverTimestamp
  };

  try {
    const ref = window._doc(db, "usuarios", user.uid);
    const snap = await window._getDoc ? window._getDoc(ref) : null;

    // Registra jogada
    await window._addDoc(window._collection(db, "transacoes"), {
      uid: user.uid, tipo: "jogo", valor: jogo.custo,
      descricao: `Jogou: ${jogo.nome}`, criadoEm: window._serverTimestamp()
    });

    if (premio.valor > 0) {
      await window._addDoc(window._collection(db, "transacoes"), {
        uid: user.uid, tipo: "ganho", valor: premio.valor,
        descricao: `Ganhou em: ${jogo.nome}`, criadoEm: window._serverTimestamp()
      });
    }
  } catch (e) { /* continua mesmo com erro */ }

  mostrarResultado(premio);
}

function mostrarResultado(premio) {
  const reveal = document.getElementById('prize-reveal');
  const canvas = document.getElementById('scratch-canvas');
  canvas.style.opacity = '0.3';
  reveal.classList.remove('hidden');

  if (premio.valor > 0) {
    document.getElementById('prize-icon').textContent = '🎉';
    document.getElementById('prize-text').textContent = 'Parabéns! Você ganhou!';
    document.getElementById('prize-value').textContent =
      'R$ ' + premio.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    document.getElementById('prize-value').style.color = '#4ade80';
    confetti();
  } else {
    document.getElementById('prize-icon').textContent = '😔';
    document.getElementById('prize-text').textContent = 'Não foi dessa vez...';
    document.getElementById('prize-value').textContent = 'Tente novamente!';
    document.getElementById('prize-value').style.color = '#888';
  }
}

window.jogarNovamente = function() {
  window.location.reload();
};

// Confetti simples
function confetti() {
  const colors = ['#f5c518', '#4ade80', '#60a5fa', '#f87171', '#a78bfa'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; width:8px; height:8px; border-radius:50%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}vw; top:-10px;
      animation: fall ${1 + Math.random() * 2}s linear forwards;
      z-index:9999;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}

const style = document.createElement('style');
style.textContent = `@keyframes fall { to { transform: translateY(110vh) rotate(360deg); opacity:0; } }`;
document.head.appendChild(style);

// Expõe getDoc para firebase.js usar
import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js").then(m => {
  window._getDoc = m.getDoc;
});
