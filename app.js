// Ticker loop infinito
const ticker = document.getElementById('ticker');
if (ticker) ticker.innerHTML += ticker.innerHTML;

window.closeModal = function(id) {
  document.getElementById(id)?.classList.add('hidden');
};

window.openDeposito = function() {
  const sv = document.getElementById('step-valor');
  const sp = document.getElementById('step-pix');
  if (sv) sv.classList.remove('hidden');
  if (sp) sp.classList.add('hidden');
  document.getElementById('modal-deposito')?.classList.remove('hidden');
};

window.gerarPix = function() {
  const val = parseFloat(document.getElementById('input-valor')?.value);
  if (!val || val < 20) { window.showToast?.('⚠️ Valor mínimo: R$ 20,00'); return; }
  const display = document.getElementById('pix-valor-display');
  if (display) display.textContent = val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  document.getElementById('step-valor')?.classList.add('hidden');
  document.getElementById('step-pix')?.classList.remove('hidden');
};

window.copiarPix = function() {
  navigator.clipboard.writeText('joaovicctor1105@gmail.com');
  window.showToast?.('✅ Chave PIX copiada!');
};

window.goPlay = function(id) {
  window.location.href = 'jogar.html?id=' + id;
};

window.showToast = function(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
};
