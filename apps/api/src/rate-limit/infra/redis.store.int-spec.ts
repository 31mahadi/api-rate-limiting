import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { Redis } from 'ioredis';
import { RedisStore } from './redis.store';

// Proves ADR 0002: the atomic Lua script prevents double-spend under concurrency.
describe('RedisStore (integration)', () => {
  let container: StartedTestContainer;
  let client: Redis;
  let store: RedisStore;

  beforeAll(async () => {
    container = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .start();
    client = new Redis(container.getMappedPort(6379), container.getHost());
    store = new RedisStore(client);
    store.onModuleInit();
  }, 60_000);

  afterAll(async () => {
    await client?.quit();
    await container?.stop();
  });

  it('allows exactly `capacity` of many concurrent requests (no double-spend)', async () => {
    const params = { capacity: 20, refillPerSec: 0 };
    const results = await Promise.all(
      Array.from({ length: 100 }, () => store.consume('concurrency', params)),
    );

    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(20);
  });
});
