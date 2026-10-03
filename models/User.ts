import mongoose, { Schema, Document, Model, model, models } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  email: string;
  password?: string;
  name: string;
  avatarId: string;
  savedEvents: string[];
  gameScores: Record<string, number>; // เก็บแมปปิ้งคะแนน เช่น { typing: 100, game2: 50 }
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, default: 'ผู้เล่นใหม่' },
    avatarId: { type: String, default: '1' },
    savedEvents: { type: [String], default: [] },
    // เพิ่มการเก็บคะแนนเกมไว้ข้างใน Document ของยูสเซอร์
    gameScores: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

const User: Model<IUser> = models.User || model<IUser>('User', UserSchema);

export default User;