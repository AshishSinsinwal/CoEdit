import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coEditUser",
      required: true,
    },
  },
  { timestamps: true }
);

export const Document = mongoose.model("coEditDocument", documentSchema);
