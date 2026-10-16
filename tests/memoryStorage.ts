import type { KeyValueStorage } from '../src/persistence/SaveService';

/** Stockage en mémoire qui imite `localStorage`, avec un quota optionnel. */
export class MemoryStorage implements KeyValueStorage {
  readonly data = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.data.size;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('quota', 'QuotaExceededError');
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

/** Stockage qui refuse tout, comme certains modes privés. */
export class BrokenStorage implements KeyValueStorage {
  readonly length = 0;
  key(): string | null {
    throw new Error('SecurityError');
  }
  getItem(): string | null {
    throw new Error('SecurityError');
  }
  setItem(): void {
    throw new Error('SecurityError');
  }
  removeItem(): void {
    throw new Error('SecurityError');
  }
}
