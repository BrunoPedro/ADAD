import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

//return first 50 documents from books collection
router.get("/", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 10; 
        const skip = (page - 1) * limit; 

        
        const comments = await db.collection("comments")
            .find({})
            .skip(skip)
            .limit(limit)
            .toArray();

        
        const totalComments = await db.collection("comments").countDocuments();
        const totalPages = Math.ceil(totalComments / limit);

       
        const response = {
            comments,
            pagination: {
                count: totalComments,
                pages: totalPages,
                currentPage: page,
                next: page < totalPages ? `/?page=${page + 1}&limit=${limit}` : null,
                prev: page > 1 ? `/?page=${page - 1}&limit=${limit}` : null,
            },
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving comments", error: error.message });
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