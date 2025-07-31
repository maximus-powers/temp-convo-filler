# AI Chat Demo with streamNaturalText Middleware

This is a Turborepo monorepo featuring a chat application with a custom AI middleware that provides immediate responses using SmolLM while processing structured thoughts with GPT-4 in the background.

## Features

- **Dual-stream processing**: Immediate responses (<2s) from SmolLM while GPT-4 generates structured thoughts
- **streamNaturalText middleware**: Custom AI SDK middleware for natural conversation flow
- **Turborepo monorepo**: Optimized workspace setup with shadcn/ui components
- **Next.js 15**: Modern React framework with Turbopack
- **TypeScript**: Full type safety across the monorepo

## Setup

1. **Install dependencies**:
```bash
pnpm install
```

2. **Configure environment variables**:
```bash
# Copy the environment template
cp apps/web/.env.local.example apps/web/.env.local

# Edit the file and add your API keys
# - OPENAI_API_KEY: Your OpenAI API key for GPT-4
# - HUGGINGFACE_ENDPOINT_URL: Your HuggingFace TGI endpoint for SmolLM
# - HUGGINGFACE_API_KEY: Your HuggingFace API token
```

3. **Start the development server**:
```bash
pnpm dev
```

4. **Open the chat interface**:
Visit [http://localhost:3000/chat](http://localhost:3000/chat)

## Architecture

### streamNaturalText Middleware

The core innovation is the `streamNaturalText` middleware located in `packages/ai/src/middleware/stream-natural-text/`. This middleware:

1. **Intercepts requests** to the primary GPT-4 model
2. **Generates immediate responses** using SmolLM via HuggingFace TGI endpoints
3. **Processes structured thoughts** in the background using GPT-4
4. **Streams natural responses** while maintaining conversation context

### Package Structure

- `packages/ai/` - Custom AI SDK with streamNaturalText middleware
- `packages/gateway/` - AI SDK gateway package (workspace)
- `packages/provider/` - AI SDK provider package (workspace)  
- `packages/provider-utils/` - AI SDK provider utilities (workspace)
- `packages/ui/` - Shared shadcn/ui components
- `apps/web/` - Next.js chat application

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Tailwind

Your `tailwind.config.ts` and `globals.css` are already set up to use the components from the `ui` package.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button"
```
