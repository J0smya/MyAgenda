import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import todosRouter from "./routes/todos.routes.js";

dotenv.config();

const app = express();

// CORRECCIÓN AQUÍ: Definimos explícitamente quién puede entrar
const corsOptions = {
  origin: ['https://myagenda-2.onrender.com', 'http://localhost:4321'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/todos", todosRouter);

// El puerto lo decide Render, pero si no, usa el 3001
const port = process.env.PORT || 3001;

app.listen(port, () => console.log(`API escuchando en puerto ${port}`));