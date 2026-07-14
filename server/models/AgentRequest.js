import mongoose from 'mongoose';

const benefitSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: false }
);

// A file stored in GridFS and attached to a submission (md / video / code / other).
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

// An agent proposal submitted by a logged-in associate for admin review.
const agentRequestSchema = new mongoose.Schema(
  {
    // Identity is taken from the logged-in account (not typed by the user).
    requesterName: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true },
    submittedByUsername: { type: String, default: '', trim: true },
    submittedByRole: { type: String, default: '', trim: true },

    // 'idea' = lightweight innovation idea (users); 'submission' = full agent with docs (associates/admins).
    type: { type: String, enum: ['idea', 'submission'], default: 'submission' },
    agentName: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    useCase: { type: String, default: '', trim: true },
    keyBenefits: { type: [benefitSchema], default: [] },
    repoUrl: { type: String, default: '', trim: true },
    attachments: { type: [attachmentSchema], default: [] },

    status: {
      type: String,
      enum: ['New', 'In Review', 'Approved', 'Rejected'],
      default: 'New',
    },
    // Set when an admin publishes the request as a live agent.
    publishedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('AgentRequest', agentRequestSchema);
