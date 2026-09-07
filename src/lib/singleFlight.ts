/**
 * Collapses concurrent calls for the same thing into one.
 *
 * Written for wallet signatures. Six requests go out on a cold load -- inbox,
 * sent, drafts, credits, parked count, parked flush -- and each one used to
 * discover there was no session token and raise its own Phantom prompt. React
 * StrictMode double-invokes effects in development, so that was twelve prompts
 * before the composer had even opened.
 *
 * Callers that arrive while a request is in flight await the same promise
 * instead of starting their own. The slot is cleared in `finally`, so a rejected
 * signature fails only the callers waiting on it rather than poisoning every
 * later attempt.
 */
export function createSingleFlight<T>() {
  let inFlight: Promise<T> | null = null;

  return {
    run(factory: () => Promise<T>): Promise<T> {
      if (!inFlight) {
        inFlight = factory().finally(() => {
          inFlight = null;
        });
      }
      return inFlight;
    },
    get pending() {
      return inFlight !== null;
    },
  };
}
