import { Router } from "express";
import { login, logout, register, updatePassword, updateUser,fetchMyProfile,getAllUsers, toggleActiveUser, forgetPassword, resetPassword } from "../controllers/userController.js";
import { isAuthenticated, authorizedAdmin } from "../middleware/auth.js";
import upload from "../utils/multer.js";

const router = Router()

router.post("/register", register)
router.post("/login",login)
router.get("/logout",isAuthenticated,logout)
router.post("/forget/password", forgetPassword )
router.post("/reset/password", resetPassword )
router.put("/update",isAuthenticated,updateUser)
router.put("/update/password",isAuthenticated,updatePassword)
router.get("/me",isAuthenticated,fetchMyProfile)
router.get("/all",isAuthenticated,authorizedAdmin, getAllUsers)
router.post("/deactivate/:userId",isAuthenticated, authorizedAdmin, toggleActiveUser)


export default router