import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import contactRouter from "./routes/contact";
dotenv.config();

const app: Express = express();
app.use(express.json());
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use("/", contactRouter);


export default app;