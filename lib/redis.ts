type RedisLike = {
  get: (key: string) => Promise<string | null>;
  set: (...args: any[]) => Promise<any>;
  del: (...keys: string[]) => Promise<number>;
};

class MemoryRedisClient implements RedisLike {
  private store = new Map<string, { value: string; expiresAt: number | null }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt !== null && item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  async set(...args: any[]): Promise<'OK'> {
    const [key, value, mode, ttlRaw] = args;
    let expiresAt: number | null = null;

    if (mode === 'EX' && Number.isFinite(Number(ttlRaw))) {
      expiresAt = Date.now() + Number(ttlRaw) * 1000;
    }

    this.store.set(String(key), { value: String(value), expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
    }
    return removed;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var redisClientSingleton: RedisLike | undefined;
}

if (!global.redisClientSingleton) {
  global.redisClientSingleton = new MemoryRedisClient();
}

const redis: RedisLike = global.redisClientSingleton;

export default redis;
