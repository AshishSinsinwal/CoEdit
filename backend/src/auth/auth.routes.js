import express from "express";
import { register, login , getMe , googleLogin} from "./auth.controller.js";

import { authMiddleware } from "../auth/auth.middleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.post("/google" , googleLogin);

export default router;
