import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import todosRouter from "./routes/todos.routes.js";

dotenv.config();

const app = express();

// URL REAL del frontend
const corsOptions = {
  origin: [
    "",
    "http://localhost:4321"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/todos", todosRouter);

const port = process.env.PORT || 3001;

// IMPORTANTE PARA RENDER
app.listen(port, "0.0.0.0", () => {
  console.log(`API escuchando en puerto ${port}`);
});