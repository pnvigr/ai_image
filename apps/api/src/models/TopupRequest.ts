import { Schema, model } from 'mongoose';

/** Заявка на пополнение токенов. Админ подтверждает её и начисляет токены вручную. */
const topupRequestSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    userEmail: { type: String },
    packageId: { type: String, required: true },
    tokens: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'fulfilled', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

export const TopupRequestModel = model('TopupRequest', topupRequestSchema);
