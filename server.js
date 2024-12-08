import express from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cron from "node-cron";
import { deleteExpiredTrashedFiles } from "./controllers/trashCntroller.js";
import helmet from "helmet"
import cors from "cors"
import path from "path";

import multer from "multer";

const port = process.env.PORT || 8800;
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer();
app.use(upload.none()); 
app.use(cookieParser());
app.use(helmet());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  exposedHeaders: ["X-Auth-Token", "Authorization"],
}));




cron.schedule("0 0 * * *", async () => {
  console.log("Running scheduled task to delete expired trashed files...");
  try {
    await deleteExpiredTrashedFiles();
    console.log("Expired trashed files deleted successfully.");
  } catch (error) {
    console.error("Error deleting expired trashed files:", error.message);
  }
});

// Routes
import route from "./routes/index.js";
app.use("/", route);

app.get("/", (req, res) => {
  res.send("Hello from server");
});

// middleware
import error from "./middleware/error.js";
import { fileURLToPath } from "url";
app.use(error);

app.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
