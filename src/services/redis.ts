import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

async function getRedis(): Promise<RedisClient> {
  console.log("Getting Redis client...");
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

async function shutdownRedis() {
  console.log("Shutting down Redis...");
  if (redisClient?.isOpen) await redisClient.quit();
}

export { getRedis, shutdownRedis };