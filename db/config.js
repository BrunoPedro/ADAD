import { MongoClient } from "mongodb";

const connectionString = "<Your string>";
const client = new MongoClient(connectionString);

let db;

try {
  console.log("A conectar à base de dados...");
  const conn = await client.connect();
  console.log("Conexão à base de dados com sucesso.");
  db = conn.db("projeto"); // Connect to the database
} catch (e) {
  console.error("Falha na conexão à base de dados", e);
  process.exit(1); // Exit the process if the database connection fails
}

export default db;
