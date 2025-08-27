import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 3000;

app.get("/api/hello", (req: Request, res: Response) => {
  res.json({ message: "Hello World" });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
