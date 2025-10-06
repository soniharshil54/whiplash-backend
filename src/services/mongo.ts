// src/services/mongo.ts

import { MongoClient, Db } from "mongodb";

// MongoDB singleton instance
let mongoClient: MongoClient | null = null;

async function getMongoDb(): Promise<Db> {
  console.log("Getting MongoDB client...");
  // The driver handles connection pooling. If a client instance exists, we reuse it.
  if (mongoClient) {
    // The client.db() method without arguments uses the database specified in the connection string.
    const dbName = process.env.MONGODB_DATABASE_NAME;
    console.log('dbName if', dbName);
    return mongoClient.db(dbName);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI environment variable is not defined.");
  }
  
  console.log("MONGODB_URI found, attempting to connect...");

  // The modern driver does not require extra options for basic connections.
  const client = new MongoClient(uri);

  client.on("open", () => console.log("MongoDB connection ready."));
  client.on("error", (err: unknown) => console.error("MongoDB error:", err));
  client.on("close", () => console.log("MongoDB connection closed."));
  
  try {
    await client.connect();
    console.log("MongoDB client connected successfully.");
    mongoClient = client;
    const dbName = process.env.MONGODB_DATABASE_NAME;
    console.log('dbName try', dbName);
    return client.db(dbName);
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    // Propagate the error to the route handler
    throw err;
  }
}

async function shutdownMongo() {
  console.log("Shutting down MongoDB...");
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null; // Clear the instance
  }
}

export { getMongoDb, shutdownMongo };