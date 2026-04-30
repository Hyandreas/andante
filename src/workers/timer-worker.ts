// Off-main-thread session timer. Lives in a Web Worker so a backgrounded /
// throttled main thread can't drift the wall-clock count. Uses a setTimeout
// loop instead of setInterval so we can recompute the real elapsed each tick.

type IncomingMessage =
  | { type: "START"; startTime: number }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" };

type OutgoingMessage = { type: "TICK"; elapsed: number };

let startedAt: number | null = null;
let pausedAt: number | null = null;
let pausedTotal = 0;
let timeoutId: ReturnType<typeof setTimeout> | null = null;

const post = (msg: OutgoingMessage) => (self as unknown as Worker).postMessage(msg);

function tick() {
  if (startedAt == null) return;
  const now = pausedAt ?? Date.now();
  const elapsed = Math.floor((now - startedAt - pausedTotal) / 1000);
  post({ type: "TICK", elapsed });
  // Schedule the next tick to align with the next whole second of wall time
  // so we don't drift over long sessions.
  const drift = (now - startedAt - pausedTotal) % 1000;
  timeoutId = setTimeout(tick, 1000 - drift);
}

self.addEventListener("message", (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data;
  switch (msg.type) {
    case "START":
      startedAt = msg.startTime;
      pausedAt = null;
      pausedTotal = 0;
      tick();
      break;
    case "PAUSE":
      if (pausedAt != null) return;
      pausedAt = Date.now();
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
      break;
    case "RESUME":
      if (pausedAt == null) return;
      pausedTotal += Date.now() - pausedAt;
      pausedAt = null;
      tick();
      break;
    case "STOP":
      startedAt = null;
      pausedAt = null;
      pausedTotal = 0;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
      break;
  }
});

export {}; // module marker for tsc
