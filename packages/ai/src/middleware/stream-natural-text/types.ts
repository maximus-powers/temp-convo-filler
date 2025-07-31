export interface ProcessingMetrics {
  thoughtsExtracted: number;
  thoughtsProcessed: number;
  responsesGenerated: number;
  processingTimeMs: number;
  firstResponseTimeMs: number;
}

export interface StreamNaturalTextConfig {
  huggingfaceEndpointUrl: string;
  huggingfaceApiKey: string;
  temperature?: number;
  fallbackBehavior?: 'passthrough' | 'silence';
  onMetricsUpdate?: (metrics: ProcessingMetrics & { thoughts?: string[], fullText?: string }) => void;
}