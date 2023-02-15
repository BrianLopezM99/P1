import { pool } from "../db/db.js";

export const getCiclosAlumnosController = async (req, res) => {
  const { id_ciclo } = req.body;
  console.log(id_ciclo);

  try {
    const [alumnosResult] = await pool.query(
      `SELECT ga.id_alumno, a.nombre, p.plantel, n.nivel, ga.id_usuario_ultimo_cambio, u.nombre_completo AS vendedora 
      FROM gruposalumnos ga
      LEFT JOIN grupos g    ON g.id_grupo = ga.id_grupo
      LEFT JOIN niveles n   ON n.id_nivel = g.id_nivel 
      LEFT JOIN usuarios u  ON u.id_usuario = ga.id_usuario_ultimo_cambio
      LEFT JOIN alumnos a   ON a.id_alumno = ga.id_alumno 
      LEFT JOIN planteles p ON p.id_plantel = g.id_plantel 
      LEFT JOIN ciclos c    ON c.id_ciclo = g.id_ciclo
      WHERE g.id_ciclo = 234
      AND ga.id_alumno NOT IN (
        SELECT ga2.id_alumno 
          FROM gruposalumnos ga2 
          LEFT JOIN grupos g2 ON g2.id_grupo = ga2.id_grupo
        LEFT JOIN ciclos c2 ON c2.id_ciclo = g2.id_ciclo
        WHERE c2.fecha_inicio_ciclo < c.fecha_inicio_ciclo
        and c2.ciclo NOT LIKE '%INVER%'
        AND c2.ciclo NOT LIKE '%CAMBIOS%'
        AND c2.ciclo NOT LIKE '%INDUCCION%'
        and c2.ciclo not like '%EXCI%'
        AND c2.ciclo NOT LIKE '%CLASES%'
      );
      `,
      [id_ciclo]
    );

    console.log(alumnosResult);

    const alumnos = await alumnosResult.map((row) => ({
      id_alumno: row.id_alumno,
      nombre: row.nombre,
      plantel: row.plantel,
      nivel: row.nivel,
      id_usuario_ultimo_cambio: row.id_usuario_ultimo_cambio,
      vendedora: row.vendedora,
    }));

    for (let alumno of alumnos) {
      const ciclosResult = await pool.query(
        `SELECT COUNT(DISTINCT c2.id_ciclo) as ciclos 
    FROM gruposalumnos ga2 
    LEFT JOIN grupos g2 ON g2.id_grupo = ga2.id_grupo
    LEFT JOIN ciclos c2 ON c2.id_ciclo = g2.id_ciclo
    LEFT JOIN ciclos c ON c.id_ciclo = ?
    WHERE ga2.id_alumno = ? AND c2.fecha_inicio_ciclo >= c.fecha_inicio_ciclo`,
        [id_ciclo, alumno.id_alumno]
      );

      alumno.ciclos = ciclosResult[0][0].ciclos;
    }

    res.json({ alumnos });
  } catch (error) {
    res.status(500).json({ error: "Error de servidor" });
    console.log(error);
  }
};
