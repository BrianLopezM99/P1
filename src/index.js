import express from "express";
import alumnosRouter from "./routes/alumnos.routes.js";

const app = express();
const port = 3000;
app.use(express.json());

app.use(alumnosRouter);

app.listen(port);
console.log("Servidor corriendo en puerto " + port);
