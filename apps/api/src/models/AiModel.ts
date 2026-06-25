import { Schema, model } from 'mongoose';

/** Модель ИИ (free/paid), управляется в админке. Сидируется из env при первом запуске. */
const aiModelSchema = new Schema(
  {
    modelId: { type: String, required: true },
    label: { type: String, required: true },
    tier: { type: String, enum: ['free', 'paid'], required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    costTokens: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const AiModel = model('AiModel', aiModelSchema);
