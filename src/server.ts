import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
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
const JoinEventCollections = db.collection('JoinedEvents');

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

app.post('/join-event', async (req: Request, res: Response) => {
  console.log(" Data received:", req.body);

  const result = req.body;

  if (!result || Object.keys(result).length === 0) {
    return res.status(400).json({ error: "No data received" });
  }

  const eventData = await JoinEventCollections.insertOne(result);
  console.log("Data inserted to MongoDB:", eventData);

  res.status(201).json({ 
    success: true, 
    message: "Event created", 
    data: result 
  });
});

app.get('/get-events', async (req: Request, res: Response) => {
  try {
    const events = await EventCollections.find({}).toArray();
    res.json(events); 
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.get('/get-events/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (!ObjectId.isValid(id as string)) {
      return res.status(400).json({ error: "Invalid Event ID format" });
    }
    const event = await EventCollections.findOne({ _id: new ObjectId(id as string) });
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json(event); 
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

app.get('/joined-events/:email', async (req: Request, res: Response) => {
  const { email } = req.params;
  try {
    const joinedEvents = await JoinEventCollections
      .find({ userEmail: email })
      .sort({ eventDate: 1 }) 
      .toArray();

    res.status(200).json(joinedEvents);
  } catch (error) {
    console.error("Error fetching joined events:", error);
    res.status(500).json({ error: "Failed to fetch joined events" });
  }
});

app.delete('/leave-event/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (!ObjectId.isValid(id as string)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    const result = await JoinEventCollections.deleteOne({ _id: new ObjectId(id as string) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Join record not found" });
    }

    res.status(200).json({ success: true, message: "Successfully left the event" });
  } catch (error) {
    console.error("Error leaving event:", error);
    res.status(500).json({ error: "Failed to leave event" });
  }
});

app.post('/check-join-status', async (req: Request, res: Response) => {
  const { eventId, userEmail } = req.body;

  if (!eventId || !userEmail) {
    return res.status(400).json({ error: "Missing eventId or userEmail" });
  }

  try {
    const existingRecord = await JoinEventCollections.findOne({ 
      eventId: eventId, 
      userEmail: userEmail 
    });

    if (existingRecord) {
      return res.status(200).json({ 
        isJoined: true, 
        recordId: existingRecord._id 
      });
    }

    res.status(200).json({ isJoined: false });
  } catch (error) {
    console.error("Error checking join status:", error);
    res.status(500).json({ error: "Failed to check status" });
  }
});



app.get('/', (req: Request, res: Response) => {
  res.send('JoinUs Server is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});