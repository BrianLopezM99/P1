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
      WHERE g.id_ciclo = ?
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

    //console.log("RES: ", alumnosResult);

    const alumnos = await alumnosResult.map((row) => ({
      id_alumno: row.id_alumno,
      nombre: row.nombre,
      plantel: row.plantel,
      nivel: row.nivel,
      id_usuario_ultimo_cambio: row.id_usuario_ultimo_cambio,
      vendedora: row.vendedora,
    }));

    //console.log("ALUMNO: ", alumnos);

    const alumnoId = await alumnosResult.map((row) => row.id_alumno);

    // Obtener información de los abandonos por nivel
    const [abandonosPorNivelResult] = await pool.query(
      `SELECT n.nivel, COUNT(DISTINCT ga.id_alumno) AS abandonos 
      FROM niveles n 
      LEFT JOIN grupos g ON g.id_nivel = n.id_nivel 
      LEFT JOIN ciclos c ON c.id_ciclo = g.id_ciclo 
      LEFT JOIN gruposalumnos ga ON ga.id_grupo = g.id_grupo AND ga.id_alumno IN (?) 
      WHERE c.fecha_fin_ciclo IS NOT NULL 
      AND c.id_ciclo < ?
      GROUP BY n.nivel`,
      [alumnoId, id_ciclo]
    );

    const ciclosResult = await pool.query(
      `SELECT ga.id_alumno, COUNT(DISTINCT c2.id_ciclo) as ciclos 
      FROM gruposalumnos ga 
      LEFT JOIN grupos g ON g.id_grupo = ga.id_grupo 
      LEFT JOIN ciclos c2 ON c2.id_ciclo = g.id_ciclo 
      WHERE ga.id_alumno IN (?)
      AND c2.fecha_inicio_ciclo > (
        SELECT fecha_inicio_ciclo FROM ciclos WHERE id_ciclo = ?
      ) 
      AND c2.ciclo NOT LIKE '%INVER%' 
      AND c2.ciclo NOT LIKE '%CAMBIOS%' 
      AND c2.ciclo NOT LIKE '%INDUCCION%' 
      AND c2.ciclo NOT LIKE '%EXCI%' 
      AND c2.ciclo NOT LIKE '%CLASES%' 
      GROUP BY ga.id_alumno`,
      [alumnoId, id_ciclo]
    );

    const [abandonosPorVendedoraResult] = await pool.query(
      `SELECT u.nombre_completo AS vendedora, a.nombre AS alumno, a.id_alumno, COUNT(DISTINCT ga.id_alumno) AS abandonos 
      FROM gruposalumnos ga 
      LEFT JOIN grupos g ON g.id_grupo = ga.id_grupo 
      LEFT JOIN ciclos c ON c.id_ciclo = g.id_ciclo 
      LEFT JOIN usuarios u ON u.id_usuario = ga.id_usuario_ultimo_cambio
      LEFT JOIN alumnos a ON a.id_alumno = ga.id_alumno
      WHERE c.fecha_fin_ciclo IS NOT NULL 
      AND c.id_ciclo < ?
      AND ga.id_alumno IN (?)
      GROUP by vendedora, alumno, a.id_alumno`,
      [id_ciclo, alumnoId]
    );
    
    const abandonosPorVendedora = {};
    abandonosPorVendedoraResult.forEach((row) => {
      abandonosPorVendedora[row.vendedora] = row.abandonos;
      console.log(row)
    });

    console.log(abandonosPorNivelResult)
    const abandonosPorNivel = {};
    abandonosPorNivelResult.forEach((row) => {
      abandonosPorNivel[row.nivel] = row.abandonos;
      console.log(row)
    });

    const ciclosPorAlumno = [];
    ciclosResult[0].map((row) => {
      ciclosPorAlumno[row.id_alumno] = row.ciclos;
    });

    const alumnosConCiclos = alumnos.map((alumno) => ({
      ...alumno,
      ciclos: ciclosPorAlumno[alumno.id_alumno] || 0,
    }));

    res.json({alumnosConCiclos, abandonosPorVendedoraResult, abandonosPorNivelResult});
  } catch (error) {
    res.status(500).json({ error: "Error de servidor" });
    console.log(error);
  }
};
