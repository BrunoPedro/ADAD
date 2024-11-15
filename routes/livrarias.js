import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import { point, booleanPointInPolygon } from '@turf/turf';

const router = express.Router();

// GET /livrarias 
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1; 
  const pageSize = 20;  
  const skip = (page - 1) * pageSize;  

  try {
    const results = await db.collection("livrarias")
      .find({})
      .skip(skip) 
      .limit(pageSize)  
      .toArray();

    const totalLivrarias = await db.collection("livrarias").countDocuments();

    const totalPages = Math.ceil(totalLivrarias / pageSize);

    const nextPage = page < totalPages ? `${req.protocol}://${req.get('host')}/livrarias?page=${page + 1}` : null;
    const prevPage = page > 1 ? `${req.protocol}://${req.get('host')}/livrarias?page=${page - 1}` : null;

    const response = {
      info: {
        count: totalLivrarias,
        pages: totalPages,
        next: nextPage,
        prev: prevPage,
      },
      results: results,
    };

    console.log("Livrarias encontradas com sucesso:", results);
    res.status(200).send(response);
  } catch (error) {
    console.error("Erro ao buscar livrarias:", error);
    res.status(500).send({ error: "Falha ao buscar livrarias", details: error });
  }
});


// PUT /livrarias/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  if (!updatedData || Object.keys(updatedData).length === 0) {
    return res.status(400).send({ message: "Nenhum dado para atualizar" });
  }

  try {
    const result = await db.collection("livrarias").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Livraria não encontrada" });
    }

    res.status(200).send({ message: "Livraria atualizada com sucesso", result });
  } catch (error) {
    console.error("Erro ao atualizar livraria:", error);
    res.status(500).send({ error: "Erro ao atualizar livraria", details: error });
  }
});

// POST /livrarias/perto - Busca livrarias próximas a uma rota
router.post("/perto", async (req, res) => {
  const { rota, distanciaLimite } = req.body;

  if (!rota || !Array.isArray(rota)) {
    return res.status(400).send({ error: "Rota inválida ou ausente" });
  }

  try {
    const livrarias = await db.collection("livrarias").find({}).toArray();
    const limite = distanciaLimite || 0.5; 
    const turf = await import("@turf/turf");
    const linhaDaRota = turf.lineString(rota);

    const livrariasProximas = livrarias.filter((livraria) => {
      if (!livraria.geometry || !livraria.geometry.coordinates) return false;
      const ponto = turf.point(livraria.geometry.coordinates);
      const distancia = turf.pointToLineDistance(ponto, linhaDaRota, { units: "kilometers" });
      return distancia <= limite;
    });

    res.status(200).send(livrariasProximas);
  } catch (error) {
    console.error("Erro ao buscar livrarias próximas:", error);
    res.status(500).send({ error: "Erro ao buscar livrarias próximas", details: error });
  }
});



// DELETE /livrarias/:id - Remove uma livraria pelo ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.collection("livrarias").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Livraria não encontrada" });
    }

    res.status(200).send({ message: "Livraria removida com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar livraria:", error);
    res.status(500).send({ error: "Erro ao apagar livraria", details: error });
  }
});

//Rota
router.get('/livrarias_em_rota', async(req, res) =>{

try{
  const livrariasCollection = db.collection('livrarias');

  await livrariasCollection.createIndex({"geometry.coordinates" : "2d"})

  const results = await livrariasCollection.find({
    "geometry.coordinates": {
    $geoIntersects: {
    $geometry: {
    type : "Polygon",
    coordinates : [
    [
    [ -9.14217296415889 , 38.7155597377788 ] , [ -9.14632734020411 , 38.7202915388439 ] , [ -9.14875439274829 , 38.7208771016563 ]
  , [ -9.1621026515977 , 38.7236706345087 ], [ -9.14217296415889 , 38.7155597377788 ]]
    ]
    }
    }
    }
  }).toArray();

  res.status(200).send(results);
}
catch(err){res.status(500).send({error : err.message})}

}
);



// POST /livrarias/check-point 
router.post("/check-point", async (req, res) => {
  const { point: inputPoint } = req.body;

  if (!inputPoint || inputPoint.length !== 2 || isNaN(inputPoint[0]) || isNaN(inputPoint[1])) {
    return res.status(400).send({ message: "Ponto inválido. Deve ser [longitude, latitude]." });
  }

  try {
    const polygon = {
      type: "Polygon",
      coordinates: [
        [
          [-9.14217296415889, 38.7155597377788],
          [-9.14632734020411, 38.7202915388439],
          [-9.14875439274829, 38.7208771016563],
          [-9.1621026515977, 38.7236706345087],
          [-9.14217296415889, 38.7155597377788] 
        ]
      ]
    };

    const geoJsonPoint = point(inputPoint);

    const isInside = booleanPointInPolygon(geoJsonPoint, polygon);

    if (isInside) {
      return res.status(200).send({ message: "User está dentro da feira do livro" });
    } else {
      return res.status(200).send({ message: "User está fora da feira do livro" });
    }

  } catch (error) {
    console.error("Erro ao processar o pedido:", error);

    return res.status(500).send({ error: "Erro ao processar o pedido", details: error.message || error });
  }
});

export default router;
