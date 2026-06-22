// Atomic token bucket. Redis runs the whole read-compute-write as one
// uninterruptible op, so concurrent requests can't double-spend a token.
// KEYS[1]=bucket  ARGV=now_ms,capacity,refill_per_sec,cost  ->  {allowed, tokens}
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
redis.call('PEXPIRE', key, 60000)

return { allowed, tostring(tokens) }
`;
