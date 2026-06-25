import { z } from 'zod';

export type ModelTier = 'free' | 'paid';

export interface AiModelInfo {
  id: string;
  modelId: string;
  label: string;
  tier: ModelTier;
  enabled: boolean;
  order: number;
  costTokens: number;
}

export interface AvailableModels {
  free: AiModelInfo[];
  paid: AiModelInfo[];
}

/** Краткая ссылка на модель (для списка альтернатив при ошибке платной). */
export interface ModelRef {
  modelId: string;
  label: string;
  costTokens?: number;
}

export const CreateModelSchema = z.object({
  modelId: z.string().min(1).max(120),
  label: z.string().min(1).max(80),
  tier: z.enum(['free', 'paid']),
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).max(1000).default(0),
  costTokens: z.number().int().min(0).max(100000).default(0),
});
export type CreateModelInput = z.infer<typeof CreateModelSchema>;

export const UpdateModelSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().min(0).max(1000).optional(),
  costTokens: z.number().int().min(0).max(100000).optional(),
});
export type UpdateModelInput = z.infer<typeof UpdateModelSchema>;
