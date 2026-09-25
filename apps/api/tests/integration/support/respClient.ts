/**
 * Minimal RESP (REdis Serialization Protocol) client — TEST SUPPORT ONLY.
 *
 * ## Why this lives in tests/ and ships no dependency
 *
 * The application is deliberately provider-neutral: it installs NO Redis client
 * and imports no Node networking module in `src/` (enforced by the forbidden-
 * import scan in tests/monitoringSecurity.test.ts, which covers
 * src/infra/redisSharedStateStore.ts and src/infra/sharedState.ts). To exercise
 * the Redis-backed path against a REAL broker in CI without pinning the repo to
 * `ioredis` vs `node-redis`, the integration harness supplies its own tiny
 * client that satisfies the `RedisLikeClient` command surface the adapter needs.
 *
 * This client is intentionally small and plaintext-only (redis://). Production
 * uses a real, hardened client (TLS, pooling, retries) wired at the deployment
 * boundary — see src/infra/redisSharedStateStore.ts and docs/CI.md. It is never
 * imported by application code.
 *
 * It implements exactly the commands the adapter maps to: GET, SET [EX], INCRBY,
 * EXPIRE, DEL, PING — plus FLUSHDB and close() for test isolation/teardown.
 */
import net from "node:net"
import type { RedisLikeClient } from "../../../src/infra/redisSharedStateStore.ts"

type RespValue = string | number | null

interface Waiter {
  resolve: (value: RespValue) => void
  reject: (error: Error) => void
}

/** A RedisLikeClient backed by a raw socket, with test-only helpers. */
export interface RespTestClient extends RedisLikeClient {
  flushdb(): Promise<void>
  close(): Promise<void>
}

/**
 * Parse ONE RESP reply from `buf`. Returns the value and the number of bytes
 * consumed, or null when the buffer does not yet hold a complete reply.
 */
function parseReply(buf: Buffer): { value: RespValue; consumed: number } | null {
  const nl = buf.indexOf("\r\n")
  if (nl === -1) return null
  const type = String.fromCharCode(buf[0]!)
  const line = buf.toString("utf8", 1, nl)
  const headerEnd = nl + 2
  switch (type) {
    case "+":
      return { value: line, consumed: headerEnd }
    case "-":
      throw new Error(`redis error: ${line}`)
    case ":":
      return { value: Number(line), consumed: headerEnd }
    case "$": {
      const len = Number(line)
      if (len === -1) return { value: null, consumed: headerEnd }
      const dataEnd = headerEnd + len
      if (buf.length < dataEnd + 2) return null // wait for data + trailing CRLF
      return { value: buf.toString("utf8", headerEnd, dataEnd), consumed: dataEnd + 2 }
    }
    default:
      throw new Error(`unsupported RESP reply type: ${type}`)
  }
}

function encodeCommand(args: string[]): Buffer {
  const parts = [`*${args.length}\r\n`]
  for (const arg of args) {
    parts.push(`$${Buffer.byteLength(arg)}\r\n${arg}\r\n`)
  }
  return Buffer.from(parts.join(""), "utf8")
}

/**
 * Connect a raw RESP client to a redis:// URL. Only plaintext is supported (CI
 * uses a service container on the job network); a rediss:// URL is rejected with
 * a clear message rather than silently downgrading.
 */
export async function connectRespClient(redisUrl: string): Promise<RespTestClient> {
  const url = new URL(redisUrl)
  if (url.protocol !== "redis:") {
    throw new Error(
      "respClient supports only redis:// (plaintext). Use a real client for rediss://.",
    )
  }
  const host = url.hostname || "127.0.0.1"
  const port = Number(url.port || "6379")

  const socket = net.createConnection({ host, port })
  socket.setNoDelay(true)

  const waiters: Waiter[] = []
  let inbound = Buffer.alloc(0)
  let fatal: Error | null = null

  const failAll = (error: Error) => {
    fatal = error
    while (waiters.length) waiters.shift()!.reject(error)
  }

  socket.on("data", (chunk: Buffer) => {
    inbound = Buffer.concat([inbound, chunk])
    // Drain as many complete replies as the buffer holds, in FIFO order.
    for (;;) {
      if (waiters.length === 0) break
      let parsed: { value: RespValue; consumed: number } | null
      try {
        parsed = parseReply(inbound)
      } catch (error) {
        // A -ERR reply belongs to the oldest in-flight command.
        waiters.shift()!.reject(error as Error)
        // Best-effort resync: drop through the CRLF so the stream stays aligned.
        const nl = inbound.indexOf("\r\n")
        inbound = nl === -1 ? Buffer.alloc(0) : inbound.subarray(nl + 2)
        continue
      }
      if (!parsed) break
      inbound = inbound.subarray(parsed.consumed)
      waiters.shift()!.resolve(parsed.value)
    }
  })
  socket.on("error", (error) => failAll(error))
  socket.on("close", () => failAll(new Error("redis socket closed")))

  await new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve)
    socket.once("error", reject)
  })

  const send = (...args: string[]): Promise<RespValue> => {
    if (fatal) return Promise.reject(fatal)
    return new Promise<RespValue>((resolve, reject) => {
      waiters.push({ resolve, reject })
      socket.write(encodeCommand(args))
    })
  }

  if (url.password) await send("AUTH", url.password)
  const db = url.pathname.replace(/^\//, "")
  if (db) await send("SELECT", db)

  return {
    async get(key) {
      const reply = await send("GET", key)
      return reply === null ? null : String(reply)
    },
    async set(key, value, mode, ttlSeconds) {
      return mode === "EX" && ttlSeconds !== undefined
        ? send("SET", key, value, "EX", String(ttlSeconds))
        : send("SET", key, value)
    },
    async incrby(key, by) {
      return Number(await send("INCRBY", key, String(by)))
    },
    async expire(key, ttlSeconds) {
      return send("EXPIRE", key, String(ttlSeconds))
    },
    async del(key) {
      return send("DEL", key)
    },
    async ping() {
      return String(await send("PING"))
    },
    async flushdb() {
      await send("FLUSHDB")
    },
    async close() {
      await new Promise<void>((resolve) => {
        socket.end(() => resolve())
      })
    },
  }
}
