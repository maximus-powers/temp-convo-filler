import type {
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';

/**
 * Simple middleware that transforms streams - based on simulateStreamingMiddleware pattern
 */
export function simpleTransformMiddleware(): LanguageModelV2Middleware {
  return {
    middlewareVersion: 'v2',
    wrapStream: async ({ doStream }) => {
      console.log('[SIMPLE TRANSFORM] wrapStream called!');
      
      const result = await doStream();
      console.log('[SIMPLE TRANSFORM] Got stream result');

      const transformedStream = new ReadableStream<LanguageModelV2StreamPart>({
        start(controller) {
          console.log('[SIMPLE TRANSFORM] Starting stream transformation');
          
          // Process the original stream
          const reader = result.stream.getReader();
          
          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                  console.log('[SIMPLE TRANSFORM] Stream ended');
                  controller.close();
                  break;
                }
                
                console.log('[SIMPLE TRANSFORM] Processing chunk:', value.type);
                
                // Pass through the chunk unchanged (you can modify here)
                controller.enqueue(value);
              }
            } catch (error) {
              console.error('[SIMPLE TRANSFORM] Stream error:', error);
              controller.error(error);
            }
          };
          
          pump();
        },
      });

      return {
        stream: transformedStream,
        request: result.request,
        response: result.response,
      };
    },
  };
}