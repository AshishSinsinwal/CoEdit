import express from "express";
import { authMiddleware } from "../auth/auth.middleware.js";
import { createDocument, listDocuments , addCollaborator , deleteDocument , getCollaborators , deleteCollaborator} from "./document.controller.js";
import { get } from "mongoose";

const router = express.Router();

router.post("/", authMiddleware, createDocument);
router.get("/", authMiddleware, listDocuments);
router.get("/:id/collaborators", authMiddleware, getCollaborators);
router.post("/:id/collaborators", authMiddleware, addCollaborator);
router.delete("/:id/collaborators/:email" , authMiddleware , deleteCollaborator);
router.delete("/:id" , authMiddleware, deleteDocument);

export default router;
