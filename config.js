import { MongoClient } from "mongodb";

const connectionString = "mongodb+srv://bfcpo:Kurokoakuma0318!@clusterproject.cyzkb.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(connectionString);

let db;

try {
  console.log("Connecting to the database...");
  const conn = await client.connect();
  console.log("Database connection successful.");
  db = conn.db("projeto"); // Connect to the database
} catch (e) {
  console.error("Failed to connect to the database", e);
  process.exit(1); // Exit the process if the database connection fails
}

export default db;
