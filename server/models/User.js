import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// A self-registered portal user (role "user"). Associate/admin privileges are
// granted separately; this is just the account + password.
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, trim: true },
    role: { type: String, enum: ['user'], default: 'user' },
  },
  { timestamps: true }
);

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export default mongoose.model('User', userSchema);
