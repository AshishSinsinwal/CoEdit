import mongoose from "mongoose";

const collaboratorSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coEditDocument",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coEditUser",
      required: true,
    },
    role: {
      type: String,
      enum: ["editor"],
      default: "editor",
    },
  },
  { timestamps: true }
);

collaboratorSchema.index({ documentId: 1, userId: 1 }, { unique: true });

export const Collaborator = mongoose.model("coEditCollaborator", collaboratorSchema);
