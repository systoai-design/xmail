/**
 * Undo send.
 *
 * Gmail's trick, and it is a trick: nothing clever happens after the fact, the
 * send is simply held for a few seconds before it is performed at all. Once a
 * message is encrypted to a recipient, inserted, charged and anchored on a
 * public chain, there is no unsending it -- the anchor is immutable by design.
 * So the only honest undo is one that happens before any of that.
 *
 * The timer lives here rather than in the composer because the composer closes
 * the moment you hit Send. A `setTimeout` inside a component that unmounts is a
 * timer nobody can cancel.
 *
 * The message is saved as a draft first, so a tab closed mid-window loses
 * nothing: the send never happened and the draft is still there.
 */

export const UNDO_WINDOW_MS = 7000;

interface Pending {
  timer: ReturnType<typeof setTimeout>;
  perform: () => Promise<void>;
}

let pending: Pending | null = null;

/**
 * Holds `perform` for the undo window, then runs it.
 *
 * The returned function reports whether it ACTUALLY cancelled. It used to
 * return void, so callers could not tell a real undo from a no-op after the
 * window had closed -- and the toast cheerfully reported "Send undone" for a
 * message that had already gone out. A cancel that cannot fail is a cancel
 * whose callers will lie on its behalf.
 *
 * Only one send is ever in flight; scheduling a second commits the first
 * immediately rather than dropping it on the floor.
 */
export function scheduleSend(perform: () => Promise<void>): () => boolean {
  if (pending) flushPendingSend();

  const entry: Pending = {
    perform,
    timer: setTimeout(() => {
      pending = null;
      void perform();
    }, UNDO_WINDOW_MS),
  };
  pending = entry;

  return () => {
    if (pending !== entry) return false; // already sent; too late to undo
    clearTimeout(entry.timer);
    pending = null;
    return true;
  };
}

/** Commit a held send now, without waiting out the window. */
export function flushPendingSend() {
  if (!pending) return;
  const entry = pending;
  pending = null;
  clearTimeout(entry.timer);
  void entry.perform();
}

export function hasPendingSend() {
  return pending !== null;
}

/**
 * A held send must not be lost to a page close. The window is short, so the
 * pragmatic choice is to commit rather than discard -- the user pressed Send,
 * and the draft survives either way.
 */
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushPendingSend);
}
