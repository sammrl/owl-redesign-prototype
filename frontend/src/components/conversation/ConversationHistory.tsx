import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Clock, Calendar } from "lucide-react";
import { cn } from "../../lib/utils";

// Create mock conversation history data
const mockConversations = [
  {
    id: "1",
    title: "Web search for latest AI news",
    preview: "I'm looking for the latest developments in artificial intelligence...",
    timestamp: "Today, 10:42 AM",
    date: "Today"
  },
  {
    id: "2",
    title: "Help with Python code debugging",
    preview: "I'm getting an IndexError in my list comprehension...",
    timestamp: "Today, 9:15 AM",
    date: "Today"
  },
  {
    id: "3",
    title: "Summarize research paper",
    preview: "Can you summarize this paper on transformer architectures?",
    timestamp: "Yesterday, 3:30 PM",
    date: "Yesterday"
  },
  {
    id: "4",
    title: "Weather forecast analysis",
    preview: "What's the weather trend for San Francisco next week?",
    timestamp: "Yesterday, 11:20 AM",
    date: "Yesterday"
  },
  {
    id: "5",
    title: "Stock price prediction",
    preview: "Can you analyze AAPL stock performance?",
    timestamp: "Mar 15, 2:45 PM",
    date: "Mar 15"
  }
];

// Group conversations by date
const groupByDate = (conversations: typeof mockConversations) => {
  const groups: Record<string, typeof mockConversations> = {};
  
  for (const convo of conversations) {
    if (!groups[convo.date]) {
      groups[convo.date] = [];
    }
    groups[convo.date].push(convo);
  }
  
  return groups;
};

interface ConversationHistoryProps {
  onSelectConversation?: (conversationId: string) => void;
}

export function ConversationHistory({ onSelectConversation }: ConversationHistoryProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const groupedConversations = groupByDate(mockConversations);

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    if (onSelectConversation) {
      onSelectConversation(conversationId);
    }
  };

  return (
    <div className="premium-card w-full h-full overflow-hidden rounded-xl border border-border/20 bg-gradient-to-br from-background to-background/80 shadow-xl backdrop-blur-sm p-3 flex flex-col">
      <div className="mb-2 flex items-center gap-2 flex-shrink-0">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <MessageSquare className="h-3 w-3 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-medium tracking-tight">Conversation History</h2>
          <p className="text-xs text-muted-foreground">Your recent conversations</p>
        </div>
      </div>
      
      <div className="custom-scrollbar flex-grow overflow-y-auto pr-2">
        {Object.entries(groupedConversations).map(([date, conversations]) => (
          <div key={date} className="mb-2 last:mb-0">
            <div className="mb-1 flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <h3 className="text-[10px] font-medium uppercase text-muted-foreground">{date}</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-1">
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  isSelected={selectedConversation === conversation.id}
                  onSelect={handleConversationSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ConversationCardProps {
  conversation: typeof mockConversations[0];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function ConversationCard({ conversation, isSelected, onSelect }: ConversationCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-lg border p-2",
        "transition-all duration-200 ease-in-out",
        isSelected 
          ? "premium-module-selected border-primary/40 bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary),0.2),0_2px_4px_rgba(var(--primary),0.1)]" 
          : "border-border/40 hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium truncate">{conversation.title}</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">{conversation.preview}</p>
          <div className="mt-1 flex items-center text-[10px] text-muted-foreground/70">
            <Clock className="mr-1 h-2.5 w-2.5" />
            <span>{conversation.timestamp}</span>
          </div>
        </div>
      </div>
      
      {isSelected && (
        <motion.div
          layoutId="conversationHighlight"
          className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-primary/80 via-primary to-primary/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
} 