import React from 'react';
import { motion } from 'framer-motion';
import { Repeat, MessageSquare, Box } from 'lucide-react';
import { Tooltip } from './tooltip';

interface ViewToggleProps {
  currentView: 'history' | 'modules';
  onToggle: () => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ currentView, onToggle }) => {
  return (
    <Tooltip content={`Switch to ${currentView === 'history' ? 'Module Selection' : 'Conversation History'}`}>
      <motion.button
        onClick={onToggle}
        className="view-toggle-button toggle-pulse absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-500/30 shadow-sm border border-white/10 backdrop-blur-md hover:from-blue-400/40 hover:to-indigo-500/40 transition-all duration-300 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 30,
          duration: 0.15 
        }}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Flip Icon */}
          <Repeat className="absolute h-3.5 w-3.5 text-white/90 group-hover:scale-110 transition-transform duration-200" />
          
          {/* Small indicator icons */}
          <motion.div 
            className="absolute bottom-1 left-1.5 h-2 w-2 bg-primary/20 rounded-full flex items-center justify-center"
            animate={{
              opacity: currentView === 'history' ? 1 : 0.4
            }}
          >
            <MessageSquare className="h-1.5 w-1.5 text-white/90" />
          </motion.div>
          
          <motion.div 
            className="absolute bottom-1 right-1.5 h-2 w-2 bg-primary/20 rounded-full flex items-center justify-center"
            animate={{
              opacity: currentView === 'modules' ? 1 : 0.4
            }}
          >
            <Box className="h-1.5 w-1.5 text-white/90" />
          </motion.div>
        </div>
        
        <motion.div 
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: "radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, rgba(79, 70, 229, 0.1) 70%, transparent 100%)",
            filter: "blur(2px)"
          }}
          animate={{
            scale: [0.8, 1.1, 1],
            opacity: [0, 0.3, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
            times: [0, 0.5, 1]
          }}
        />
      </motion.button>
    </Tooltip>
  );
}; 