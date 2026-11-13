// Récords en el dispositivo. Más adelante: reto diario y clasificación en la nube.
const KEY = 'alapiz.v1';
export function load() {
  try { return { best: 0, bestPage: 0, plays: 0, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { return { best: 0, bestPage: 0, plays: 0 }; }
}
export function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } }
