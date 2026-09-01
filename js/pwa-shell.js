// pwa-shell.js — il "guscio" comune a tutte le app della famiglia My:
//
//   1. registra il service worker e avvisa quando c'e' una nuova versione;
//   2. mostra una barretta quando si e' offline;
//   3. tiene la data dell'ultimo backup e ricorda di rifarlo.
//
// Script classico (non un modulo ES): espone window.PwaShell, cosi' funziona
// anche aperto come file locale (file://), dove Chrome blocca i moduli ES.
//
// Questo file e' identico in tutte le app: MyGym, MySchool, MyMoney, MyVerse,
// Ispira-My e Cream Puff. Se lo correggi qui, riportalo anche nelle altre.
// Quello che cambia da un'app all'altra sta tutto negli attributi data-* del
// tag <script> e nella chiamata a PwaShell.configure().
(function () {

// ---------------------------------------------------------------------------
// Configurazione
// ---------------------------------------------------------------------------

const script = document.currentScript;
const data = (script && script.dataset) || {};

const config = {
  // Prefisso delle chiavi in localStorage: 'mygym' -> 'mygym.backup.v1'.
  app: data.app || 'app',
  // Percorso del service worker, relativo alla pagina.
  swUrl: data.sw || 'sw.js',
  // Dopo quanti giorni senza backup scatta il promemoria.
  backupAfterDays: Number(data.backupAfterDays || 30),
  // Da quanti giorni l'app dev'essere in uso prima di dare il primo
  // promemoria: chi ha appena installato l'app non ha ancora niente da
  // salvare, e sarebbe solo una seccatura.
  backupGraceDays: Number(data.backupGraceDays || 7),
  // Ogni quanti giorni al massimo si ripresenta il promemoria.
  backupNudgeEveryDays: Number(data.backupNudgeEveryDays || 7),
  // Il promemoria del backup ha senso solo dove c'e' davvero qualcosa da
  // esportare: data-backup="off" lo spegne (per esempio in Cream Puff, che e'
  // un sito e non un'app con i dati dell'utente).
  backupReminder: data.backup !== 'off',

  // Riempiti dall'app con PwaShell.configure().
  translate: null,     // (key, testoPredefinito, variabili) -> stringa
  hasData: null,       // () -> true se c'e' qualcosa da salvare
  onBackupRequest: null, // () -> porta l'utente alla schermata del backup
};

const TEXTS = {
  offline: 'Sei offline — i tuoi dati restano salvati',
  online: 'Di nuovo online',
  update: 'Nuova versione disponibile',
  update_action: 'Aggiorna',
  backup_never: 'Non hai mai esportato un backup',
  backup_today: 'Ultimo backup: oggi',
  backup_yesterday: 'Ultimo backup: ieri',
  backup_days: 'Ultimo backup: {days} giorni fa',
  backup_nudge_never: 'Non hai mai esportato un backup',
  backup_nudge_days: 'Non fai un backup da {days} giorni',
  backup_action: 'Esporta',
  close: 'Chiudi',
};

function text(key, vars) {
  let str = TEXTS[key] || key;
  if (config.translate) {
    const custom = config.translate(key, str, vars);
    if (typeof custom === 'string' && custom) str = custom;
  }
  if (vars) {
    Object.keys(vars).forEach((name) => {
      str = str.split(`{${name}}`).join(vars[name]);
    });
  }
  return str;
}

function key(name) {
  return `${config.app}.${name}`;
}

function readStorage(name) {
  try {
    return localStorage.getItem(key(name));
  } catch (e) {
    return null; // navigazione privata o storage disattivato
  }
}

function writeStorage(name, value) {
  try {
    localStorage.setItem(key(name), value);
  } catch (e) {
    // Se lo storage e' pieno si perde solo il promemoria, non i dati.
  }
}

// ---------------------------------------------------------------------------
// Stile (iniettato da qui, cosi' aggiungere il guscio a un'app e' una riga
// di HTML e niente altro). I colori arrivano dalle variabili dell'app quando
// esistono; le app che non le hanno ricadono su un aspetto scuro da "snackbar",
// oppure possono impostare --pwa-shell-bg / -fg / -border / -accent.
// ---------------------------------------------------------------------------

const STYLE = `
.pwa-shell-stack {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--pwa-shell-offset, 96px));
  transform: translateX(-50%);
  z-index: 90;
  width: min(calc(100vw - 32px), 440px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}
.pwa-shell-bar {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 16px;
  border-radius: var(--radius-pill, 999px);
  background: var(--pwa-shell-bg, var(--glass-bg-strong, var(--glass-bg, rgba(18, 20, 28, 0.94))));
  border: 1px solid var(--pwa-shell-border, var(--glass-border, rgba(255, 255, 255, 0.14)));
  box-shadow: var(--glass-shadow, 0 8px 32px rgba(0, 0, 0, 0.45));
  -webkit-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  color: var(--pwa-shell-fg, var(--text-primary, var(--text, #f5f6fa)));
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
  animation: pwa-shell-in .35s cubic-bezier(.22, 1, .36, 1);
}
.pwa-shell-bar.is-leaving { animation: pwa-shell-out .28s ease forwards; }
.pwa-shell-bar svg { flex: none; opacity: .8; }
.pwa-shell-text { flex: 1; min-width: 0; }
.pwa-shell-btn {
  flex: none;
  border: 0;
  cursor: pointer;
  padding: 7px 15px;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  background: var(--pwa-shell-accent, var(--accent-gradient, var(--nav-accent-gradient, linear-gradient(135deg, #8b5cf6, #06b6d4))));
  color: var(--pwa-shell-on-accent, var(--on-accent, #fff));
}
.pwa-shell-btn:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.pwa-shell-dismiss {
  flex: none;
  border: 0;
  background: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 999px;
  color: inherit;
  opacity: .55;
  display: flex;
}
.pwa-shell-dismiss:hover { opacity: 1; }
@keyframes pwa-shell-in { from { opacity: 0; transform: translateY(14px) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes pwa-shell-out { to { opacity: 0; transform: translateY(10px) scale(.94); } }
@media (prefers-reduced-motion: reduce) {
  .pwa-shell-bar, .pwa-shell-bar.is-leaving { animation: none; }
}
`;

function injectStyle() {
  if (document.getElementById('pwa-shell-style')) return;
  const el = document.createElement('style');
  el.id = 'pwa-shell-style';
  el.textContent = STYLE;
  document.head.appendChild(el);
}

const ICONS = {
  offline: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M14 10.3a10 10 0 0 1 5 2.6"/><path d="M2 8.8a15 15 0 0 1 4.6-2.9"/><path d="M10.7 5.1A15 15 0 0 1 22 8.8"/><path d="M12 20h.01"/></svg>',
  online: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.9a10 10 0 0 1 14 0"/><path d="M2 8.8a15 15 0 0 1 20 0"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M12 20h.01"/></svg>',
  update: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
  backup: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

function stack() {
  let el = document.getElementById('pwa-shell-stack');
  if (!el) {
    injectStyle();
    el = document.createElement('div');
    el.id = 'pwa-shell-stack';
    el.className = 'pwa-shell-stack';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
}

// Ogni barretta ha un nome: chiamare showBar() due volte con lo stesso nome
// sostituisce quella gia' a schermo invece di impilarne un'altra.
const bars = {};

function hideBar(name, immediate) {
  const el = bars[name];
  if (!el) return;
  delete bars[name];
  if (immediate) { el.remove(); return; }
  el.classList.add('is-leaving');
  setTimeout(() => el.remove(), 300);
}

function showBar(name, { icon, message, actionLabel, onAction, dismissible, autoHideMs }) {
  hideBar(name, true);

  const el = document.createElement('div');
  el.className = 'pwa-shell-bar';
  el.dataset.bar = name;

  if (icon) {
    const iconWrap = document.createElement('span');
    iconWrap.innerHTML = ICONS[icon] || '';
    iconWrap.setAttribute('aria-hidden', 'true');
    iconWrap.style.display = 'flex';
    el.appendChild(iconWrap);
  }

  const label = document.createElement('span');
  label.className = 'pwa-shell-text';
  label.textContent = message;
  el.appendChild(label);

  if (actionLabel) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pwa-shell-btn';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => { if (onAction) onAction(); });
    el.appendChild(btn);
  }

  if (dismissible) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'pwa-shell-dismiss';
    close.setAttribute('aria-label', text('close'));
    close.innerHTML = ICONS.close;
    close.addEventListener('click', () => hideBar(name));
    el.appendChild(close);
  }

  stack().appendChild(el);
  bars[name] = el;

  if (autoHideMs) setTimeout(() => { if (bars[name] === el) hideBar(name); }, autoHideMs);
  return el;
}

// ---------------------------------------------------------------------------
// 1. Service worker + avviso "nuova versione disponibile"
// ---------------------------------------------------------------------------

let registration = null;
let updateAccepted = false;
let lastUpdateCheck = 0;

// In sviluppo locale il service worker fa piu' danni che altro: mette in cache
// i file e poi li riserve anche dopo averli modificati, dando l'impressione
// che le modifiche non vengano applicate. Aggiungendo ?sw=1 all'indirizzo lo
// si riattiva, per provare davvero l'aggiornamento e l'uso offline.
function isLocalDev() {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  return local && !/[?&]sw=1\b/.test(location.search);
}

function showUpdateBar() {
  showBar('update', {
    icon: 'update',
    message: text('update'),
    actionLabel: text('update_action'),
    onAction: applyUpdate,
  });
}

function applyUpdate() {
  updateAccepted = true;
  const waiting = registration && registration.waiting;
  if (waiting) {
    waiting.postMessage({ type: 'SKIP_WAITING' });
    // Se per qualsiasi motivo il cambio di controllo non arriva, ricarichiamo
    // lo stesso: peggio che vada, l'utente rivede la versione di prima.
    setTimeout(() => location.reload(), 2500);
  } else {
    location.reload();
  }
}

function checkForUpdate() {
  if (!registration) return;
  const now = Date.now();
  if (now - lastUpdateCheck < 15 * 60 * 1000) return; // non piu' di una volta ogni 15 minuti
  lastUpdateCheck = now;
  registration.update().catch(() => {});
}

function watchForUpdates(reg) {
  registration = reg;
  lastUpdateCheck = Date.now();

  // Una versione nuova puo' essere gia' in attesa da una visita precedente.
  if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar();

  reg.addEventListener('updatefound', () => {
    const incoming = reg.installing;
    if (!incoming) return;
    incoming.addEventListener('statechange', () => {
      // Senza controller e' la primissima installazione: non c'e' niente da
      // aggiornare e l'avviso sarebbe solo confusione.
      if (incoming.state === 'installed' && navigator.serviceWorker.controller) showUpdateBar();
    });
  });

  // Una PWA installata resta aperta per giorni: senza questo, il controllo
  // avverrebbe solo al primo avvio.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkForUpdate();
  });
  window.addEventListener('focus', checkForUpdate);
  setInterval(checkForUpdate, 60 * 60 * 1000);
}

function initServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // Il service worker richiede http/https: aperta come file locale (file://)
  // la pagina funziona lo stesso, semplicemente senza offline.
  if (!location.protocol.startsWith('http')) return;

  if (isLocalDev()) {
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((reg) => reg.unregister()))
      .catch(() => {});
    if (window.caches) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
    return;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Il cambio di controller avviene anche alla prima installazione: senza
    // questo controllo la pagina si ricaricherebbe da sola appena aperta.
    if (updateAccepted) location.reload();
  });

  window.addEventListener('load', () => {
    // updateViaCache: 'none' impedisce al browser di servire una copia vecchia
    // del service worker dalla sua cache HTTP, che ritarderebbe l'avviso.
    navigator.serviceWorker.register(config.swUrl, { updateViaCache: 'none' })
      .then(watchForUpdates)
      .catch((err) => console.warn('Registrazione service worker fallita:', err));
  });
}

// ---------------------------------------------------------------------------
// 2. "Sei offline"
// ---------------------------------------------------------------------------

let wasOffline = false;

function renderNetworkState({ silentWhenOnline } = {}) {
  if (navigator.onLine) {
    if (wasOffline) {
      wasOffline = false;
      if (!silentWhenOnline) {
        showBar('network', { icon: 'online', message: text('online'), autoHideMs: 2600 });
        return;
      }
    }
    hideBar('network');
  } else {
    wasOffline = true;
    showBar('network', { icon: 'offline', message: text('offline') });
  }
}

function initNetworkStatus() {
  window.addEventListener('online', () => renderNetworkState());
  window.addEventListener('offline', () => renderNetworkState());
  // All'avvio si mostra solo se davvero offline, senza il messaggio di ritorno.
  renderNetworkState({ silentWhenOnline: true });
}

// ---------------------------------------------------------------------------
// 3. Promemoria del backup
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!then || Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / DAY_MS);
}

function firstSeen() {
  let iso = readStorage('firstSeen.v1');
  if (!iso) {
    iso = new Date().toISOString();
    writeStorage('firstSeen.v1', iso);
  }
  return iso;
}

// Stato del backup, usato sia dalla riga nelle Impostazioni sia dal promemoria.
// Senza dati non c'e' niente da salvare: "mai fatto un backup" resta scritto,
// ma non viene segnalato come un problema.
function backupInfo() {
  const iso = readStorage('backup.v1');
  const days = daysSince(iso);
  const hasData = config.hasData ? !!config.hasData() : true;
  return {
    date: iso,
    days,
    never: days === null,
    hasData,
    overdue: hasData && (days === null || days >= config.backupAfterDays),
  };
}

function backupLabel() {
  const info = backupInfo();
  if (info.never) return text('backup_never');
  if (info.days <= 0) return text('backup_today');
  if (info.days === 1) return text('backup_yesterday');
  return text('backup_days', { days: info.days });
}

function markBackupDone() {
  writeStorage('backup.v1', new Date().toISOString());
  hideBar('backup');
}

function maybeNudgeBackup() {
  // Tutto dentro il timeout: il promemoria arriva a schermata gia' disegnata,
  // non in mezzo all'avvio, e a quel punto l'app ha certamente gia' chiamato
  // configure() passando hasData().
  setTimeout(() => {
    const info = backupInfo();
    if (!info.overdue) return;

    // Chi ha appena installato l'app non ha ancora niente da salvare.
    const age = daysSince(firstSeen());
    if (age !== null && age < config.backupGraceDays) return;

    const sinceNudge = daysSince(readStorage('backupNudge.v1'));
    if (sinceNudge !== null && sinceNudge < config.backupNudgeEveryDays) return;

    writeStorage('backupNudge.v1', new Date().toISOString());

    showBar('backup', {
      icon: 'backup',
      message: info.never ? text('backup_nudge_never') : text('backup_nudge_days', { days: info.days }),
      actionLabel: config.onBackupRequest ? text('backup_action') : null,
      onAction: () => {
        hideBar('backup');
        if (config.onBackupRequest) config.onBackupRequest();
      },
      dismissible: true,
    });
  }, 2500);
}

// ---------------------------------------------------------------------------
// Avvio
// ---------------------------------------------------------------------------

function configure(options) {
  Object.assign(config, options || {});
}

function start() {
  initServiceWorker();
  initNetworkStatus();
  if (config.backupReminder) maybeNudgeBackup();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

window.PwaShell = {
  configure,
  showBar,
  hideBar,
  backupInfo,
  backupLabel,
  markBackupDone,
};

})();
