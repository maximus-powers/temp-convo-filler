import { Button } from "@workspace/ui/components/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-svh bg-gradient-to-br from-background to-muted/20">
      <div className="flex flex-col items-center justify-center gap-6 text-center max-w-md mx-4">
        <div className="space-y-2">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-3xl font-bold tracking-tight">AI Chat Assistant</h1>
          <p className="text-muted-foreground text-lg">
            Experience natural conversations powered by GPT-4 with thoughtful, human-like responses
          </p>
        </div>
        
        <div className="space-y-3 w-full">
          <Link href="/chat" className="block">
            <Button size="lg" className="w-full">
              Start Chatting
            </Button>
          </Link>
          
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Powered by advanced AI middleware</span>
            </div>
            <ul className="text-xs space-y-1">
              <li>• GPT-4 reasoning with natural language processing</li>
              <li>• Real-time streaming responses</li>
              <li>• Thoughtful and contextual conversations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
