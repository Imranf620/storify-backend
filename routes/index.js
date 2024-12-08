import { Router } from "express";
import userRoute from "./userRoute.js"
import filesRoute from "./filesRoute.js"
import trashRoute from "./trashRoute.js"
import paymentRoute from "./paymentRoute.js"
import { getPresignedUrl } from "../controllers/s3Service.js";
import { isAuthenticated } from "../middleware/auth.js";


const router = Router()

router.use("/api/v1/user",userRoute )
router.use("/api/v1/files",filesRoute )
router.use("/api/v1/trash",trashRoute )
router.use("/api/v1/payment",paymentRoute )
router.post("/api/v1/pre-ass-url",isAuthenticated, getPresignedUrl)


export default router