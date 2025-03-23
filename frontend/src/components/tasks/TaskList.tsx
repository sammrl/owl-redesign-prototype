import React, { useState, useEffect } from 'react';
import { taskService, Task, TaskStatus } from '../../services/tasks';
import { TaskViewer } from './TaskViewer';

interface TaskListProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const TaskList: React.FC<TaskListProps> = ({
  limit = 10,
  autoRefresh = true,
  refreshInterval = 10000
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch tasks
  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const taskList = await taskService.listTasks(
        filter ? filter as TaskStatus : undefined,
        limit
      );
      setTasks(taskList);
    } catch (err: any) {
      setError(err.message || 'Error fetching tasks');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Initial fetch and set up auto-refresh
  useEffect(() => {
    fetchTasks();
    
    // Set up auto-refresh if enabled
    let intervalId: number | undefined;
    
    if (autoRefresh) {
      intervalId = window.setInterval(fetchTasks, refreshInterval);
    }
    
    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [filter, limit, autoRefresh, refreshInterval]);
  
  // Handle task selection
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId === selectedTaskId ? null : taskId);
  };
  
  // Get status color
  const getStatusColor = (status: TaskStatus): string => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case TaskStatus.FAILED:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case TaskStatus.CANCELED:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case TaskStatus.RUNNING:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case TaskStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (err) {
      return dateStr;
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tasks</h2>
          
          <div className="flex mt-2 sm:mt-0 space-x-2">
            <select
              className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md p-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as TaskStatus | '')}
            >
              <option value="">All</option>
              <option value={TaskStatus.PENDING}>Pending</option>
              <option value={TaskStatus.RUNNING}>Running</option>
              <option value={TaskStatus.COMPLETED}>Completed</option>
              <option value={TaskStatus.FAILED}>Failed</option>
              <option value={TaskStatus.CANCELED}>Canceled</option>
            </select>
            
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm"
              onClick={fetchTasks}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md">
            {error}
          </div>
        )}
        
        {tasks.length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            {isLoading ? 'Loading tasks...' : 'No tasks found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tasks.map(task => (
                  <tr 
                    key={task.id}
                    onClick={() => handleTaskSelect(task.id)}
                    className={
                      task.id === selectedTaskId 
                        ? 'bg-blue-50 dark:bg-blue-900/20 cursor-pointer' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer'
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {task.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {task.type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status as TaskStatus)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(task.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {(task.status === TaskStatus.PENDING || task.status === TaskStatus.RUNNING) && (
                        <button
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 mr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            taskService.cancelTask(task.id).then(fetchTasks);
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskSelect(task.id);
                        }}
                      >
                        {task.id === selectedTaskId ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {selectedTaskId && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <TaskViewer 
            taskId={selectedTaskId} 
            onTaskComplete={fetchTasks}
          />
        </div>
      )}
    </div>
  );
}; 