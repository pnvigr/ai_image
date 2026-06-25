import { Schema, model } from 'mongoose';

/**
 * Документ анализа. Поля прогноза заполняет ИИ; поля исхода (entered/result/payout)
 * пользователь проставляет вручную — основа истории (Фаза 3) и аналитики (Фаза 5).
 */
const analysisSchema = new Schema(
  {
    userId: { type: String, default: null, index: true },
    pair: { type: String, required: true },
    direction: { type: String, enum: ['UP', 'DOWN', 'NEUTRAL'], required: true },
    timeframe: { type: String, required: true },
    confidence: { type: Number, required: true },
    description: { type: String, required: true },
    signals: { type: [String], default: [] },
    model: { type: String, required: true },
    mock: { type: Boolean, default: false },
    tier: { type: String, enum: ['free', 'paid'], default: 'free' },

    // Заполняется пользователем вручную
    entered: { type: Boolean, default: null },
    result: { type: String, enum: ['win', 'loss', null], default: null },
    payout: { type: Number, default: null },
  },
  { timestamps: true },
);

export const Analysis = model('Analysis', analysisSchema);
