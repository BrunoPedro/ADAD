import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/", async (req, res) => {
    const page = parseInt(req.query.page) || 1; 
    const pageSize = 20;
    const skip = (page - 1) * pageSize; 
    const limit = pageSize; 
  
    const search = req.query.search || ''; 
  
    const searchQuery = search ? { comment: { $regex: search, $options: 'i' } } : {};
  
    try {
      console.log(`Searching comments from the database... Page ${page} with search: ${search || 'None'}`);
      
      const count = await db.collection("comments").countDocuments(searchQuery);
  
      const results = await db.collection("comments")
        .find(searchQuery)
        .skip(skip)  
        .limit(limit)  
        .toArray();
  
      const totalPages = Math.ceil(count / limit); 
      const nextPage = page < totalPages ? `${req.protocol}://${req.get('host')}/comments/?page=${page + 1}` : null;
      const prevPage = page > 1 ? `${req.protocol}://${req.get('host')}/comments/?page=${page - 1}` : null;
  
      const response = {
        info: {
          count,           
          pages: totalPages,
          next: nextPage,  
          prev: prevPage,  
        },
        results,          
      };
  
      console.log("Comments fetched successfully:", results);
      res.status(200).send(response); 
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).send({ error: "Error fetching comments", details: error });
    }
  });
  

// POST /comments 
router.post("/", async (req, res) => {
    const { book_id, comment, user_id } = req.body;

    if (!book_id || !comment || !user_id) {
        return res.status(400).send({ message: "book_id, comment, and user_id are required." });
    }

    try {
        const lastComment = await db.collection("comments").find().sort({ _id: -1 }).limit(1).toArray();

        const newId = lastComment.length > 0 ? lastComment[0]._id + 1 : 1;

        const newComment = {
            _id: newId, 
            user_id: parseInt(user_id),
            book_id: parseInt(book_id),
            comment,
            date: Date.now(), 
        };

        const result = await db.collection("comments").insertOne(newComment);

        res.status(201).send({
            message: "Comment added successfully",
            comment: newComment,
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).send({ error: "Error adding comment", details: error });
    }
});

router.delete("/:id", async (req, res) => {
    const commentId = parseInt(req.params.id); 

    if (isNaN(commentId)) {
        return res.status(400).send({ message: "Invalid _id. It should be a valid integer." });
    }

    try {
        const result = await db.collection("comments").deleteOne({ _id: commentId });

        if (result.deletedCount === 0) {
            return res.status(404).send({ message: "Comment not found with the provided _id." });
        }

        res.status(200).send({ message: "Comment deleted successfully." });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).send({ error: "Error deleting comment", details: error });
    }
});



export default router;