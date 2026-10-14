import { EventEmitter } from 'node:events';
const bus = new EventEmitter();
bus.setMaxListeners(200);
const CHANNEL_PREFIX = 'site:';
export function publish(siteId: string, event: unknown): void { bus.emit(`${CHANNEL_PREFIX}${siteId}`, event); }
export function subscribe(siteId: string, listener: (event: unknown) => void): () => void {
  const channel = `${CHANNEL_PREFIX}${siteId}`;
  bus.on(channel, listener);
  return () => bus.off(channel, listener);
}
