import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModuleSelector } from '../settings/ModuleSelector';
import { ConversationHistory } from './ConversationHistory';
import { ViewToggle } from '../ui/ViewToggle';

interface SplitLeftPanelProps {
  onSelectModule?: (moduleId: string) => void;
}

export function SplitLeftPanel({ onSelectModule }: SplitLeftPanelProps) {
  const [currentView, setCurrentView] = useState<'history' | 'modules'>('history');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Toggle between history and modules views
  const toggleView = () => {
    setCurrentView(prev => prev === 'history' ? 'modules' : 'history');
  };

  // Function to match height with the conversation panel
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      const conversationPanel = document.querySelector('.conversation-panel');
      if (conversationPanel && containerRef.current) {
        // Get the exact height of the conversation panel
        const panelHeight = conversationPanel.clientHeight;
        // Set our container to the same height
        containerRef.current.style.height = `${panelHeight}px`;
      }
    });

    // Observe the conversation panel for size changes
    const conversationPanel = document.querySelector('.conversation-panel');
    if (conversationPanel) {
      resizeObserver.observe(conversationPanel);
    }

    // Initial update
    setTimeout(() => {
      const conversationPanel = document.querySelector('.conversation-panel');
      if (conversationPanel && containerRef.current) {
        const panelHeight = conversationPanel.clientHeight;
        containerRef.current.style.height = `${panelHeight}px`;
      }
    }, 100);

    return () => {
      if (conversationPanel) {
        resizeObserver.unobserve(conversationPanel);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative flex flex-col justify-center h-full mt-0">
      {/* View toggle button positioned absolutely */}
      <ViewToggle 
        currentView={currentView}
        onToggle={toggleView}
      />
      
      <AnimatePresence mode="wait">
        {currentView === 'history' ? (
          <motion.div
            key="history"
            className="h-full flex items-center"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
          >
            <ConversationHistory />
          </motion.div>
        ) : (
          <motion.div
            key="modules"
            className="h-full flex items-center"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, duration: 0.3 }}
          >
            <ModuleSelector onSelectModule={onSelectModule} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 