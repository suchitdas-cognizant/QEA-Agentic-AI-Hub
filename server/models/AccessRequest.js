import mongoose from 'mongoose';

// A request from a signed-in user asking to be granted associate access.
// Admins approve (creates an Associate grant) or reject.
const accessRequestSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    message: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    decidedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('AccessRequest', accessRequestSchema);
