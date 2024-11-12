import express from "express";
import db from "../db/config.js";

const router = express.Router();

// Return the first 50 documents from the movies collection
router.get("/", async (req, res) => {
  try {
    console.log("Fetching movies from the database...");

    const results = await db.collection("movie")
      .find({})
      .limit(50)
      .toArray();

    console.log("Movies fetched successfully:", results);

    res.status(200).send(results);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).send({ error: "Failed to fetch movies" });
  }
});

export default router;
