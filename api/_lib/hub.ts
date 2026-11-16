import type { VercelRequest, VercelResponse } from '@vercel/node';

export type Pulse = {
  id: string;
  channel: string;
  event: string;
  payload: unknown;
  timestamp: string;
};

type Listener = (pulse: Pulse) => void;

type HubState = {
  channels: Map<string, Set<Listener>>;
  history: Pulse[];
  counts: Map<string, number>;
};

const globalHub = globalThis as typeof globalThis & {
  __syncPulseHub?: HubState;
};

const hub: HubState =
  globalHub.__syncPulseHub ??
  (globalHub.__syncPulseHub = {
    channels: new Map<string, Set<Listener>>(),
    history: [],
    counts: new Map<string, number>(),
  });

export function validateChannel(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 80 &&
    /^[a-zA-Z0-9:_-]+$/.test(value)
  );
}

export function publish(channel: string, event: string, payload: unknown) {
  const pulse: Pulse = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    channel,
    event,
    payload,
    timestamp: new Date().toISOString(),
  };

  hub.history.unshift(pulse);
  if (hub.history.length > 250) hub.history.length = 250;

  hub.counts.set(channel, (hub.counts.get(channel) ?? 0) + 1);

  let delivered = 0;
  const listeners: Set<Listener> | undefined = hub.channels.get(channel);
  listeners?.forEach((listener: Listener) => {
    try {
      listener(pulse);
      delivered += 1;
    } catch {
      // Isolate subscriber errors so one listener cannot block others.
    }
  });

  return { pulse, delivered };
}

export function subscribe(channel: string, listener: Listener): () => void {
  const listeners: Set<Listener> =
    hub.channels.get(channel) ?? new Set<Listener>();

  listeners.add(listener);
  hub.channels.set(channel, listeners);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) hub.channels.delete(channel);
  };
}

export function snapshot() {
  const names = new Set<string>([
    ...hub.channels.keys(),
    ...hub.counts.keys(),
  ]);

  return {
    channels: [...names].map((channel) => ({
      channel,
      subscribers: hub.channels.get(channel)?.size ?? 0,
      published: hub.counts.get(channel) ?? 0,
    })),
    totalSubscribers: [...hub.channels.values()].reduce(
      (total, listeners) => total + listeners.size,
      0,
    ),
    totalPublished: [...hub.counts.values()].reduce(
      (total, count) => total + count,
      0,
    ),
    recent: hub.history.slice(0, 30),
  };
}

export function methodNotAllowed(res: VercelResponse, allow: string) {
  res.setHeader('Allow', allow);
  return res.status(405).json({ error: 'Method not allowed' });
}

export function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
