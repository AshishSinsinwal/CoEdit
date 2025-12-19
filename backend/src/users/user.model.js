import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String }, // null for Google users
    googleId: { type: String },     // null for email users
  },
  { timestamps: true }
);

export const User = mongoose.model("coEditUser", userSchema);
