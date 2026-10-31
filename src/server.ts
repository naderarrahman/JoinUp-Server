import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import 'dotenv/config';

const app: Express = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(`mongodb://${process.env.MONGODB_UN}:${process.env.MONGODB_PASS}@ac-9bgt4br-shard-00-00.tz6lpzg.mongodb.net:27017,ac-9bgt4br-shard-00-01.tz6lpzg.mongodb.net:27017,ac-9bgt4br-shard-00-02.tz6lpzg.mongodb.net:27017/?ssl=true&replicaSet=atlas-njb57t-shard-0&authSource=admin`);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();

if (!mongoClient) {
  throw new Error("MongoDB connection failed");
}

const db = mongoClient.db('JoinUp');
const EventCollections = db.collection('Events');

app.post('/create-event', async (req: Request, res: Response) => {
  console.log(" Data received:", req.body);

  const result = req.body;

  if (!result || Object.keys(result).length === 0) {
    return res.status(400).json({ error: "No data received" });
  }

  const eventData = await EventCollections.insertOne(result);
  console.log("Data inserted to MongoDB:", eventData);

  res.status(201).json({ 
    success: true, 
    message: "Event created", 
    data: result 
  });
});

app.get('/', (req: Request, res: Response) => {
  res.send('JoinUs Server is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});