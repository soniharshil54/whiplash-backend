import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/api/hello", (req: Request, res: Response) => {
  console.log("Hello World api called");
  res.json({ message: "Hello World" });
});

app.get("/api/healthcheck", (req: Request, res: Response) => {
  console.log("healthcheck api called");
  res.json({ message: "Healthcheck passed", version: '1.0.10' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
