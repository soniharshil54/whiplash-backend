import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/api/hello", (req: Request, res: Response) => {
  console.log("Hello World api called");
  res.json({ message: "Hello World" });
});

app.get("/api/healthcheck", (req: Request, res: Response) => {
  console.log("healthcheck api called");
  res.json({
    message: "Healthcheck passed", 
    version: '1.0.11', 
    sampleEnvVar1: process.env.SAMPLE_VAR_KEY_1,
    sampleEnvVar2: process.env.SAMPLE_VAR_KEY_2,
    DEPLOY_ENV: process.env.DEPLOY_ENV,
    PROJECT: process.env.PROJECT,
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
