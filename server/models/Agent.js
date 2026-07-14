import mongoose from 'mongoose';
import { CATEGORY_CODES, STAGES, STATUSES } from '../constants.js';

// A single "Key Benefit" entry: a short heading + supporting line.
const benefitSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: false }
);

// A file (md / video / code / other) stored in GridFS, carried over from a
// published agent request so it can be downloaded from the agent detail.
const attachmentSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    filename: { type: String, default: '' },
    contentType: { type: String, default: '' },
    kind: { type: String, enum: ['md', 'video', 'code', 'other'], default: 'other' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Short one-line summary shown on the card (the bold sub-text).
    tagline: { type: String, default: '', trim: true },
    // Full "About" description shown in the detail panel.
    description: { type: String, default: '', trim: true },
    // Key benefits (the titled bullet points in the detail panel).
    keyBenefits: { type: [benefitSchema], default: [] },
    // Technologies powering the agent, e.g. ["GenAI", "Python", "React"].
    techStacks: { type: [String], default: [] },
    // Asset badge shown on the card (DV, BRD, CS, ...).
    category: { type: String, enum: CATEGORY_CODES, default: 'DV' },
    // Lifecycle stage (Prototype / POV / MVP / Production).
    stage: { type: String, enum: STAGES, default: 'Prototype' },
    // Availability status shown as the animated card badge (Active / Upcoming).
    status: { type: String, enum: STATUSES, default: 'Active' },
    // Display priority — higher numbers are shown first on the dashboard.
    priority: { type: Number, default: 0 },
    // Optional grouping (e.g. "Insurance", "Retail", "HR").
    industry: { type: String, default: '', trim: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    ratingCount: { type: Number, default: 0 },
    // GridFS file id of an uploaded demo video (null if none).
    videoFileId: { type: mongoose.Schema.Types.ObjectId, default: null },
    // Optional external video URL (YouTube etc.) used when no file is uploaded.
    externalVideoUrl: { type: String, default: '', trim: true },
    // Files (md / code / other) carried over from a published agent request.
    attachments: { type: [attachmentSchema], default: [] },
    // Email of the subject-matter expert for the "Connect SME" link.
    smeEmail: { type: String, default: '', trim: true },
    // Optional emoji/short text used as the card icon.
    icon: { type: String, default: '🤖' },
  },
  { timestamps: true }
);

// Convenience flag the frontend can use without exposing the raw ObjectId logic.
agentSchema.virtual('hasVideo').get(function () {
  return Boolean(this.videoFileId) || Boolean(this.externalVideoUrl);
});

agentSchema.set('toJSON', { virtuals: true });
agentSchema.set('toObject', { virtuals: true });

export default mongoose.model('Agent', agentSchema);
