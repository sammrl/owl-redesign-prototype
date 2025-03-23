import React, { useState, useEffect } from 'react';
import { taskService, Task, TaskStatus } from '../../services/tasks';

interface TaskViewerProps {
  taskId: string;
  pollInterval?: number;
  maxPollDuration?: number;
  onTaskComplete?: (task: Task) => void;
}

export const TaskViewer: React.FC<TaskViewerProps> = ({
  taskId,
  pollInterval = 1000,
  maxPollDuration = 300000, // 5 minutes
  onTaskComplete
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Function to fetch task status
  const fetchTaskStatus = async () => {
    try {
      setError(null);
      const taskData = await taskService.getTaskStatus(taskId);
      setTask(taskData);
      return taskData;
    } catch (err: any) {
      setError(err.message || 'Error fetching task status');
      return null;
    }
  };
  
  // Function to poll for task completion
  const pollTaskCompletion = async () => {
    if (isPolling) return;
    
    setIsPolling(true);
    const startTime = Date.now();
    
    try {
      while (Date.now() - startTime < maxPollDuration) {
        const taskData = await fetchTaskStatus();
        
        if (!taskData) {
          // Error occurred during fetch
          await new Promise(resolve => setTimeout(resolve, pollInterval * 5));
          continue;
        }
        
        if ([
          TaskStatus.COMPLETED,
          TaskStatus.FAILED,
          TaskStatus.CANCELED
        ].includes(taskData.status as TaskStatus)) {
          if (onTaskComplete) {
            onTaskComplete(taskData);
          }
          break;
        }
        
        // Wait for the next polling interval
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    } catch (err: any) {
      setError(err.message || 'Error polling for task completion');
    } finally {
      setIsPolling(false);
    }
  };
  
  // Initial fetch when component mounts
  useEffect(() => {
    if (taskId) {
      fetchTaskStatus();
      pollTaskCompletion();
    }
  }, [taskId]);
  
  // Determine status color
  const getStatusColor = (status?: TaskStatus): string => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'text-green-600';
      case TaskStatus.FAILED:
        return 'text-red-600';
      case TaskStatus.CANCELED:
        return 'text-orange-600';
      case TaskStatus.RUNNING:
        return 'text-blue-600';
      case TaskStatus.PENDING:
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };
  
  // Format date string
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (err) {
      return dateStr;
    }
  };
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!task) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Task {task.id.substring(0, 8)}...
          </h3>
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status as TaskStatus)}`}>
            {task.status}
          </span>
        </div>
        
        <div className="mt-2 text-sm">
          <p className="text-gray-500 dark:text-gray-400">
            Type: {task.type || 'Unknown'}
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Created: {formatDate(task.created_at)}
          </p>
          {task.started_at && (
            <p className="text-gray-500 dark:text-gray-400">
              Started: {formatDate(task.started_at)}
            </p>
          )}
          {task.completed_at && (
            <p className="text-gray-500 dark:text-gray-400">
              Completed: {formatDate(task.completed_at)}
            </p>
          )}
        </div>
      </div>
      
      {task.error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-b border-red-200 dark:border-red-900/30">
          <p className="font-medium text-red-800 dark:text-red-200">Error</p>
          <p className="text-red-700 dark:text-red-300">{task.error}</p>
        </div>
      )}
      
      {task.result && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="font-medium mb-2 text-gray-900 dark:text-white">Result</p>
          {typeof task.result === 'string' ? (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md overflow-auto max-h-96">
              <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{task.result}</p>
            </div>
          ) : (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md overflow-auto max-h-96">
              <pre className="text-gray-800 dark:text-gray-200">
                {JSON.stringify(task.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
      
      {task.subtask_ids && task.subtask_ids.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="font-medium mb-2 text-gray-900 dark:text-white">Subtasks</p>
          <ul className="space-y-1">
            {task.subtask_ids.map(subtaskId => (
              <li key={subtaskId} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                {subtaskId.substring(0, 8)}...
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        {(task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING) && (
          <button 
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            onClick={() => taskService.cancelTask(task.id)}
          >
            Cancel Task
          </button>
        )}
        
        {!isPolling && (task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING) && (
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium ml-2"
            onClick={pollTaskCompletion}
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}; 