import { Router } from "express";
import {
    moveToTrash,
    getTrashedFiles,
    deleteExpiredTrashedFiles,
    restoreFromTrash,
    deleteFileFromTrash,
  } from "../controllers/trashCntroller.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = Router()
router.post("/:docId",isAuthenticated, moveToTrash);
router.get("/",isAuthenticated, getTrashedFiles);
router.delete("/expired",isAuthenticated, deleteExpiredTrashedFiles);
router.post("/restore/:trashId",isAuthenticated, restoreFromTrash);
router.delete("/delete/:trashId",isAuthenticated, deleteFileFromTrash);


export default router