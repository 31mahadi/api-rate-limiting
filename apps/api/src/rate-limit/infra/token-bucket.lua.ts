/**
 * Atomic token-bucket in a single Redis Lua script.
 *
 * Why Lua: rate limiting is read-compute-write. Under concurrency, doing that
 * in three round-trips (or even WATCH/MULTI/EXEC with a retry loop) lets two
 * requests read the same token count and both "win" — double-spend. Redis runs
 * a Lua script atomically as one operation, so there is no interleaving. One
 * round-trip, no retries. (See docs/adr/0002.)
 *
 * KEYS[1]            bucket key
 * ARGV[1] now_ms     server clock (ms)
 * ARGV[2] capacity   burst ceiling
 * ARGV[3] refill     tokens per second
 * ARGV[4] cost       tokens this request costs
 * returns { allowed(0|1), tokens_remaining(string, fractional) }
 */
export const TOKEN_BUCKET_LUA = `
local key      = KEYS[1]
local now      = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])
local refill   = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])

local data   = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(data[1])
local ts     = tonumber(data[2])
if tokens == nil then tokens = capacity end
if ts == nil then ts = now end

local elapsed = (now - ts) / 1000.0
if elapsed < 0 then elapsed = 0 end
tokens = math.min(capacity, tokens + elapsed * refill)

local allowed = 0
if tokens >= cost then
  tokens = tokens - cost
  allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
-- expire idle buckets so memory doesn't grow unbounded
redis.call('PEXPIRE', key, 60000)

return { allowed, tostring(tokens) }
`;
