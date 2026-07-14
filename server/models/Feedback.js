import mongoose from 'mongoose';

// A single user feedback entry for an agent: a 1–5 star rating + optional comment.
const feedbackSchema = new mongoose.Schema(
  {
    agent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '', trim: true, maxlength: 1000 },
    name: { type: String, default: 'Anonymous', trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

export default mongoose.model('Feedback', feedbackSchema);
