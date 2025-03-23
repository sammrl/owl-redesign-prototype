import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { Send, Loader2, ChevronDown, Sparkles } from "lucide-react";
import { useModule } from "../../App";
import { owlApiService } from "../../services/api";

// Message type definition
interface Message {
  role: string;
  content: string;
  token_count?: number;
  timestamp?: string;
}

export function ConversationPanel() {
  const { selectedModule } = useModule();
  const [messages, setMessages] = useState<Message[]>([
    //initial greeting message
    { role: 'assistant', content: "How can I help you today?", timestamp: formatTimestamp() }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [tokenCount, setTokenCount] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const prevMessagesLength = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket on component mount
  useEffect(() => {
    const ws = owlApiService.connectWebSocket(handleWebSocketMessage);
    wsRef.current = ws;
    
    // Setup periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        owlApiService.sendWebSocketPing(wsRef.current);
      }
    }, 30000); // Ping every 30 seconds
    
    return () => {
      clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleWebSocketMessage = (response: any) => {
    console.log('WebSocket message received:', response);
    
    // Handle different message types from the WebSocket
    if (response.type === 'system' && response.status === 'connected') {
      // Connection successfully established - clear any error messages
      setMessages(prev => {
        // Remove any WebSocket error messages
        return prev.filter(msg => 
          !(msg.role === 'error' && 
            (msg.content.includes('WebSocket') || 
             msg.content.includes('connection')))
        );
      });
      console.log('WebSocket connection established - cleared error messages');
    } else if (response.type === 'ack') {
      // Acknowledgment of request - keep loading state
      console.log('Query acknowledged with task ID:', response.task_id);
      
    } else if (response.type === 'status') {
      // Status update
      if (response.status === 'completed' && response.result) {
        // Query completed successfully
        const { answer, token_info, chat_history } = response.result;
        
        // Convert messages to our Message format with timestamps if chat history is available
        if (chat_history && Array.isArray(chat_history) && chat_history.length > 0) {
          // Use chat history if available
          const newMessages = chat_history.map((msg: Message) => ({
            ...msg,
            timestamp: formatTimestamp()
          }));
          
          setMessages(prev => {
            // Filter out any loading message and add new messages
            const filteredPrev = prev.filter(msg => msg.role !== 'loading');
            return [...filteredPrev, ...newMessages];
          });
          
        } else if (answer && answer.trim()) {
          // Otherwise just use the answer
          setMessages(prev => {
            const filteredPrev = prev.filter(msg => msg.role !== 'loading');
            return [...filteredPrev, { 
              role: 'assistant', 
              content: answer, 
              timestamp: formatTimestamp() 
            }];
          });
        } else {
          // No valid response content
          setMessages(prev => {
            const filteredPrev = prev.filter(msg => msg.role !== 'loading');
            return [...filteredPrev, { 
              role: 'error', 
              content: "Empty response received. The browser process may have failed to return results.", 
              timestamp: formatTimestamp() 
            }];
          });
        }
        
        // Set token count if available
        if (token_info) {
          const { completion_token_count, prompt_token_count, total_token_count } = token_info;
          setTokenCount(`Completion: ${completion_token_count || 0} | Prompt: ${prompt_token_count || 0} | Total: ${total_token_count || 0}`);
        }
        
        setStatus("success");
        setLoading(false);
        
      } else if (response.status === 'error') {
        // Error occurred
        setStatus("error");
        setLoading(false);
        
        // Add error message
        setMessages(prev => {
          const filteredPrev = prev.filter(msg => msg.role !== 'loading');
          return [...filteredPrev, { 
            role: 'error', 
            content: response.error || 'An error occurred processing your request', 
            timestamp: formatTimestamp() 
          }];
        });
      } else if (response.status === 'processing' && response.browser_mode) {
        // Update loading message to indicate browser mode
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'loading') {
            const updatedPrev = [...prev.slice(0, -1)];
            return [...updatedPrev, {
              role: 'loading',
              content: `Thinking... (${response.browser_mode === 'visible' ? 'Browser window should open shortly' : 'Headless browser mode'})`,
              timestamp: formatTimestamp()
            }];
          }
          return prev;
        });
      }
      // Status is 'processing' - keep the loading state
      
    } else if (response.type === 'log') {
      // Log message from server - update the loading message
      console.log('Server log message:', response.message);
      
      // Only update if we're still loading
      if (loading) {
        setMessages(prev => {
          // Find the loading message
          const loadingIndex = prev.findIndex(msg => msg.role === 'loading');
          if (loadingIndex !== -1) {
            // Create a new array with the updated loading message
            const updatedMessages = [...prev];
            updatedMessages[loadingIndex] = {
              ...updatedMessages[loadingIndex],
              content: response.message || 'Thinking...',
              timestamp: formatTimestamp()
            };
            return updatedMessages;
          }
          return prev;
        });
      }
      
    } else if (response.type === 'error') {
      // General error
      setStatus("error");
      setLoading(false);
      
      setMessages(prev => {
        const filteredPrev = prev.filter(msg => msg.role !== 'loading');
        return [...filteredPrev, { 
          role: 'error', 
          content: response.message || 'An unexpected error occurred', 
          timestamp: formatTimestamp() 
        }];
      });
    } else if (response.type === 'pong') {
      // Pong response - just log it
      console.log('Received pong response');
    }
  };

  // Scroll handling logic
  useEffect(() => {
    scrollToBottom();
    const checkScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
      }
    };
    
    checkScroll();
    messagesContainerRef.current?.addEventListener('scroll', checkScroll);
    
    return () => {
      messagesContainerRef.current?.removeEventListener('scroll', checkScroll);
    };
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Only automatically scroll if the user was already at the bottom
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        
        // Auto-scroll if at bottom or if new messages added
        if (isAtBottom || messages.length > prevMessagesLength.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
        
        prevMessagesLength.current = messages.length;
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
      }
    };
    
    messagesContainerRef.current?.addEventListener('scroll', handleScroll);
    return () => messagesContainerRef.current?.removeEventListener('scroll', handleScroll);
  }, []);

  function formatTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: formatTimestamp()
    };
    
    const loadingMessage = {
      role: 'loading',
      content: 'Thinking...',
      timestamp: formatTimestamp()
    };
    
    // Clear input and add user message + loading indicator
    setInput("");
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setLoading(true);
    setStatus("loading");
    
    try {
      // Try WebSocket first if available
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        console.log('Using WebSocket for query');
        const success = owlApiService.sendWebSocketQuery(wsRef.current, input, selectedModule);
        
        if (!success) {
          // If WebSocket query fails, fall back to REST API
          console.log('WebSocket send failed, falling back to REST API');
          await sendRESTQuery(input);
        }
      } else {
        // Fall back to HTTP API
        console.log('WebSocket not available, using REST API');
        await sendRESTQuery(input);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setStatus("error");
      
      // Add error message
      setMessages(prev => {
        const filteredPrev = prev.filter(msg => msg.role !== 'loading');
        return [...filteredPrev, { 
          role: 'error', 
          content: error.formattedMessage || 'An error occurred processing your request', 
          timestamp: formatTimestamp() 
        }];
      });
      
      setLoading(false);
    }
  };
  
  // Helper function to send query via REST API
  const sendRESTQuery = async (query: string) => {
    try {
      const result = await owlApiService.runQuery({
        query,
        module: selectedModule
      });
      
      // Update messages with response
      setMessages(prev => {
        const filteredPrev = prev.filter(msg => msg.role !== 'loading');
        if (result.chat_history && result.chat_history.length > 0) {
          // Use the complete chat history if available
          return result.chat_history.map(msg => ({
            ...msg,
            timestamp: formatTimestamp()
          }));
        } else {
          // Otherwise just append the answer as a message
          return [
            ...filteredPrev, 
            { 
              role: 'assistant', 
              content: result.answer, 
              timestamp: formatTimestamp() 
            }
          ];
        }
      });
      
      setTokenCount(result.tokenCount);
      setStatus("success");
      setLoading(false);
    } catch (error) {
      throw error; // Let the main handler catch this
    }
  };

  return (
    <div className="premium-card conversation-panel flex flex-col overflow-hidden rounded-xl border border-border/20 bg-gradient-to-br from-background to-background/80 shadow-xl backdrop-blur-sm mt-0">
      <div className="flex items-center justify-between border-b border-border/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-medium tracking-tight">Camel Multi-Agent Chat</h2>
            <p className="text-xs text-muted-foreground">
              Using <span className="font-medium text-primary">{selectedModule}</span> module
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicator status={status} />
          <span className={cn(
            "text-sm font-medium transition-colors",
            status === "loading" ? "text-amber-500" :
            status === "success" ? "text-emerald-500" :
            status === "error" ? "text-rose-500" : "text-muted-foreground"
          )}>
            {status === "loading" ? "Processing..." :
             status === "success" ? "Ready" :
             status === "error" ? "Error" : "Ready"}
          </span>
        </div>
      </div>

      {/* Messages container - fixed height with scrolling */}
      <div 
        ref={messagesContainerRef}
        className="custom-scrollbar relative flex-1 overflow-y-auto p-6 min-h-[450px] max-h-[650px] space-y-5"
        style={{ overflowAnchor: "auto" }}
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full items-center justify-center"
            >
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
                  <Sparkles className="h-10 w-10 text-primary/40" />
                </div>
                <p className="text-muted-foreground">
                  Start a conversation with the Camel AI multi-agent system
                </p>
                <p className="mt-2 text-sm text-muted-foreground/60">
                  Your query will be processed by specialized agents working together
                </p>
              </div>
            </motion.div>
          ) : (
            messages.map((message, i) => (
              // Skip rendering loading messages if there's a response
              message.role !== 'loading' || i === messages.length - 1 ? (
                <MessageBubble key={i} message={message} />
              ) : null
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
        
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={scrollToBottom}
            className="premium-button-subtle absolute bottom-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-md"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.button>
        )}
      </div>

      {/* Token counter */}
      {tokenCount && (
        <div className="border-t border-border/10 px-6 py-3">
          <p className="font-mono text-xs text-muted-foreground text-right">
            {tokenCount}
          </p>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-border/10 bg-muted/20 p-4">
        <div className="flex gap-2 px-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Submit on Enter without Shift
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Type your question here..."
            className="premium-input flex-1 min-h-[80px] resize-none rounded-2xl border border-border/20 bg-background/60 px-5 py-4 text-sm leading-relaxed shadow-inner backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/30 focus-visible:border-blue-400/20 font-light"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="premium-button self-end inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500/90 via-blue-600 to-blue-500/90 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_2px_8px_rgba(59,130,246,0.1)] transition-all hover:shadow-[0_0_0_1px_rgba(59,130,246,0.3),0_4px_12px_rgba(59,130,246,0.2)] hover:translate-y-[-1px]"
          >
            {loading ? 
              <Loader2 className="h-4 w-4 animate-spin" /> : 
              <Send className="h-4 w-4" />
            }
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isLoading = message.role === "loading";
  const isError = message.role === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
      className={cn(
        "flex w-max max-w-[85%] flex-col gap-2 rounded-2xl px-5 py-4",
        isUser
          ? "ml-auto premium-user-message border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 text-foreground"
          : isLoading
          ? "premium-loading-message border border-border/20 bg-gradient-to-br from-background to-muted/30 text-foreground shadow-sm"
          : isError
          ? "premium-error-message border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/5 text-foreground shadow-sm"
          : "premium-ai-message border border-border/20 bg-gradient-to-br from-background to-muted/30 text-foreground shadow-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs font-medium",
          isUser ? "text-primary" : 
          isLoading ? "text-amber-500" :
          isError ? "text-rose-500" : 
          "text-muted-foreground"
        )}>
          {isUser ? "You" : 
           isLoading ? "AI Assistant" : 
           isError ? "Error" :
           "AI Assistant"}
        </span>
        {message.timestamp && (
          <span className="text-[10px] text-muted-foreground/50 ml-3">
            {message.timestamp}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <div className="flex space-x-1">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: "0ms" }}></div>
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: "300ms" }}></div>
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" style={{ animationDelay: "600ms" }}></div>
          </div>
        </div>
      ) : (
        <p className={cn(
          "whitespace-pre-wrap leading-relaxed",
          isError && "text-rose-600"
        )}>
          {message.content}
        </p>
      )}
      {message.token_count && !isLoading && !isError && (
        <span className="text-[10px] text-muted-foreground/50 text-right">
          Tokens: {message.token_count}
        </span>
      )}
    </motion.div>
  );
}

function StatusIndicator({ status }: { status: "idle" | "loading" | "success" | "error" }) {
  return (
    <div className="relative flex h-3 w-3 items-center justify-center">
      <div
        className={cn(
          "absolute h-full w-full rounded-full",
          status === "loading" && "bg-amber-500",
          status === "success" && "bg-emerald-500",
          status === "error" && "bg-rose-500",
          status === "idle" && "bg-gray-400"
        )}
      />
      {status === "loading" && (
        <>
          <div className="absolute h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
          <div className="absolute h-[10px] w-[10px] animate-pulse rounded-full bg-amber-500/30" />
        </>
      )}
    </div>
  );
} 