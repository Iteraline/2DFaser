// Navegación y flujo: refugio → mapa → combate/evento → refugio. La lógica vive en engine.js y run.js.
import { newCombat, doMove, doAction, endTurn, heroReach, actions, enemyAt, key, TUTORIAL, N } from './engine.js';
import { newRun, nextNodes, nodeById, rowOf, encounter, combatGold, applyEvent, finishRun, buildCost, buy } from './run.js';
import { QUESTS, BUILD, BUILD_ORDER, NODE, EVENTS, ENEMY, STORY, heroStats } from './data.js';
import { Board } from './render.js';
import { newSeed, rng } from './rng.js';
import * as store from './store.js';

const $ = (id) => document.getElementById(id);
let S = store.load();
const persist = () => store.save(S);
const board = new Board($('board'));
let busy = false, mode = null, undoSnap = null, tut = null, inspect = null;
const C = () => S.run && S.run.combat;
const clone = (o) => JSON.parse(JSON.stringify(o));
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function show(id) { for (const sc of document.querySelectorAll('.screen')) sc.hidden = sc.id !== id; }

// ---------- Ventana modal ----------
function modal({ kicker = '', title, text = '', choices = [{ label: 'Seguir' }] }) {
  return new Promise((res) => {
    $('mdKicker').textContent = kicker; $('mdTitle').textContent = title; $('mdText').textContent = text;
    const box = $('mdChoices'); box.innerHTML = '';
    choices.forEach((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = i === 0 ? 'main big' : 'big';
      b.textContent = c.label; b.disabled = !!c.disabled;
      b.onclick = () => { $('modal').hidden = true; res(i); };
      box.appendChild(b);
    });
    $('modal').hidden = false;
    setTimeout(() => box.querySelector('button:not(:disabled)')?.focus(), 30);
  });
}

function stats(h, gold) {
  const hearts = '<span class="hp">' + '♥'.repeat(Math.max(0, h.hp)) + '<i>' + '♥'.repeat(Math.max(0, h.maxHp - h.hp)) + '</i></span>';
  const parts = [hearts];
  if (h.armorMax > 0 || h.armor > 0) parts.push(`<span title="Armadura">⛨ ${h.armor ?? h.armorMax}</span>`);
  parts.push(`<span title="Flechas">➶ ${h.arrows}</span>`);
  if (h.trapsMax > 0 || h.traps > 0) parts.push(`<span title="Trampas">✱ ${h.traps}</span>`);
  if (gold != null) parts.push(`<span class="gold" title="Oro de la expedición"><span class="coin"></span>${gold}</span>`);
  return parts.join('');
}

// ---------- Refugio ----------
function renderHome() {
  show('home');
  $('hGold').textContent = S.gold;
  const qi = Math.min(S.quest, QUESTS.length - 1), q = QUESTS[qi], free = S.quest >= QUESTS.length;
  $('hQuest').innerHTML = `
    <p class="kicker">${free ? 'Valdeluz es libre' : `Gesta ${qi + 1} de ${QUESTS.length}`}</p>
    <h2>${esc(q.name)}</h2>
    <p class="goal">${esc(free ? 'Puedes volver a la montaña cuando quieras.' : q.goal)}</p>
    <p class="muted">${esc(q.intro)}</p>
    <button type="button" id="go" class="main big">${S.run ? 'Continuar la expedición' : 'Partir de expedición'}</button>`;
  $('go').onclick = () => { if (!S.run) { S.run = newRun(S, newSeed()); persist(); } resume(); };
  const st = heroStats(S.build);
  $('hHero').innerHTML = `♥ ${st.maxHp} · ⛨ ${st.armorMax} · ➶ ${st.arrowsMax} · ✱ ${st.trapsMax} · mueve ${st.moveRange}`;
  $('hBuild').innerHTML = BUILD_ORDER.map((id) => {
    const b = BUILD[id], lv = S.build[id] || 0, cost = buildCost(S, id);
    const dots = b.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
    return `<div class="bcard ${lv ? 'built' : ''}">
      <div class="bhead"><span class="bicon">${b.icon}</span><div><b>${b.name}</b><span class="dots">${dots}</span></div></div>
      <p>${cost == null ? esc(b.desc[b.desc.length - 1]) + ' ✓' : esc(b.desc[lv])}</p>
      ${cost == null ? '<span class="maxed">Completo</span>' : `<button type="button" class="buy" data-b="${id}" ${S.gold < cost ? 'disabled' : ''}><span class="coin"></span>${cost}</button>`}
    </div>`;
  }).join('');
  for (const btn of $('hBuild').querySelectorAll('[data-b]')) btn.onclick = () => { if (buy(S, btn.dataset.b)) { persist(); renderHome(); } };
  $('hChain').innerHTML = QUESTS.map((x, i) => `<span class="${i < S.quest ? 'done' : i === S.quest ? 'cur' : ''}">${i < S.quest ? '✓ ' : ''}${esc(x.name)}</span>`).join('');
  const t = S.stats;
  $('hStats').innerHTML = `Expediciones ${t.runs} · jefes ${t.bosses} · caídas ${t.deaths} · enemigos ${t.kills} · <button type="button" class="link" id="wipe">Empezar de cero</button>`;
  $('wipe').onclick = async () => {
    if (await modal({ title: '¿Borrar la partida?', text: 'Se pierde el oro, el refugio y las gestas de este dispositivo.', choices: [{ label: 'No' }, { label: 'Sí, borrar' }] }) === 1) { store.wipe(); S = store.load(); boot(); } else renderHome();
  };
}

// ---------- Mapa ----------
function renderMap() {
  const run = S.run, q = QUESTS.find((x) => x.id === run.quest);
  show('map');
  $('mQuest').textContent = q.name; $('mGoal').textContent = q.goal;
  $('mStats').innerHTML = stats(run.hero, run.gold);
  const wrap = $('mapWrap'), svg = $('mapSvg'), W = Math.min(wrap.clientWidth || 360, 560), rows = run.map, RH = 92, H = rows.length * RH + 40;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.width = W + 'px'; svg.style.height = H + 'px';
  const pos = new Map();
  rows.forEach((row, r) => row.forEach((n, j) => pos.set(n.id, [(j + 1) / (row.length + 1) * W, H - 40 - r * RH])));
  const avail = new Set(nextNodes(run)), seen = new Set(run.visited);
  let g = '';
  for (const row of rows) for (const n of row) for (const l of n.links) {
    const [ax, ay] = pos.get(n.id), [bx, by] = pos.get(l), walked = seen.has(n.id) && seen.has(l);
    g += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" class="${walked ? 'walked' : n.id === run.at && avail.has(l) ? 'open' : ''}"/>`;
  }
  for (const row of rows) for (const n of row) {
    const [x, y] = pos.get(n.id), cls = [n.type, avail.has(n.id) ? 'avail' : '', seen.has(n.id) ? 'seen' : '', n.id === run.at ? 'here' : ''].join(' ');
    const r = n.type === 'jefe' ? 30 : 22;
    g += `<g class="node ${cls}" data-n="${n.id}" transform="translate(${x},${y})" ${avail.has(n.id) ? 'tabindex="0" role="button"' : ''} aria-label="${NODE[n.type].name}">
      <circle r="${r}"/><text dy="1">${n.type === 'jefe' ? ENEMY[q.boss].glyph : NODE[n.type].icon}</text>
      ${n.type === 'jefe' ? `<text class="lbl" dy="${r + 16}">${esc(ENEMY[q.boss].name)}</text>` : ''}</g>`;
  }
  svg.innerHTML = g;
  for (const el of svg.querySelectorAll('.node.avail')) {
    el.onclick = () => enterNode(el.dataset.n);
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') enterNode(el.dataset.n); };
  }
  $('mHint').textContent = run.at ? 'Elige el siguiente paso.' : 'Elige tu camino: ⚔ combate · ☠ élite (más oro) · ◆ botín · ? encuentro · ▲ hoguera.';
  const here = run.at ? pos.get(run.at)[1] : H;
  requestAnimationFrame(() => { wrap.scrollTop = Math.max(0, here - wrap.clientHeight * 0.65); });
}

const nodeSeed = (run, id) => (run.seed ^ (rowOf(id) * 7919 + (+id.split('-')[1]) * 104729 + 17)) >>> 0;

async function enterNode(id) {
  const run = S.run;
  if (busy || !nextNodes(run).includes(id)) return;
  const n = nodeById(run.map, id), seed = nodeSeed(run, id);
  run.at = id; run.visited.push(id); persist();
  if (n.type === 'combate' || n.type === 'elite' || n.type === 'jefe') {
    run.node = id;
    run.combat = newCombat({ seed, hero: run.hero, roster: encounter(run, id, seed) });
    persist();
    if (n.type === 'jefe') { const q = QUESTS.find((x) => x.id === run.quest), b = ENEMY[q.boss]; await modal({ kicker: 'Jefe', title: b.name, text: b.tip }); }
    return startFight();
  }
  if (n.type === 'botin') {
    const r = rng(seed), gold = 10 + r.int(0, 8) + rowOf(id) * 2, arrows = r.next() < 0.5 ? 2 : 0;
    run.gold += gold; run.hero.arrows += arrows; persist();
    await modal({ kicker: 'Botín', title: `+${gold} de oro`, text: arrows ? `Y ${arrows} flechas en un carcaj abandonado.` : 'Un cofre olvidado junto al camino.' });
    return renderMap();
  }
  if (n.type === 'evento') {
    const e = EVENTS[seed % EVENTS.length];
    const i = await modal({ kicker: 'Encuentro', title: e.title, text: e.text, choices: e.choices.map((c) => ({ label: c.label, disabled: c.need && c.need.gold > run.gold })) });
    const res = applyEvent(run, e.id, i); persist();
    if (res) await modal({ title: e.title, text: res });
    return renderMap();
  }
  if (n.type === 'hoguera') {
    const i = await modal({ kicker: 'Hoguera', title: 'Una hoguera', text: `Puedes descansar o volver al refugio con todo el oro (${run.gold}). Si vuelves, la gesta empieza de nuevo.`,
      choices: [{ label: `Descansar (+2 ♥)` }, { label: `Volver al refugio (+${run.gold} oro)` }] });
    if (i === 0) { run.hero.hp = Math.min(run.hero.maxHp, run.hero.hp + 2); persist(); return renderMap(); }
    const r = finishRun(S, 'retreat'); persist();
    await modal({ kicker: 'Retirada', title: 'De vuelta al refugio', text: `Traes ${r.gold} de oro. Mejora el refugio y vuelve más fuerte.` });
    return renderHome();
  }
}

// ---------- Combate ----------
const ACT = {
  sword: { label: 'Espada', icon: '⚔', tip: 'Golpea a un enemigo a tu lado' },
  spear: { label: 'Lanza', icon: '↟', tip: 'Golpea y empuja (a la sima, contra rocas o contra otro)' },
  bow: { label: 'Arco', icon: '➶', tip: 'Dispara en línea recta' },
  trap: { label: 'Trampa', icon: '✱', tip: 'Coloca una trampa a tu lado' },
  charge: { label: 'Carga', icon: '♘', tip: 'Galopa en línea recta y embiste' }
};

function startFight() {
  const run = S.run, s = C();
  board.load(s); mode = null; undoSnap = null; inspect = null; board.ui.sel = null;
  const n = run.node === 'prologo' ? null : nodeById(run.map, run.node);
  $('fTitle').textContent = !n ? 'Prólogo' : n.type === 'jefe' ? ENEMY[QUESTS.find((x) => x.id === run.quest).boss].name : NODE[n.type].name;
  show('fight');
  board.resize();
  refreshFight();
}

function hintText(s) {
  if (tut === 0) return 'Toca una casilla <b class="t-blue">azul</b> para moverte. Las <b class="t-red">rojas</b> son peligro: si acabas el turno en una, te golpean.';
  if (tut === 1) return 'Ahora ataca: pulsa <b>Espada</b> y toca un enemigo a tu lado, o <b>Arco</b> para disparar en línea recta.';
  if (mode) return `${ACT[mode].tip}: toca una casilla <b class="t-gold">dorada</b>.`;
  if (inspect) { const e = s.enemies.find((q) => q.id === inspect); if (e) { const d = ENEMY[e.type]; return `<b>${d.name}</b> · vida ${e.hp}/${e.maxHp} · daño ${d.dmg} · mueve ${d.move}. ${d.tip}`; } }
  if (tut === 2) return 'Cada turno: <b>1 movimiento + 1 acción</b>. Golpea y apártate del rojo. Toca un enemigo para ver su alcance.';
  if (s.spawn != null) return '<b class="t-red">¡Refuerzos!</b> Llegará un enemigo por la casilla marcada. Acaba rápido.';
  if (!s.hero.moved && !s.hero.acted) return 'Muévete (azul) y actúa, en el orden que quieras.';
  if (!s.hero.acted) return 'Te queda la acción.';
  return 'Te queda el movimiento.';
}

function refreshFight() {
  const s = C(); if (!s) return;
  const h = s.hero;
  $('fStats').innerHTML = stats(h, S.run.node === 'prologo' ? null : S.run.gold + s.gold);
  $('fTurn').textContent = `Turno ${s.turn}`;
  const A = s.phase === 'player' && !busy ? actions(s) : {};
  board.ui.reach = !busy && !mode && s.phase === 'player' ? heroReach(s) : null;
  board.ui.targets = mode ? A[mode] : null;
  board.ui.sel = inspect;
  const kinds = ['sword', h.spear && 'spear', 'bow', (h.traps > 0 || heroStats(S.build).trapsMax > 0) && 'trap', h.horse && 'charge'].filter(Boolean);
  $('acts').innerHTML = kinds.map((k) => {
    const n = k === 'bow' ? h.arrows : k === 'trap' ? h.traps : null, can = (A[k] || []).length > 0;
    return `<button type="button" class="act ${mode === k ? 'on' : ''}" data-k="${k}" ${can ? '' : 'disabled'} title="${ACT[k].tip}">
      <span class="ai">${ACT[k].icon}</span><span>${ACT[k].label}</span>${n != null ? `<em>${n}</em>` : ''}</button>`;
  }).join('');
  for (const b of $('acts').querySelectorAll('[data-k]')) b.onclick = () => { if (busy) return; mode = mode === b.dataset.k ? null : b.dataset.k; inspect = null; refreshFight(); };
  $('undo').disabled = busy || !undoSnap;
  $('endTurn').disabled = busy || s.phase !== 'player';
  $('endTurn').classList.toggle('pulse', s.phase === 'player' && !busy && h.moved && h.acted === false && !(A.sword || []).length && !(A.bow || []).length);
  $('hint').innerHTML = hintText(s);
  $('foes').innerHTML = s.enemies.map((e) => { const d = ENEMY[e.type];
    return `<button type="button" class="foe ${inspect === e.id ? 'on' : ''}" data-e="${e.id}"><span class="g" style="background:${d.boss ? '#5b21b6' : FOE_COLOR[e.type] || '#c0392b'}">${d.glyph}</span><span class="n">${d.name}${e.stun ? ' · aturdido' : ''}</span><span class="h">${'♥'.repeat(Math.max(0, e.hp))}</span></button>`; }).join('');
  for (const b of $('foes').querySelectorAll('[data-e]')) b.onclick = () => { if (busy) return; mode = null; inspect = inspect === b.dataset.e ? null : b.dataset.e; refreshFight(); };
}
const FOE_COLOR = { lobo: '#8d6e63', bandido: '#c0392b', arquero: '#2e7d32', bruto: '#6d4c41', cultista: '#7b1fa2' };

async function animate() {
  const s = C(); busy = true; refreshFight();
  await board.play(s.ev.splice(0));
  busy = false;
}

$('board').addEventListener('pointerdown', (ev) => {
  if (busy || !C() || C().phase !== 'player') return;
  const r = $('board').getBoundingClientRect(), t = board.tileAt(ev.clientX - r.left, ev.clientY - r.top);
  if (t) onTile(t[0], t[1]);
});

async function onTile(x, y) {
  const s = C();
  if (mode) {
    const list = actions(s)[mode] || [];
    if (list.some((p) => p.x === x && p.y === y)) {
      const k = mode; mode = null; undoSnap = null; inspect = null;
      doAction(s, k, x, y);
      if (tut === 1) tut = 2;
      await animate(); return afterStep();
    }
    mode = null; return refreshFight();
  }
  const e = enemyAt(s, x, y);
  if (e) { inspect = inspect === e.id ? null : e.id; return refreshFight(); }
  if (heroReach(s).has(key(x, y))) {
    undoSnap = clone(s); undoSnap.ev = []; inspect = null;
    doMove(s, x, y);
    if (tut === 0) tut = 1;
    await animate(); return afterStep();
  }
  inspect = null; refreshFight();
}

async function afterStep() {
  const s = C(); persist();
  if (s.phase === 'won' || s.phase === 'lost') return finishFight();
  if (s.hero.moved && s.hero.acted) return enemyPhase();
  refreshFight();
}

async function enemyPhase() {
  const s = C(); if (busy || s.phase !== 'player') return;
  mode = null; undoSnap = null; inspect = null;
  endTurn(s);
  await animate(); persist();
  if (tut === 2 && s.turn > 3) tut = null;
  if (tut === 0 || tut === 1) tut = 2;
  if (s.phase === 'won' || s.phase === 'lost') return finishFight();
  refreshFight();
}
$('endTurn').onclick = () => enemyPhase();
$('undo').onclick = () => {
  if (busy || !undoSnap) return;
  S.run.combat = undoSnap; undoSnap = null; mode = null;
  board.load(S.run.combat); persist(); refreshFight();
};

async function finishFight() {
  const run = S.run, s = C();
  await new Promise((r) => setTimeout(r, 350));
  run.kills += s.kills;
  if (s.phase === 'lost') {
    const prologue = run.node === 'prologo';
    const r = finishRun(S, 'death'); S.tutorial = true; persist();
    await modal({ kicker: 'Derrota', title: 'Has caído', text: prologue ? 'Hasta los héroes tropiezan. El refugio te espera.' : `Vuelves al refugio con la mitad del oro: ${r.gold}. Construye y vuelve más fuerte.`, choices: [{ label: 'Al refugio' }] });
    return renderHome();
  }
  Object.assign(run.hero, { hp: s.hero.hp, arrows: s.hero.arrows, traps: s.hero.traps });
  run.combat = null;
  if (run.node === 'prologo') {
    run.gold += 5 + s.gold; S.tutorial = true; run.node = null; persist();
    await modal({ kicker: 'Victoria', title: `+${5 + s.gold} de oro`, text: 'Bien hecho. Cada camino del mapa esconde oro y peligro. Si caes, conservas la mitad del oro para mejorar el refugio.', choices: [{ label: 'Ver el mapa' }] });
    const q = QUESTS.find((x) => x.id === run.quest);
    await modal({ kicker: 'Gesta 1', title: q.name, text: q.intro, choices: [{ label: 'En marcha' }] });
    return renderMap();
  }
  const n = nodeById(run.map, run.node), gold = combatGold(n, s);
  run.gold += gold; run.node = null;
  if (n.type === 'jefe') {
    const r = finishRun(S, 'boss'), q = r.quest; persist();
    await modal({ kicker: '¡Gesta cumplida!', title: q.name, text: `${q.done} Traes ${r.gold} de oro (recompensa incluida).`, choices: [{ label: 'Al refugio' }] });
    return renderHome();
  }
  persist();
  await modal({ kicker: 'Victoria', title: `+${gold} de oro`, text: s.hero.hp < run.hero.maxHp / 2 ? 'Estás herido. Busca una hoguera (▲) o vuelve al refugio a tiempo.' : 'El camino sigue.', choices: [{ label: 'Seguir' }] });
  renderMap();
}

// ---------- Arranque ----------
function resume() {
  if (S.run && S.run.combat) return startFight();
  if (S.run) return renderMap();
  renderHome();
}
async function boot() {
  if (!S.tutorial && !S.run) {
    await modal({ kicker: 'Valdeluz', title: '2DFaser', text: STORY.opening, choices: [{ label: 'Coger la espada' }] });
    S.run = newRun(S, newSeed());
    S.run.node = 'prologo';
    S.run.combat = newCombat({ hero: S.run.hero, layout: TUTORIAL });
    tut = 0; persist();
    return startFight();
  }
  resume();
}
boot();

if ('serviceWorker' in navigator && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') navigator.serviceWorker.register('/sw.js').catch(() => {});
// Pruebas automáticas (tools/qa/smoke.mjs)
window.__game = { get S() { return S; }, board, N, key, onTile: (x, y) => onTile(x, y), endTurn: () => enemyPhase(), get busy() { return busy; } };
