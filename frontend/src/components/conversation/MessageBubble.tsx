// import React from "react";
import { cn } from "../../lib/utils";
import { BrainCircuit, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Define the props interface
interface MessageBubbleProps {
  type: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

const MessageBubble = ({ type, content, isLoading }: MessageBubbleProps) => {
  const isUser = type === "user";
  
  return (
    <div
      className={cn(
        "flex w-full max-w-3xl gap-3 px-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-secondary/90 to-primary/80 shadow-md">
          <BrainCircuit className="h-4 w-4 text-white" />
        </div>
      )}
      <div
        className={cn(
          "relative group rounded-2xl px-5 py-4 transition-all",
          isUser
            ? "bg-gradient-to-br from-secondary/90 to-primary/80 text-white shadow-md"
            : "bg-background/80 backdrop-blur-sm shadow-sm border border-border/20",
          isLoading && "animate-pulse"
        )}
      >
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // @ts-ignore - ignoring node type for simplicity
              pre({ node, ...props }) {
                return (
                  <div className="not-prose relative my-2 overflow-hidden rounded-xl bg-muted/60 backdrop-blur-sm shadow-inner">
                    <pre {...props} className="overflow-x-auto p-4 text-xs" />
                  </div>
                );
              },
              // @ts-ignore - ignoring node type for simplicity
              code({ node, inline, className, children, ...props }) {
                if (inline) {
                  return (
                    <code
                      className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-xs"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              // Enhance other markdown components
              h1: (props: any) => <h1 className="text-xl font-medium mt-4 mb-2" {...props} />,
              h2: (props: any) => <h2 className="text-lg font-medium mt-3 mb-2" {...props} />,
              h3: (props: any) => <h3 className="text-md font-medium mt-3 mb-1" {...props} />,
              ul: (props: any) => <ul className="my-2 ml-2 list-disc pl-4 space-y-1" {...props} />,
              ol: (props: any) => <ol className="my-2 ml-2 list-decimal pl-4 space-y-1" {...props} />,
              li: (props: any) => <li className="font-light" {...props} />,
              p: (props: any) => <p className="mb-2 font-light leading-relaxed" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
      {isUser && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-background/80 shadow backdrop-blur-sm border border-border/20">
          <User className="h-4 w-4 text-foreground/80" />
        </div>
      )}
    </div>
  );
};

export default MessageBubble; 