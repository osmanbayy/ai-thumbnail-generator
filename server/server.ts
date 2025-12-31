import express, { Request, Response } from 'express';
import "dotenv/config";
import cors from "cors";
import connectToDatabase from './config/database.js';
import session from "express-session"
import MongoStore from "connect-mongo"
import AuthRoutes from './routes/AuthRoutes.js';

declare module 'express-session' {
  interface SessionData {
    isLoggedIn: boolean;
    userId: string;
  }
}

await connectToDatabase();

const app = express();

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
}));

app.use(session({
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },   // 7 days
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI as string,
    collectionName: "sessions",
  })
}))

app.get('/', (req: Request, res: Response) => {
  res.send('Server is Live!');
});

app.use("/api/auth", AuthRoutes);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});