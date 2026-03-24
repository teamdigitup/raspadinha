import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
  sendPasswordResetEmail, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection,
  addDoc, query, where, orderBy, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// =============================================
// CONFIGURE SEU FIREBASE AQUI
// Acesse: https://console.firebase.google.com
// Crie um projeto > Web App > copie o config
// =============================================
const firebaseConfig = {
  apiKey: "AIzaSyCXB1Y1dqo0nCiNUEJ5eBwVNRUp2RIEqHk",
  authDomain: "raspa-979d4.firebaseapp.com",
  projectId: "raspa-979d4",
  storageBucket: "raspa-979d4.firebasestorage.app",
  messagingSenderId: "686362667379",
  appId: "1:686362667379:web:d7d72dd87129818ee2bd06"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ---- CHAVE PIX DO DONO ----
const PIX_KEY = "joaovicctor1105@gmail.com";

// ---- RASPADINHAS CONFIG ----
const RASPADINHAS = {
  1: { nome: "PIX na Conta", custo: 1, maxPremio: 1000, desc: "Raspe e ganhe até R$1.000 no PIX" },
  2: { nome: "Me Mimei", custo: 10, maxPremio: 10000, desc: "Ganhe até R$10.000 instantâneo" },
  3: { nome: "Sonho de Consumo", custo: 15, maxPremio: 12000, desc: "Prêmios de até R$12.000" },
  4: { nome: "Super Prêmios", custo: 50, maxPremio: 20000, desc: "Prêmios de até R$20.000" }
};

// ---- FUNÇÕES AUTH ----
window.fazerCadastro = async function() {
  const nome = document.getElementById('cad-nome')?.value.trim();
  const email = document.getElementById('cad-email')?.value.trim();
  const senha = document.getElementById('cad-senha')?.value;
  const pix = document.getElementById('cad-pix')?.value.trim();

  if (!nome || !email || !senha) return showError("Preencha todos os campos obrigatórios.");
  if (senha.length < 6) return showError("Senha deve ter pelo menos 6 caracteres.");

  setLoading('btn-cadastrar', true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      nome, email, pixChave: pix || "", saldo: 0,
      totalGanho: 0, totalDepositado: 0, jogadas: 0,
      primeiroDeposito: true, criadoEm: serverTimestamp()
    });
    showToast("✅ Conta criada! Bem-vindo ao Raspaetz7!");
    setTimeout(() => window.location.href = "dashboard.html", 1500);
  } catch (e) {
    showError(firebaseError(e.code));
  } finally {
    setLoading('btn-cadastrar', false);
  }
};

window.fazerLogin = async function() {
  const email = document.getElementById('login-email')?.value.trim();
  const senha = document.getElementById('login-senha')?.value;
  if (!email || !senha) return showError("Preencha e-mail e senha.");

  setLoading('btn-entrar', true);
  try {
    await signInWithEmailAndPassword(auth, email, senha);
    showToast("✅ Login realizado!");
    setTimeout(() => window.location.href = "dashboard.html", 1000);
  } catch (e) {
    showError(firebaseError(e.code));
  } finally {
    setLoading('btn-entrar', false);
  }
};

window.loginGoogle = async function() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const ref = doc(db, "usuarios", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        nome: user.displayName || "Usuário", email: user.email,
        pixChave: "", saldo: 0, totalGanho: 0, totalDepositado: 0,
        jogadas: 0, primeiroDeposito: true, criadoEm: serverTimestamp()
      });
    }
    showToast("✅ Login com Google realizado!");
    setTimeout(() => window.location.href = "dashboard.html", 1000);
  } catch (e) {
    showError("Erro ao entrar com Google. Tente novamente.");
  }
};

window.fazerLogout = async function() {
  await signOut(auth);
  window.location.href = "index.html";
};

window.recuperarSenha = async function() {
  const email = document.getElementById('login-email')?.value.trim();
  if (!email) return showError("Digite seu e-mail primeiro.");
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("📧 E-mail de recuperação enviado!");
  } catch (e) {
    showError("E-mail não encontrado.");
  }
};

// ---- ESTADO DO USUÁRIO ----
onAuthStateChanged(auth, async (user) => {
  const page = window.location.pathname;

  if (user) {
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    const dados = snap.data() || {};
    window._userData = { uid: user.uid, ...dados };

    // Atualiza navbar
    const navUser = document.getElementById('nav-user');
    const navLinks = document.getElementById('nav-links');
    if (navUser) navUser.classList.remove('hidden');
    if (navLinks) navLinks.classList.add('hidden');
    const saldoEl = document.getElementById('nav-saldo-val');
    if (saldoEl) saldoEl.textContent = formatMoney(dados.saldo || 0);

    // Dashboard
    if (page.includes('dashboard')) {
      carregarDashboard(dados);
    }
  } else {
    // Redireciona se tentar acessar páginas protegidas
    if (page.includes('dashboard') || page.includes('jogar')) {
      window.location.href = "login.html";
    }
  }
});

async function carregarDashboard(dados) {
  document.getElementById('dash-nome').textContent = dados.nome || "Usuário";
  document.getElementById('dash-email').textContent = dados.email || "";
  document.getElementById('dash-saldo').textContent = "R$ " + formatMoney(dados.saldo || 0);
  document.getElementById('dash-jogadas').textContent = dados.jogadas || 0;
  document.getElementById('dash-ganho').textContent = "R$ " + formatMoney(dados.totalGanho || 0);
  document.getElementById('dash-depositado').textContent = "R$ " + formatMoney(dados.totalDepositado || 0);
  document.getElementById('nav-saldo-val').textContent = formatMoney(dados.saldo || 0);
  document.getElementById('saldo-saque').textContent = formatMoney(dados.saldo || 0);
  if (document.getElementById('pix-chave-input')) {
    document.getElementById('pix-chave-input').value = dados.pixChave || "";
  }
  await carregarHistorico();
}

async function carregarHistorico() {
  const user = auth.currentUser;
  if (!user) return;
  const lista = document.getElementById('historico-lista');
  if (!lista) return;
  try {
    const q = query(collection(db, "transacoes"), where("uid", "==", user.uid), orderBy("criadoEm", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      lista.innerHTML = '<p style="color:#888;text-align:center;padding:20px">Nenhuma transação ainda.</p>';
      return;
    }
    lista.innerHTML = snap.docs.map(d => {
      const t = d.data();
      const cor = t.tipo === 'deposito' ? '#4ade80' : t.tipo === 'ganho' ? '#f5c518' : '#f87171';
      const icon = t.tipo === 'deposito' ? '📥' : t.tipo === 'ganho' ? '🏆' : '📤';
      const data = t.criadoEm?.toDate ? t.criadoEm.toDate().toLocaleDateString('pt-BR') : '-';
      return `<div class="hist-item">
        <span>${icon} ${t.descricao}</span>
        <span style="color:${cor};font-weight:700">${t.tipo === 'saque' || t.tipo === 'jogo' ? '-' : '+'}R$ ${formatMoney(t.valor)}</span>
        <span style="color:#666;font-size:0.75rem">${data}</span>
      </div>`;
    }).join('');
  } catch (e) {
    lista.innerHTML = '<p style="color:#888;text-align:center;padding:20px">Erro ao carregar histórico.</p>';
  }
}

window.salvarPix = async function() {
  const user = auth.currentUser;
  if (!user) return;
  const chave = document.getElementById('pix-chave-input').value.trim();
  await updateDoc(doc(db, "usuarios", user.uid), { pixChave: chave });
  showToast("✅ Chave PIX salva!");
};

window.solicitarSaque = async function() {
  const user = auth.currentUser;
  if (!user) return;
  const valor = parseFloat(document.getElementById('input-saque').value);
  const pixChave = document.getElementById('input-pix-saque').value.trim();
  if (!valor || valor < 50) return showToast("⚠️ Valor mínimo de saque: R$ 50,00");
  if (!pixChave) return showToast("⚠️ Informe sua chave PIX");
  const saldo = window._userData?.saldo || 0;
  if (valor > saldo) return showToast("⚠️ Saldo insuficiente");

  await updateDoc(doc(db, "usuarios", user.uid), { saldo: saldo - valor });
  await addDoc(collection(db, "transacoes"), {
    uid: user.uid, tipo: "saque", valor, pixChave,
    descricao: `Saque solicitado`, status: "pendente", criadoEm: serverTimestamp()
  });
  await addDoc(collection(db, "saques"), {
    uid: user.uid, nome: window._userData?.nome, email: window._userData?.email,
    valor, pixChave, status: "pendente", criadoEm: serverTimestamp()
  });
  closeModal('modal-saque');
  showToast("✅ Saque solicitado! Processado em até 24h.");
  setTimeout(() => window.location.reload(), 1500);
};

// ---- PIX DEPÓSITO ----
window.openDeposito = function() {
  document.getElementById('step-valor').classList.remove('hidden');
  document.getElementById('step-pix').classList.add('hidden');
  document.getElementById('modal-deposito').classList.remove('hidden');
};

window.openSaque = function() {
  const saldo = window._userData?.saldo || 0;
  const el = document.getElementById('saldo-saque');
  if (el) el.textContent = formatMoney(saldo);
  const pixEl = document.getElementById('input-pix-saque');
  if (pixEl) pixEl.value = window._userData?.pixChave || "";
  document.getElementById('modal-saque').classList.remove('hidden');
};

window.gerarPix = function() {
  const val = parseFloat(document.getElementById('input-valor').value);
  if (!val || val < 20) return showToast("⚠️ Valor mínimo: R$ 20,00");
  document.getElementById('pix-valor-display').textContent = formatMoney(val);
  document.getElementById('step-valor').classList.add('hidden');
  document.getElementById('step-pix').classList.remove('hidden');
};

window.copiarPix = function() {
  navigator.clipboard.writeText(PIX_KEY);
  showToast("✅ Chave PIX copiada!");
};

// ---- JOGO ----
window.goPlay = function(id) {
  const user = auth.currentUser;
  if (!user) { window.location.href = "login.html"; return; }
  window.location.href = `jogar.html?id=${id}`;
};

// Expõe para game.js
window._db = db;
window._auth = auth;
window._RASPADINHAS = RASPADINHAS;
window._PIX_KEY = PIX_KEY;
window._addDoc = addDoc;
window._collection = collection;
window._updateDoc = updateDoc;
window._doc = doc;
window._serverTimestamp = serverTimestamp;

// ---- HELPERS ----
function formatMoney(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
window.formatMoney = formatMoney;

function showError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
  else showToast("❌ " + msg);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}
window.showToast = showToast;

function setLoading(id, loading) {
  const btn = document.getElementById(id);
  if (btn) btn.disabled = loading;
}

function firebaseError(code) {
  const map = {
    'auth/email-already-in-use': 'E-mail já cadastrado.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'Senha muito fraca.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
  };
  return map[code] || 'Erro inesperado. Tente novamente.';
}

window.closeModal = function(id) {
  document.getElementById(id).classList.add('hidden');
};

window.togglePass = function(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
};
