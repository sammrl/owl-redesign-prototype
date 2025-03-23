import React, { useState } from 'react';
import { taskService } from '../../services/tasks';
import { TaskViewer } from './TaskViewer';

interface TaskExecutorProps {
  placeholder?: string;
  showToolRecs?: boolean;
  contextData?: Record<string, any>;
}

export const TaskExecutor: React.FC<TaskExecutorProps> = ({
  placeholder = 'Enter your query...',
  showToolRecs = false,
  contextData = {}
}) => {
  const [query, setQuery] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle query submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Execute the task
      const result = await taskService.executeTask({
        type: "user_query",
        params: {
          query: query,
          context: contextData
        }
      });
      setTaskId(result.taskId);
    } catch (err: any) {
      setError(err.message || 'Error executing task');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset the form
  const handleReset = () => {
    setTaskId(null);
    setQuery('');
    setError(null);
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Execute Task</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <textarea
              className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder={placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              disabled={isSubmitting || taskId !== null}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            {taskId !== null && (
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={handleReset}
              >
                New Task
              </button>
            )}
            
            {taskId === null && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting || !query.trim()}
              >
                {isSubmitting ? 'Submitting...' : 'Execute'}
              </button>
            )}
          </div>
        </form>
      </div>
      
      {taskId && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <TaskViewer 
            taskId={taskId} 
            pollInterval={1000}
          />
        </div>
      )}
    </div>
  );
}; 