import axios from 'axios';

// API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create an axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types for task management
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  NOT_FOUND = 'not_found',
}

export interface Task {
  id: string;
  status: TaskStatus;
  type?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
  error?: string;
  parent_id?: string;
  subtask_ids?: string[];
}

export interface TaskExecuteRequest {
  type: string;
  params: Record<string, any>;
}

// Task service
export const taskService = {
  /**
   * Execute a task based on a user query
   * @param request The task execution request
   */
  async executeTask(request: TaskExecuteRequest): Promise<{ taskId: string }> {
    try {
      const response = await api.post('/tasks/execute', request);
      
      if (response.data.status === 'error') {
        throw new Error(response.data.error);
      }
      
      // Handle the task_id field from the API response
      return { 
        taskId: response.data.task_id || response.data.taskId
      };
    } catch (error: any) {
      console.error('Error executing task:', error);
      throw new Error(error.message || 'Error executing task');
    }
  },
  
  /**
   * Get the status and result of a task
   * @param taskId The ID of the task to check
   */
  async getTaskStatus(taskId: string): Promise<Task> {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error: any) {
      console.error(`Error checking task status for ${taskId}:`, error);
      throw new Error(error.message || 'Error checking task status');
    }
  },
  
  /**
   * List tasks, optionally filtered by status
   * @param status Optional status to filter by
   * @param limit Maximum number of tasks to return
   * @param offset Offset for pagination
   */
  async listTasks(status?: TaskStatus, limit: number = 10, offset: number = 0): Promise<Task[]> {
    try {
      const url = status 
        ? `/tasks?status=${status}&limit=${limit}&offset=${offset}`
        : `/tasks?limit=${limit}&offset=${offset}`;
        
      const response = await api.get(url);
      
      // Handle both response formats - direct array or {tasks: [...]}
      const tasks = Array.isArray(response.data) 
        ? response.data 
        : (response.data.tasks || []);
      
      return tasks;
    } catch (error: any) {
      console.error('Error listing tasks:', error);
      throw new Error(error.message || 'Error listing tasks');
    }
  },
  
  /**
   * Cancel a task
   * @param taskId The ID of the task to cancel
   * @param reason Optional reason for cancellation
   */
  async cancelTask(taskId: string, reason?: string): Promise<{ success: boolean }> {
    try {
      const url = reason
        ? `/tasks/${taskId}/cancel?reason=${encodeURIComponent(reason)}`
        : `/tasks/${taskId}/cancel`;
        
      const response = await api.post(url);
      
      if (response.data.status === 'error') {
        throw new Error(response.data.error);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error(`Error canceling task ${taskId}:`, error);
      return { success: false };
    }
  },
  
  /**
   * Poll for task completion
   * @param taskId The ID of the task to poll
   * @param interval Polling interval in milliseconds
   * @param timeout Maximum time to poll in milliseconds
   */
  async pollTaskCompletion(
    taskId: string, 
    interval: number = 1000, 
    timeout: number = 300000
  ): Promise<Task> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const task = await this.getTaskStatus(taskId);
      
      if ([
        TaskStatus.COMPLETED, 
        TaskStatus.FAILED, 
        TaskStatus.CANCELED
      ].includes(task.status as TaskStatus)) {
        return task;
      }
      
      // Wait for the next polling interval
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Task polling timed out');
  },
  
  /**
   * Clean up old tasks
   * @param maxAgeHours Maximum age of tasks to keep in hours
   */
  async cleanupTasks(maxAgeHours: number = 24): Promise<{ success: boolean }> {
    try {
      const response = await api.get(`/tasks/cleanup/${maxAgeHours}`);
      
      if (response.data.status === 'error') {
        throw new Error(response.data.error);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error cleaning up tasks:', error);
      return { success: false };
    }
  }
};

export default taskService; 