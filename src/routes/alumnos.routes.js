import { Router } from "express";
import { pool } from "../db/db.js";
import { getCiclosAlumnosController } from "../controllers/alumnos.controllers.js";

const router = Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query(`SELECT 1+1 AS result`);
  res.send(rows);
});

router.post("/ciclos-de-alumnos", getCiclosAlumnosController);

export default router;
