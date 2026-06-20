/**
 * Auto-generated TypeScript types for Gemma3n model configuration
 *
 * Generated from: @huggingface/transformers/src/models/gemma3n
 * Date: January 7, 2026
 *
 * Used by:
 * - UnifiedEmbeddingService (models/embeddings.ts)
 * - Code indexing skill (agent-generator/src/skills/code-indexing/)
 * - Embedding agents (experiments/micro-agents/base/embedding-agent.ts)
 */

import { z } from "zod";

/* ==================== AUDIO FEATURE EXTRACTOR CONFIG ==================== */

export interface Gemma3nAudioConfig {
  /** FFT length for spectrogram computation */
  fft_length: number;

  /** Number of mel filter banks */
  feature_size: number;

  /** Minimum frequency for mel filter bank (Hz) */
  min_frequency: number;

  /** Maximum frequency for mel filter bank (Hz) */
  max_frequency: number;

  /** Audio sampling rate (Hz) */
  sampling_rate: number;

  /** Frame length for windowing */
  frame_length: number;

  /** Hop length between frames */
  hop_length: number;

  /** Preemphasis coefficient (0-1) */
  preemphasis?: number;

  /** Use HTK-flavor preemphasis */
  preemphasis_htk_flavor?: boolean;

  /** Floor value for mel computation */
  mel_floor?: number;

  /** Padding value for audio */
  padding_value?: number;

  /** Maximum audio length (samples) */
  max_length?: number;
}

export const Gemma3nAudioConfigSchema = z.object({
  fft_length: z.number().int().positive(),
  feature_size: z.number().int().positive(),
  min_frequency: z.number().nonnegative(),
  max_frequency: z.number().positive(),
  sampling_rate: z.number().int().positive(),
  frame_length: z.number().int().positive(),
  hop_length: z.number().int().positive(),
  preemphasis: z.number().min(0).max(1).optional(),
  preemphasis_htk_flavor: z.boolean().optional(),
  mel_floor: z.number().optional(),
  padding_value: z.number().optional(),
  max_length: z.number().int().positive().optional(),
});

/* ==================== FEATURE EXTRACTION OPTIONS ==================== */

export interface Gemma3nFeatureExtractionOptions {
  /** Maximum audio length in samples (default: 480,000) */
  max_length?: number;

  /** Whether to truncate audio above max_length */
  truncation?: boolean;

  /** Whether to pad sequences */
  padding?: boolean;

  /** Pad sequences to multiple of this value */
  pad_to_multiple_of?: number;
}

export const Gemma3nFeatureExtractionOptionsSchema = z.object({
  max_length: z.number().int().positive().default(480_000),
  truncation: z.boolean().default(true),
  padding: z.boolean().default(true),
  pad_to_multiple_of: z.number().int().positive().default(128),
});

/* ==================== MODEL OUTPUT ==================== */

export interface Gemma3nFeatureOutput {
  /** Extracted audio features as tensor */
  input_features: number[][] | Float32Array | Float64Array;

  /** Attention mask for input features */
  input_features_mask: boolean[] | boolean[][];
}

export const Gemma3nFeatureOutputSchema = z.object({
  input_features: z.union([
    z.array(z.array(z.number())),
    z.instanceof(Float32Array),
    z.instanceof(Float64Array),
  ]),
  input_features_mask: z.union([
    z.array(z.boolean()),
    z.array(z.array(z.boolean())),
  ]),
});

/* ==================== TEXT MODEL CONFIG ==================== */

export interface Gemma3nTextConfig {
  /** Model type identifier */
  model_type: "gemma3n";

  /** Vocabulary size */
  vocab_size: number;

  /** Hidden layer dimension */
  hidden_size: number;

  /** Number of attention heads */
  num_attention_heads: number;

  /** Number of transformer layers */
  num_hidden_layers: number;

  /** Intermediate size for feed-forward network */
  intermediate_size: number;

  /** Maximum sequence length */
  max_position_embeddings: number;

  /** Activation function */
  hidden_act?: string;

  /** Dropout probability */
  hidden_dropout_prob?: number;

  /** Attention dropout probability */
  attention_probs_dropout_prob?: number;

  /** Layer norm epsilon */
  layer_norm_eps?: number;

  /** Whether model is encoder-decoder */
  is_encoder_decoder?: boolean;
}

export const Gemma3nTextConfigSchema = z.object({
  model_type: z.literal("gemma3n"),
  vocab_size: z.number().int().positive(),
  hidden_size: z.number().int().positive(),
  num_attention_heads: z.number().int().positive(),
  num_hidden_layers: z.number().int().positive(),
  intermediate_size: z.number().int().positive(),
  max_position_embeddings: z.number().int().positive(),
  hidden_act: z.string().optional(),
  hidden_dropout_prob: z.number().min(0).max(1).optional(),
  attention_probs_dropout_prob: z.number().min(0).max(1).optional(),
  layer_norm_eps: z.number().positive().optional(),
  is_encoder_decoder: z.boolean().optional(),
});

/* ==================== FULL MODEL CONFIG ==================== */

export interface Gemma3nConfig {
  /** Text encoder configuration */
  text_config: Gemma3nTextConfig;

  /** Audio feature extractor configuration (if multimodal) */
  audio_config?: Gemma3nAudioConfig;

  /** Model architecture names */
  architectures?: string[];

  /** Transformer version */
  transformers_version?: string;
}

export const Gemma3nConfigSchema = z.object({
  text_config: Gemma3nTextConfigSchema,
  audio_config: Gemma3nAudioConfigSchema.optional(),
  architectures: z.array(z.string()).optional(),
  transformers_version: z.string().optional(),
});

/* ==================== VALIDATORS ==================== */

export function validateGemma3nConfig(input: unknown): Gemma3nConfig {
  return Gemma3nConfigSchema.parse(input);
}

export function validateGemma3nConfigSafe(
  input: unknown
): z.SafeParseReturnType<unknown, Gemma3nConfig> {
  return Gemma3nConfigSchema.safeParse(input);
}

export function validateGemma3nAudioConfig(input: unknown): Gemma3nAudioConfig {
  return Gemma3nAudioConfigSchema.parse(input);
}

export function validateGemma3nFeatureOptions(
  input: unknown
): Gemma3nFeatureExtractionOptions {
  return Gemma3nFeatureExtractionOptionsSchema.parse(input);
}

/* ==================== DEFAULT CONFIGS ==================== */

export const DEFAULT_GEMMA3N_AUDIO_CONFIG: Gemma3nAudioConfig = {
  fft_length: 400,
  feature_size: 80,
  min_frequency: 0,
  max_frequency: 8000,
  sampling_rate: 16000,
  frame_length: 400,
  hop_length: 160,
  preemphasis: 0.97,
  preemphasis_htk_flavor: true,
  mel_floor: 1.192092955078125e-7,
  padding_value: 0,
  max_length: 480_000,
};

export const DEFAULT_GEMMA3N_TEXT_CONFIG: Partial<Gemma3nTextConfig> = {
  model_type: "gemma3n",
  hidden_act: "gelu_new",
  hidden_dropout_prob: 0.1,
  attention_probs_dropout_prob: 0.1,
  layer_norm_eps: 1e-12,
  is_encoder_decoder: false,
};

/* ==================== TYPE GUARDS ==================== */

export function isGemma3nConfig(obj: unknown): obj is Gemma3nConfig {
  return validateGemma3nConfigSafe(obj).success;
}

export function isGemma3nAudioConfig(obj: unknown): obj is Gemma3nAudioConfig {
  return Gemma3nAudioConfigSchema.safeParse(obj).success;
}

/* ==================== EXPORT ==================== */

export const Gemma3nTypes = {
  Config: Gemma3nConfigSchema,
  AudioConfig: Gemma3nAudioConfigSchema,
  TextConfig: Gemma3nTextConfigSchema,
  FeatureOptions: Gemma3nFeatureExtractionOptionsSchema,
  FeatureOutput: Gemma3nFeatureOutputSchema,
};
