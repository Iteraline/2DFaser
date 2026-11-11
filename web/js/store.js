// Guardado en el dispositivo (fase 1). En la fase 2 se sincronizará con Supabase como en Chess.
import { newSave } from './run.js';
const KEY = 'faser.save.v1';

export function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return { ...newSave(), ...JSON.parse(raw) }; } catch (e) { /* sin almacenamiento */ }
  return newSave();
}
export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* modo privado: se juega sin guardar */ }
}
export function wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* nada */ } }
