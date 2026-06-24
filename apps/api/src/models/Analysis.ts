import { Schema, model } from 'mongoose';

/**
 * Документ анализа. Поля прогноза заполняются ИИ, поля исхода (entered/result/payout)
 * пользователь проставляет вручную — это основа Фазы 3 (история) и Фазы 5 (аналитика).
 */
const analysisSchema = new Schema(
  {
    pair: { type: String, required: true },
    direction: { type: String, enum: ['UP', 'DOWN', 'NEUTRAL'], required: true },
    timeframe: { type: String, required: true },
    confidence: { type: Number, required: true },
    description: { type: String, required: true },
    signals: { type: [String], default: [] },
    model: { type: String, required: true },
    mock: { type: Boolean, default: false },

    // Заполняется пользователем вручную (Фаза 3)
    entered: { type: Boolean, default: null },
    result: { type: String, enum: ['win', 'loss', null], default: null },
    payout: { type: Number, default: null },
  },
  { timestamps: true },
);

export const Analysis = model('Analysis', analysisSchema);
