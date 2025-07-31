#!/usr/bin/env node

// Simple demo of streamNaturalText middleware
import 'dotenv/config';
import { streamText, wrapLanguageModel } from './dist/index.mjs';
import { streamNaturalTextMiddleware } from './dist/index.mjs';
import { openai } from '@ai-sdk/openai';

async function quickDemo() {
  console.log('🧪 Stream Natural Text Middleware Demo\n');
  
  const naturalModel = wrapLanguageModel({
    model: openai('gpt-4'),
    middleware: streamNaturalTextMiddleware({
      huggingfaceEndpointUrl: process.env.HUGGINGFACE_ENDPOINT_URL,
      huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY,
      temperature: 0.7,
      maxTokens: 64
    })
  });
  
  const system = 'You are a helpful AI assistant that MUST structure your responses using special markers. CRITICAL: You MUST wrap every complete thought in [bt] and [et] markers. You MUST use <|sil|> tokens between thoughts for natural pauses. REQUIRED FORMAT: [bt]Your first complete thought[et] <|sil|> [bt]Your second complete thought[et] <|sil|> [bt]Your final thought[et]. IMPORTANT: Every response must contain multiple [bt]...[et] sections with <|sil|> pauses between them.';
  
  console.log('❓ Question: "tell me some fun facts about planes"\n');
  console.log('🤖 SmolLM Response: ');
  
  const result = await streamText({
    model: naturalModel,
    system: system,
    prompt: 'tell me some fun facts about planes'
  });
  
  let response = '';
  for await (const chunk of result.textStream) {
    response += chunk;
    process.stdout.write(chunk);
  }
  
  console.log('\n\n✅ Demo complete!');
  console.log(`📊 Response length: ${response.length} characters`);
}

quickDemo().catch(console.error);