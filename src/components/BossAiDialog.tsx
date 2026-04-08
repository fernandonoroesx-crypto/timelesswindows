import React, { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import bossAvatar from '@/assets/boss-avatar.jpg';
import type { PricingData } from '@/lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface BossAiDialogProps {
  pricing: PricingData;
  onUpdatePricing: (path: string, value: number) => void;
}

export default function BossAiDialog({ pricing, onUpdatePricing }: BossAiDialogProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Woof! 🐾 I'm Boss, your pricing assistant. Tell me how you'd like to adjust uplifts or installation prices and I'll sort it out!" },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Send only user/assistant messages (skip the initial greeting for API)
      const apiMessages = newMessages
        .filter((_, i) => i > 0) // skip initial greeting
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('boss-ai', {
        body: {
          messages: apiMessages,
          currentUplifts: pricing.uplift || {},
          currentInstallationSelling: pricing.installationSelling || {},
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to reach Boss');
      }

      if (data?.error) {
        toast.error(data.error);
        setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I ran into an issue: ${data.error}` }]);
        setLoading(false);
        return;
      }

      const choice = data?.choices?.[0];
      if (!choice) {
        throw new Error('No response from Boss');
      }

      const msg = choice.message;

      // Check for tool calls
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          if (tc.function?.name === 'update_pricing') {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments;

            // Apply uplift changes
            if (args.upliftChanges) {
              for (const [type, value] of Object.entries(args.upliftChanges)) {
                onUpdatePricing(`uplift.${type}`, value as number);
              }
            }

            // Apply installation selling changes
            if (args.installationChanges) {
              for (const [type, value] of Object.entries(args.installationChanges)) {
                onUpdatePricing(`installationSelling.${type}`, value as number);
              }
            }

            const explanation = args.explanation || 'Pricing updated!';
            setMessages(prev => [...prev, { role: 'assistant', content: `✅ ${explanation}` }]);
            toast.success('Pricing updated by Boss');
          }
        }
      } else if (msg.content) {
        setMessages(prev => [...prev, { role: 'assistant', content: msg.content }]);
      }
    } catch (err: any) {
      console.error('Boss AI error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble processing that. Please try again.' }]);
      toast.error('Boss AI error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="relative rounded-full overflow-hidden w-10 h-10 border-2 border-amber-400 hover:border-amber-300 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2">
          <img src={bossAvatar} alt="Boss AI" className="w-full h-full object-cover" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[440px] flex flex-col p-0">
        <SheetHeader className="p-4 pb-2 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 border border-amber-400">
              <AvatarImage src={bossAvatar} alt="Boss" />
              <AvatarFallback>🐕</AvatarFallback>
            </Avatar>
            <SheetTitle className="text-base">Boss AI</SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 pt-2 border-t">
          <form
            onSubmit={e => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Boss to adjust pricing..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
