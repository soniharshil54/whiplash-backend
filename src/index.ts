import express, { Request, Response } from "express";
import { getRedis } from "./services/redis";

const app = express();
const port = process.env.PORT;

app.get("/api/hello", (req: Request, res: Response) => {
  console.log("Hello World api called");
  res.json({ message: "Hello World" });
});

app.get("/api/healthcheck", (req: Request, res: Response) => {
  console.log("healthcheck api called");
  res.json({
    message: "Healthcheck passed", 
    version: process.env.VERSION, 
    DEPLOY_ENV: process.env.DEPLOY_ENV,
    PROJECT: process.env.PROJECT,
  });
});

app.get("/api/envs", (req: Request, res: Response) => {
  console.log("envs api called");
  res.json({
    version: process.env.VERSION,
    sampleEnvVar1: process.env.SAMPLE_VAR_KEY_1,
    sampleEnvVar2: process.env.SAMPLE_VAR_KEY_2,
    DEPLOY_ENV: process.env.DEPLOY_ENV,
    REDIS_HOST: process.env.REDIS_HOST,
    PROJECT: process.env.PROJECT,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Redis test routes (GET-only for quick testing)
app.get("/api/redis/set", async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key ?? "");
    const value = String(req.query.value ?? "");
    if (!key || !value) return res.status(400).json({ error: "key and value are required" });

    const redis = await getRedis();
    await redis.set(key, value);
    res.json({ message: "OK", key, value });
  } catch (err: any) {
    console.error("Redis set error:", err);
    res.status(500).json({ error: "Redis set failed", details: String(err?.message || err) });
  }
});

app.get("/api/redis/get", async (req: Request, res: Response) => {
  try {
    const key = String(req.query.key ?? "");
    if (!key) return res.status(400).json({ error: "key is required" });

    const redis = await getRedis();
    const value = await redis.get(key);
    res.json({ message: "OK", key, value });
  } catch (err: any) {
    console.error("Redis get error:", err);
    res.status(500).json({ error: "Redis get failed", details: String(err?.message || err) });
  }
});

app.get("/api/redis/ping", async (_req: Request, res: Response) => {
  try {
    const redis = await getRedis();
    const pong = await redis.ping();
    res.json({ message: "OK", pong });
  } catch (err: any) {
    console.error("Redis ping error:", err);
    res.status(500).json({ error: "Redis ping failed", details: String(err?.message || err) });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
