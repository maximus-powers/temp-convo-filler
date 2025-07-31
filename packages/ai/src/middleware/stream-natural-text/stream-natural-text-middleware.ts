import type { LanguageModelV2Middleware } from '@ai-sdk/provider';
import { NaturalResponseProcessor } from './natural-response-processor';
import type { StreamNaturalTextConfig } from './types';

/**
 * Middleware for low-latency responses and more natural conversational tone.
 * 
 * This middleware works by:
 * 1. Detecting thought boundaries in the primary model's stream.
 * 2. Processing complete thoughts through a 360M param model trained for natural conversation
 * 3. Handling silence tokens <|sil|> for natural conversation pacing
 * 4. Streaming natural conversational responses while maintaining context
 * 
 * @param config Configuration options for the middleware
 * @returns LanguageModelV2Middleware that can be used with wrapLanguageModel
 * 
 * @example
 * ```typescript
 * import { streamText, wrapLanguageModel, streamNaturalTextMiddleware } from 'ai';
 * import { openai } from '@ai-sdk/openai';
 * 
 * const naturalModel = wrapLanguageModel({
 *   model: openai('gpt-4'),
 *   middleware: streamNaturalTextMiddleware({
 *     huggingfaceEndpointUrl: '',
 *     huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY!,
 *     temperature: 0.7,
 *     maxTokens: 64
 *   })
 * });
 * 
 * const result = await streamText({
 *   model: naturalModel,
 *   prompt: 'Explain quantum computing'
 * });
 * 
 * for await (const chunk of result.textStream) {
 *   process.stdout.write(chunk);
 * }
 * ```
 */
export function streamNaturalTextMiddleware(
  config: StreamNaturalTextConfig
): LanguageModelV2Middleware {
  console.log('🚨🚨🚨 MIDDLEWARE FUNCTION CALLED - UPDATED VERSION 🚨🚨🚨');
  
  // System prompt to force structured thought generation
  const STRUCTURED_THOUGHT_SYSTEM_PROMPT = `You are a helpful AI assistant that MUST structure your responses using special markers.

CRITICAL: You MUST wrap every complete thought in [bt] and [et] markers. You MUST use <|sil|> tokens between thoughts for natural pauses.

REQUIRED FORMAT:
[bt]Your first complete thought about the topic[et] <|sil|> [bt]Your second complete thought with more details[et] <|sil|> [bt]Your final thought or conclusion[et]

EXAMPLE:
[bt]Machine learning is a subset of artificial intelligence that enables computers to learn patterns from data[et] <|sil|> [bt]It works by training algorithms on large datasets to recognize and predict outcomes without explicit programming[et] <|sil|> [bt]Popular applications include image recognition, natural language processing, and recommendation systems[et]

IMPORTANT: Every response must contain multiple [bt]...[et] sections with <|sil|> pauses between them. Do not provide responses without these markers.`;

  return {
    middlewareVersion: 'v2',
    
    transformParams: async ({ params, type }) => {
      console.log('[DEBUG] ===============================================');
      console.log('[DEBUG] transformParams called with type:', type);
      console.log('[DEBUG] Original params prompt length:', params.prompt.length);
      console.log('[DEBUG] ===============================================');
      
      const modifiedPrompt = [...params.prompt];
      const systemMessageIndex = modifiedPrompt.findIndex(msg => msg.role === 'system');
      
      if (systemMessageIndex >= 0) {
        const existingMessage = modifiedPrompt[systemMessageIndex];
        if (existingMessage.role === 'system') {
          modifiedPrompt[systemMessageIndex] = {
            ...existingMessage,
            content: STRUCTURED_THOUGHT_SYSTEM_PROMPT + '\n\n' + existingMessage.content
          };
        }
      } else {
        modifiedPrompt.unshift({
          role: 'system' as const,
          content: STRUCTURED_THOUGHT_SYSTEM_PROMPT
        });
      }
      
      console.log('[DEBUG] Modified prompt length:', modifiedPrompt.length);
      console.log('[DEBUG] System message added/modified');
      
      return {
        ...params,
        prompt: modifiedPrompt
      };
    },
    
    wrapStream: async ({ doStream, params }) => {
      console.log('[DEBUG] ===============================================');
      console.log('[DEBUG] Middleware wrapStream called!');
      console.log('[DEBUG] Params:', JSON.stringify(params, null, 2));
      console.log('[DEBUG] ===============================================');
      
      try {
        const processor = new NaturalResponseProcessor(config);
        console.log('[DEBUG] NaturalResponseProcessor created successfully');
        
        const result = await doStream();
        console.log('[DEBUG] Original doStream() completed, result keys:', Object.keys(result));
        
        const { stream, ...rest } = result;
        console.log('[DEBUG] Original stream obtained, creating natural stream...');
        
        const naturalStream = processor.processStream(stream, params);
        console.log('[DEBUG] Natural stream created, returning...');
        
        return {
          stream: naturalStream,
          ...rest
        };
      } catch (error) {
        console.error('[DEBUG] Error in wrapStream:', error);
        console.error('[DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
        throw error;
      }
    }
  };
}