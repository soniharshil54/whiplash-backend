import { createClient } from "redis";

// 👇 exact compile-time type of createClient() in YOUR install
type RedisClient = ReturnType<typeof createClient>;

// Redis singleton
let redisClient: RedisClient | null = null;

async function getRedis(): Promise<RedisClient> {
  if (redisClient?.isOpen) return redisClient;

  const host = process.env.REDIS_HOST;
  const port = Number(process.env.REDIS_PORT);
  const password = process.env.REDIS_PASSWORD || undefined;

  const client = createClient({
    socket: { host, port },
    password,
  });

  client.on("error", (err) => console.error("Redis error:", err));
  client.on("connect", () => console.log("Redis connecting..."));
  client.on("ready", () => console.log("Redis ready"));
  client.on("reconnecting", () => console.log("Redis reconnecting..."));
  client.on("end", () => console.log("Redis connection closed"));

  await client.connect();
  redisClient = client;
  return client;
}

async function shutdown() {
  console.log("Shutting down...");
  try {
    if (redisClient?.isOpen) await redisClient.quit();
  } finally {
    process.exit(0);
  }
}

export { getRedis, shutdown };

// Handle process exit
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown();
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  shutdown();
});