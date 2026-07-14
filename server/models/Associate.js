import mongoose from 'mongoose';

// An "associate" access grant: an email that should be treated as an
// associate at login time (can view & review agent requests). Grants are
// created either by an admin directly or by approving an AccessRequest.
const associateSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: '', trim: true },
    // Who granted it: 'admin' (manual) or 'request' (approved request).
    grantedVia: { type: String, enum: ['admin', 'request'], default: 'admin' },
    grantedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.model('Associate', associateSchema);
