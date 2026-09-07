/**
 * Event bus for cross-component communication
 */

export const KEY_MANAGEMENT_EVENTS = {
  OPEN: 'xmail:openKeyManagement',
  IMPORTED: 'xmail:keyImported',
} as const;

/**
 * Credits changed.
 *
 * useCredits is mounted in several places at once and each copy holds its own
 * state, so handing the new balance back through a prop only updated whichever
 * copy happened to be wired -- and the sidebar's copy was not wired at all.
 * A broadcast reaches all of them.
 */
const CREDITS_CHANGED = 'xmail:creditsChanged';

export function emitCreditsChanged(balance?: number) {
  document.dispatchEvent(new CustomEvent(CREDITS_CHANGED, { detail: { balance } }));
}

/** Mail lists should re-read: something was sent, undone, deleted or delivered. */
const MAIL_CHANGED = 'xmail:mailChanged';

export function emitMailChanged() {
  document.dispatchEvent(new CustomEvent(MAIL_CHANGED));
}

export function onMailChanged(callback: () => void) {
  const handler = () => callback();
  document.addEventListener(MAIL_CHANGED, handler);
  return () => document.removeEventListener(MAIL_CHANGED, handler);
}

export function onCreditsChanged(callback: (balance?: number) => void) {
  const handler = (e: Event) => callback((e as CustomEvent).detail?.balance);
  document.addEventListener(CREDITS_CHANGED, handler);
  return () => document.removeEventListener(CREDITS_CHANGED, handler);
}

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
