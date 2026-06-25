import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // Баланс токенов — используется в Фазе 4 (платная модель/перепродажа)
    tokensBalance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const UserModel = model('User', userSchema);
