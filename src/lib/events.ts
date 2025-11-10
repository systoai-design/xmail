/**
 * Event bus for cross-component communication
 */

export const KEY_MANAGEMENT_EVENTS = {
  OPEN: 'xmail:openKeyManagement',
  IMPORTED: 'xmail:keyImported',
} as const;

export function openKeyManagement() {
  document.dispatchEvent(new CustomEvent(KEY_MANAGEMENT_EVENTS.OPEN));
}

export function emitKeyImported() {
  document.dispatchEvent(new CustomEvent(KEY_MANAGEMENT_EVENTS.IMPORTED));
}

export function onKeyImported(callback: () => void) {
  const handler = () => callback();
  document.addEventListener(KEY_MANAGEMENT_EVENTS.IMPORTED, handler);
  return () => document.removeEventListener(KEY_MANAGEMENT_EVENTS.IMPORTED, handler);
}

export function onOpenKeyManagement(callback: () => void) {
  const handler = () => callback();
  document.addEventListener(KEY_MANAGEMENT_EVENTS.OPEN, handler);
  return () => document.removeEventListener(KEY_MANAGEMENT_EVENTS.OPEN, handler);
}
