// auth.js — módulo central compartilhado por todas as páginas
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXB1Y1dqo0nCiNUEJ5eBwVNRUp2RIEqHk",
  authDomain: "raspa-979d4.firebaseapp.com",
  projectId: "raspa-979d4",
  storageBucket: "raspa-979d4.firebasestorage.app",
  messagingSenderId: "686362667379",
  appId: "1:686362667379:web:d7d72dd87129818ee2bd06"
};

let _app, _auth, _db;

function getApp() {
  if (!_app) _app = initializeApp(firebaseConfig);
  return _app;
}

export function getFirebaseAuth() {
  if (!_auth) _auth = getAuth(getApp());
  return _auth;
}

export function getFirebaseDb() {
  if (!_db) _db = getFirestore(getApp());
  return _db;
}

export function fmt(v) {
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

export function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3500);
}

// Retorna Promise com o usuário atual (aguarda auth resolver)
export function getCurrentUser() {
  return new Promise(resolve => {
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    });
  });
}

// Carrega dados do usuário do Firestore
export async function getUserData(uid) {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data() : {};
}

// Atualiza navbar com dados do usuário
export function atualizarNavbar(dados) {
  const navUser  = document.getElementById('nav-user');
  const navLinks = document.getElementById('nav-links');
  if (navUser)  navUser.classList.remove('hidden');
  if (navLinks) navLinks.classList.add('hidden');
  const saldoEl = document.getElementById('nav-saldo-val');
  if (saldoEl) saldoEl.textContent = fmt(dados.saldo || 0);
}
