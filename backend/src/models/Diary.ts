import mongoose, { Document, Schema } from "mongoose";

export interface IDiaryEntry {
  day: string;
  content: string;
  time?: string;
  location?: string;
  diseaseDescription?: string;
  symptoms?: string;
  doctorReference?: string;
  imageUrl?: string;
  dataSource?: string;
  gender?: string;
  tags?: string[];
  symptomsChecklist?: string[];
  createdAt?: Date;
}

export interface IDiary extends Document {
  title: string;
  user: mongoose.Types.ObjectId;
  entries: IDiaryEntry[];
}

const DiaryEntrySchema = new Schema(
  {
    day: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    time: { type: String },
    location: { type: String },
    diseaseDescription: { type: String },
    symptoms: { type: String },
    doctorReference: { type: String },
    imageUrl: { type: String },
    dataSource: { type: String },
    gender: { type: String },
    tags: [{ type: String }],
    symptomsChecklist: [{ type: String }],
  },
  { timestamps: true }
);

const DiarySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    entries: [DiaryEntrySchema],
  },
  { timestamps: true }
);

export default mongoose.model<IDiary>("Diary", DiarySchema);