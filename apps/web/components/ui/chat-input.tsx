import React, { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

interface ChatInputProps {
  onSubmit: (message: { text: string }) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSubmit,
  isLoading,
  disabled
}: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('Enter pressed, input:', input, 'isLoading:', isLoading);
      if (!isLoading && input.trim()) {
        console.log('Submitting form...');
        const form = e.currentTarget.form;
        if (form) {
          form.requestSubmit();
        }
      } else {
        console.log('Not submitting - input empty or loading');
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submit handler called, input:', input);
    if (input.trim() && !isLoading) {
      onSubmit({ text: input });
      setInput('');
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="flex gap-2 p-4 border-t bg-background">
      <div className="flex-1 relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything..."
          disabled={disabled || isLoading}
          className={cn(
            "w-full min-h-[44px] max-h-32 px-3 py-2 pr-12 text-sm",
            "border border-input rounded-md resize-none",
            "bg-background text-foreground placeholder:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
          rows={1}
          style={{
            height: 'auto',
            minHeight: '44px',
            maxHeight: '128px',
            overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden'
          }}
        />
      </div>
      <Button
        type="submit"
        size="icon"
        disabled={!input.trim() || isLoading || disabled}
        className="h-11 w-11 flex-shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
}