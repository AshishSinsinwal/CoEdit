import { Document } from "./document.model.js";
import { Collaborator } from "./collaborator.model.js";
import {User} from "../users/user.model.js";

export async function createDocument(req, res) {
  const { title } = req.body;
  const userId = req.user.userId;

  const doc = await Document.create({
    title,
    ownerId: userId,
  });

  res.status(201).json(doc);
}

export async function listDocuments(req, res) {
  try {
    const userId = req.user.userId;

    // 1. Find all document IDs where the user is a collaborator
    const collaborations = await Collaborator.find({ userId }).select('documentId');
    const collabDocIds = collaborations.map(c => c.documentId);

    // 2. Find documents where the user is the owner OR the ID is in the collaborator list
    const docs = await Document.find({
      $or: [
        { ownerId: userId },           // Documents user owns
        { _id: { $in: collabDocIds } } // Documents user is invited to
      ]
    }).sort({ updatedAt: -1 });
    console.log(docs);
    res.json(docs);
  } catch (error) {
    console.error("List Documents Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteDocument(req, res) {

  const id = req.params.id;
  const userId = req.user.userId;

  if(!id){
    return res.status(400).json({ message: "Document ID is required" });
  }
  const document = await Document.findById(id);
  if(!document){
    return res.status(404).json({ message: "Document not found" });
  }

  if(document.ownerId.toString() !== userId){
    // just remove the collaborator entry if not owner
    await Collaborator.deleteOne({ documentId: id, userId: userId });
    return res.status(200).json({ message: "Removed from collaborators" });
  }

  await Document.findByIdAndDelete(id);
  await Collaborator.deleteMany({ documentId: id });
  res.status(200).json({ message: "Document deleted successfully" });

}

export async function getCollaborators(req, res) {
  try {
    const { id: documentId } = req.params;
    const currentUserId = req.user.userId;

    // 1. Find document and populate the owner's details
    const doc = await Document.findById(documentId).populate('ownerId', 'name email');
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    // 2. Security: Allow owner OR existing collaborator
    const isOwner = doc.ownerId._id.toString() === currentUserId;
    const isCollaborator = await Collaborator.findOne({ documentId, userId: currentUserId });

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ message: "You do not have permission to view the team list" });
    }

    // 3. Find all collaborators
    const collaborators = await Collaborator.find({ documentId }).populate('userId', 'name email');
    
    // 4. Format the collaborators array
    const formattedCollaborators = collaborators.map(c => ({
      name: c.userId.name,
      email: c.userId.email,
      userId: c.userId._id.toString(),
      role: 'editor'
    }));

    // 5. MANUALLY ADD THE OWNER to the start of the list
    const ownerData = {
      name: doc.ownerId.name,
      email: doc.ownerId.email,
      userId: doc.ownerId._id.toString(),
      role: 'owner' // Flag this so the frontend knows who the boss is
    };

    // Combine them: Owner first, then collaborators
    const finalTeamList = [ownerData, ...formattedCollaborators];

    res.status(200).json({ collaborators: finalTeamList });
  } catch (error) {
    console.error("Get Collaborators Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function addCollaborator(req, res) {
    try {
        const { id: documentId } = req.params;
        const { email } = req.body;
        const currentUserId = req.user.userId;

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: "Document not found" });
        if (doc.ownerId.toString() !== currentUserId) return res.status(403).json({ message: "Only owner can invite" });

        const userToInvite = await User.findOne({ email });
        if (!userToInvite) return res.status(404).json({ message: "User not found" });
        if (userToInvite._id.toString() === currentUserId) return res.status(400).json({ message: "You are the owner" });

        await Collaborator.findOneAndUpdate(
            { documentId, userId: userToInvite._id },
            { documentId, userId: userToInvite._id, role: "editor" },
            { upsert: true, new: true }
        );

        // ✅ Emit notification to the invited user
        const io = req.app.get('socketio');
        if (io) {
            io.to(userToInvite._id.toString()).emit("document:added", {
                message: "New document shared",
                docId: documentId
            });
        }

        res.status(200).json({ message: "Collaborator added successfully", user: { name: userToInvite.name, email: userToInvite.email } });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

export async function deleteCollaborator(req, res) {
    try {
        const { id: documentId, email } = req.params;
        const currentUserId = req.user.userId;

        const doc = await Document.findById(documentId);
        if (!doc) return res.status(404).json({ message: "Document not found" });
        if (doc.ownerId.toString() !== currentUserId) return res.status(403).json({ message: "Only owner can remove" });

        const userToRemove = await User.findOne({ email });
        if (!userToRemove) return res.status(404).json({ message: "User not found" });

        await Collaborator.deleteOne({ documentId, userId: userToRemove._id });

        // ✅ Notify removed user & kick from editor
        const io = req.app.get('socketio');
        if (io) {
            const targetId = userToRemove._id.toString();
            io.to(targetId).emit("document:removed", { documentId });
            io.to(targetId).emit("document:access_revoked", { documentId, message: "Access removed" });
        }

        res.status(200).json({ message: "Collaborator removed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}