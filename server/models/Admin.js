import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true },
    role: {
      type: String,
      enum: ['user', 'associate', 'admin'],
      default: 'admin',
      index: true,
    },
  },
  { timestamps: true }
);

adminSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

adminSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('Admin', adminSchema);
