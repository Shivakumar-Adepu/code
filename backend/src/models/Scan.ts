import mongoose, { Schema, Document } from "mongoose";

export interface IScan extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  language: string;
  timestamp: Date;
  bugsFound: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  riskScore: number;
  qualityScore: number;
  bugProbability: number;
  summary: string;
  issueTitles: string[];
  fullResult: any; // Storing the full AnalysisResult object
}

const ScanSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fileName: { type: String, required: true },
  language: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  bugsFound: { type: Number, required: true },
  critical: { type: Number, required: true },
  high: { type: Number, required: true },
  medium: { type: Number, required: true },
  low: { type: Number, required: true },
  riskScore: { type: Number, required: true },
  qualityScore: { type: Number, required: true },
  bugProbability: { type: Number, required: true },
  summary: { type: String, required: true },
  issueTitles: [{ type: String }],
  fullResult: { type: Schema.Types.Mixed },
});

export default mongoose.model<IScan>("Scan", ScanSchema);
