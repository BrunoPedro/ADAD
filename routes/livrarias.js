import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";
import { geometry } from "@turf/turf";

const router = express.Router();

// GET /livrarias - Retorna as primeiras 50 livrarias
router.get("/", async (req, res) => {
  try {
    console.log("Buscando livrarias no banco de dados...");
    const results = await db.collection("livrarias").find({}).limit(50).toArray();
    console.log("Livrarias encontradas com sucesso:", results);
    res.status(200).send(results);
  } catch (error) {
    console.error("Erro ao buscar livrarias:", error);
    res.status(500).send({ error: "Falha ao buscar livrarias" });
  }
});

// PUT /livrarias/:id - Atualiza uma livraria pelo ID
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
    const limite = distanciaLimite || 0.5; // Distância limite em km
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

// GET /livrarias/freguesia/:freguesia - Filtra livrarias por freguesia
router.get("/freguesia/:freguesia", async (req, res) => {
  const { freguesia } = req.params;

  try {
    const livrarias = await db.collection("livrarias").find({ "properties.FREGUESIA": freguesia }).toArray();
    res.status(200).send(livrarias);
  } catch (error) {
    console.error("Erro ao buscar livrarias por freguesia:", error);
    res.status(500).send({ error: "Erro ao buscar livrarias", details: error });
  }
});

// GET /livrarias/nome/:nome - Busca livrarias pelo nome
router.get("/nome/:nome", async (req, res) => {
  const { nome } = req.params;

  try {
    const livrarias = await db.collection("livrarias").find({ "properties.INF_NOME": { $regex: nome, $options: "i" } }).toArray();
    res.status(200).send(livrarias);
  } catch (error) {
    console.error("Erro ao buscar livrarias pelo nome:", error);
    res.status(500).send({ error: "Erro ao buscar livrarias", details: error });
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
    res.status(500).send({ error: "Erro ao deletar livraria", details: error });
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



// Rota
router.get('/livraria_na_feira_livro/:id', async (req, res) => {
  try {
    const livrariasCollection = db.collection('livrarias');

    // Ensure that an index is created for geo queries
    await livrariasCollection.createIndex({ "geometry.coordinates": "2d" });

    // Define the polygon coordinates (example)
    const polygon = [
      [
        [-9.14217296415889, 38.7155597377788],
        [-9.14632734020411, 38.7202915388439],
        [-9.14875439274829, 38.7208771016563],
        [-9.1621026515977, 38.7236706345087],
        [-9.14217296415889, 38.7155597377788]
      ]
    ];

    const libraryId = parseInt(req.params.id); // For numeric ID
    const library = await livrariasCollection.findOne({ _id: libraryId });

    if (!library) {
      return res.status(404).send({ message: "Library not found." });
    }

    // Get the coordinates of the specific library
    const libraryCoordinates = library.geometry.coordinates;

    // Check if the library's coordinates are inside the polygon
    const isInside = await livrariasCollection.findOne({
      "geometry.coordinates": {
        $geoWithin: {
          $geometry: {
            type: "Polygon",
            coordinates: polygon
          }
        }
      },
      _id: libraryId // Ensure we're checking for the specific library
    });

    // Return the appropriate message
    if (isInside) {
      res.status(200).send({ message: "The library is inside the polygon." });
    } else {
      res.status(200).send({ message: "The library is outside the polygon." });
    }

  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});


export default router;
