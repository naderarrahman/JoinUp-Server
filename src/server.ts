import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import { createRemoteJWKSet, jwtVerify } from "jose";

const app: Express = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(`mongodb://${process.env.MONGODB_UN}:${process.env.MONGODB_PASS}@ac-9bgt4br-shard-00-00.tz6lpzg.mongodb.net:27017,ac-9bgt4br-shard-00-01.tz6lpzg.mongodb.net:27017,ac-9bgt4br-shard-00-02.tz6lpzg.mongodb.net:27017/?ssl=true&replicaSet=atlas-njb57t-shard-0&authSource=admin`);

let EventCollections: any;
let JoinEventCollections: any;

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const initDB = async () => {
  if (EventCollections) return;
  const mongoClient = await connectToMongoDB();
  if (!mongoClient) {
    throw new Error("MongoDB connection failed");
  }
  const db = mongoClient.db('JoinUp');
  EventCollections = db.collection('Events');
  JoinEventCollections = db.collection('JoinedEvents');
};

app.use(async (req, res, next) => {
  await initDB();
  next();
});

const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ msg: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ msg: "Unauthorized: Invalid token format" });
    }

    const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
    );

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: process.env.CLIENT_URL as string,
      audience: process.env.CLIENT_URL as string,
    });

    (req as any).user = payload;
    next();
  } catch (error: any) {
    return res.status(401).json({ msg: "Unauthorized: Token verification failed" });
  }
};

// Private Routes

app.post('/create-event', verifyToken, async (req: Request, res: Response) => {
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

app.post('/join-event', verifyToken, async (req: Request, res: Response) => {
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

app.get('/joined-events/:email', verifyToken, async (req: Request, res: Response) => {
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

app.get('/my-events/:email', verifyToken, async (req: Request, res: Response) => {
  const { email } = req.params;
  try {
    const myEvents = await EventCollections
      .find({ organizerEmail: email })
      .sort({ createdAt: -1 }) 
      .toArray();
      
    res.status(200).json(myEvents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch your events" });
  }
});

app.delete('/delete-event/:id', verifyToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userEmail } = req.body; 

  try {
    if (!ObjectId.isValid(id as string)) {
      return res.status(400).json({ error: "Invalid Event ID" });
    }

    const event = await EventCollections.findOne({ _id: new ObjectId(id as string) });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.organizerEmail !== userEmail) {
      return res.status(403).json({ error: "Unauthorized to delete this event" });
    }

    await EventCollections.deleteOne({ _id: new ObjectId(id as string) });

    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

app.delete('/leave-event/:id', verifyToken, async (req: Request, res: Response) => {
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

app.post('/check-join-status', verifyToken, async (req: Request, res: Response) => {
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

app.patch('/update-event/:id', verifyToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userEmail, ...updatedData } = req.body; 

  try {
    if (!ObjectId.isValid(id as string)) {
      return res.status(400).json({ error: "Invalid Event ID" });
    }

    const event = await EventCollections.findOne({ _id: new ObjectId(id as string) });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.organizerEmail !== userEmail) {
      return res.status(403).json({ error: "Unauthorized: You can only edit your own events" });
    }

    delete updatedData._id;

    const result = await EventCollections.updateOne(
      { _id: new ObjectId(id as string) },
      { $set: updatedData } 
    );

    if (result.modifiedCount === 0) {
      return res.status(200).json({ success: true, message: "No changes made" });
    }

    res.status(200).json({ 
      success: true, 
      message: "Event updated successfully",
      data: { ...event, ...updatedData } 
    });

  } catch (error) {
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Public Routes

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

app.get('/recent-events', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString();

    const recentEvents = await EventCollections
      .find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .limit(6)
      .toArray();

    res.status(200).json(recentEvents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recent events" });
  }
});

app.get('/past-events', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString();
    
    const pastEvents = await EventCollections
      .find({ eventDate: { $lt: today } })
      .sort({ eventDate: -1 })
      .limit(7) 
      .toArray();

    res.status(200).json(pastEvents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch past events" });
  }
});

app.get('/next-event', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString();
    const nextEvent = await EventCollections
      .find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .limit(1)
      .toArray();

    if (nextEvent.length === 0) {
      return res.status(200).json(null);
    }

    res.status(200).json(nextEvent[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch next event" });
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('JoinUs Server is running!');
});

if (!process.env.VERCEL) {
  initDB().then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  });
}

export default app;