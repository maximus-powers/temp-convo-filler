export { defaultSettingsMiddleware } from './default-settings-middleware';
export { extractReasoningMiddleware } from './extract-reasoning-middleware';
export { simulateStreamingMiddleware } from './simulate-streaming-middleware';
export { 
  streamNaturalTextMiddleware
} from './stream-natural-text';
export { wrapLanguageModel } from './wrap-language-model';
export { wrapProvider } from './wrap-provider';

export type { 
  StreamNaturalTextConfig,
  ProcessingMetrics
} from './stream-natural-text';
