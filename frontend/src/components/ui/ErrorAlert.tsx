import React, { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorAlertProps {
  message: string;
  onClose?: () => void;
  showRetry?: boolean;
  onRetry?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onClose, showRetry = false, onRetry }) => {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      
      return () => clearTimeout(timer);
    }
  }, [onClose]);

  return (
    <AnimatePresence mode="sync">
      {message && (
        <motion.div
          key="error-alert"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="premium-card fixed left-1/2 top-6 z-50 flex w-[90%] max-w-[600px] -translate-x-1/2 items-center gap-3 rounded-lg bg-red-50 px-4 py-3 shadow-md dark:bg-red-900/20"
        >
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex-1 text-sm font-light text-red-800 dark:text-red-200">
            {message}
          </div>
          <div className="flex gap-2">
            {showRetry && (
              <button 
                onClick={onRetry}
                className="rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-200 dark:bg-red-800/30 dark:text-red-200 dark:hover:bg-red-800/50"
              >
                Retry
              </button>
            )}
            {onClose && (
              <button 
                onClick={onClose}
                className="ml-auto rounded-md px-1.5 py-1 text-xs text-red-600 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-800/30"
              >
                Dismiss
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ErrorAlert; 