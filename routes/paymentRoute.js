import { Router } from "express";
import { getPricing, updatePackage } from "../controllers/paymentController.js";
import { isAuthenticated } from "../middleware/auth.js";



const router = Router()

router.post("/",isAuthenticated, updatePackage)
router.get("/", getPricing)


export default router