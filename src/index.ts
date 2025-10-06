import express, { Request, Response } from "express";
import { getRedis, shutdownRedis } from "./services/redis";
import { getMongoDb, shutdownMongo } from "./services/mongo";

const app = express();
const port = process.env.PORT;

/* ... other routes like /api/hello, /api/healthcheck, etc. ... */
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
    note: '1104'
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
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DATABASE_NAME: process.env.MONGODB_DATABASE_NAME,
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// Redis test routes
/* ... your existing redis routes ... */
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

// ─────────────────────────────────────────────────────────────────────────────
// MongoDB test routes
app.get("/api/mongo/ping", async (_req: Request, res: Response) => {
  try {
    const db = await getMongoDb();
    const pingResult = await db.admin().command({ ping: 1 });
    res.json({ message: "OK", ...pingResult });
  } catch (err: any) {
    console.error("MongoDB ping error:", err);
    res.status(500).json({ error: "MongoDB ping failed", details: String(err?.message || err) });
  }
});

// ✨ NEW: MongoDB route to set a record
// Example URL: /api/mongo/set?collection=users&key=user1&value=JaneDoe
app.get("/api/mongo/set", async (req: Request, res: Response) => {
  try {
    const collectionName = String(req.query.collection);
    const key = String(req.query.key);
    const value = String(req.query.value);

    if (!collectionName || !key || !value) {
      return res.status(400).json({ error: "'collection', 'key', and 'value' are required query parameters" });
    }

    const db = await getMongoDb();
    const collection = db.collection(collectionName);

    // Use updateOne with upsert to create the document if it doesn't exist, or update it if it does.
    const result = await collection.updateOne(
      { key: key }, // Filter to find the document by its key
      { $set: { value: value } }, // The data to set (we only update the value)
      { upsert: true } // This option creates the document if it's not found
    );

    res.json({ message: "Record set successfully", result });
  } catch (err: any) {
    console.error("MongoDB set error:", err);
    res.status(500).json({ error: "MongoDB set failed", details: String(err?.message || err) });
  }
});

// ✨ NEW: MongoDB route to get a record
// Example URL: /api/mongo/get?collection=users&key=user1
app.get("/api/mongo/get", async (req: Request, res: Response) => {
  try {
    const collectionName = String(req.query.collection);
    const key = String(req.query.key);

    if (!collectionName || !key) {
      return res.status(400).json({ error: "'collection' and 'key' are required query parameters" });
    }

    const db = await getMongoDb();
    const collection = db.collection(collectionName);
    
    // Find a single document that matches the key
    const document = await collection.findOne({ key: key });

    if (!document) {
      return res.status(404).json({ message: "Record not found" });
    }

    res.json({ message: "Record found", document });
  } catch (err: any) {
    console.error("MongoDB get error:", err);
    res.status(500).json({ error: "MongoDB get failed", details: String(err?.message || err) });
  }
});

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Centralized graceful shutdown logic
/* ... your existing shutdown logic ... */
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      // Close all database connections
      await Promise.all([
        shutdownRedis(),
        shutdownMongo()
      ]);
      console.log("Database connections closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  });
}

// Listen for termination signals
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // It's often recommended to exit on uncaught exceptions
  process.exit(1); 
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});