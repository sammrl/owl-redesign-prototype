import axios from 'axios';

// Get environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

console.log('API Backend URL:', API_BASE_URL);

// Create an axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds timeout for long-running operations
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Required for cross-origin requests if using credentials
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`📡 Making request to ${config.url}`, config);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response from ${response.config.url}:`, response);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error);
    
    // Format error message for better display
    let errorMessage = 'An unknown error occurred';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = `Server error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'No response from server. Please check your connection or the server status.';
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = error.message;
    }
    
    // Add the formatted error message to the error object
    error.formattedMessage = errorMessage;
    return Promise.reject(error);
  }
);

// Define TypeScript interfaces
export interface QueryParams {
  query: string;
  module?: string;
}

export interface EnvVar {
  key: string;
  value: string;
}

export interface TokenInfo {
  completion_token_count: number;
  prompt_token_count: number;
  total_token_count: number;
}

export interface Message {
  role: string;
  content: string;
  token_count?: number;
}

export interface QueryResult {
  answer: string;
  tokenCount: string;
  status: string;
  chat_history?: Message[];
}

export interface TaskInfo {
  task_id: string;
  query: string;
  module: string;
  status: string;
  result?: any;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

export interface LogFile {
  filename: string;
  size: number;
  created: string;
  entries_count: number;
}

export interface Conversation {
  id: string;
  timestamp: string;
  query: string;
  module: string;
  summary?: string;
}

// API interface for the OWL API
export const owlApiService = {
  /**
   * Run a query against the OWL system using async API
   * @param params Query parameters
   */
  async runQuery({ query, module = 'run' }: QueryParams): Promise<QueryResult> {
    try {
      // Start the asynchronous task
      const startResponse = await api.post('/run/async', {
        query,
        module
      });
      
      if (!startResponse.data?.task_id) {
        throw new Error('No task ID returned from API');
      }
      
      const taskId = startResponse.data.task_id;
      console.log(`Task started with ID: ${taskId}`);
      
      // Poll for completion (every 1 second, max 60 seconds)
      let completed = false;
      let result = null;
      let retries = 0;
      const maxRetries = 60;
      
      while (!completed && retries < maxRetries) {
        // Wait 1 second before polling
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
        
        // Check task status
        const statusResponse = await api.get(`/run/task/${taskId}`);
        console.log(`Polling task ${taskId}, attempt ${retries}/${maxRetries}, status: ${statusResponse.data.status}`);
        
        if (statusResponse.data.status === 'completed') {
          completed = true;
          result = statusResponse.data.result;
        } else if (statusResponse.data.status === 'error') {
          throw new Error(statusResponse.data.error || 'Task failed');
        }
        // Status is still 'running', continue polling
      }
      
      if (!completed) {
        throw new Error('Task timed out after 60 seconds');
      }
      
      // Format the token counts
      const { token_info, chat_history } = result;
      const completionTokens = token_info?.completion_token_count || 0;
      const promptTokens = token_info?.prompt_token_count || 0;
      const totalTokens = token_info?.total_token_count || (completionTokens + promptTokens);
      const tokenCountStr = `Completion: ${completionTokens} | Prompt: ${promptTokens} | Total: ${totalTokens}`;
      
      return {
        answer: result.answer,
        tokenCount: tokenCountStr,
        status: '✅ Successfully completed',
        chat_history
      };
    } catch (error: any) {
      console.error('Query execution error:', error);
      throw error;
    }
  },
  
  /**
   * Run a query through WebSocket for real-time updates
   * @param onMessage Callback for message updates
   */
  connectWebSocket(onMessage: (data: any) => void): WebSocket | null {
    try {
      // Construct WebSocket URL from the base URL
      const baseUrl = API_BASE_URL;
      // Extract hostname and port
      const urlObj = new URL(baseUrl);
      // The WebSocket endpoint is at /api/run/ws in the backend
      const wsUrl = `ws://${urlObj.hostname}:${urlObj.port || '8000'}/api/run/ws`;
      console.log(`Connecting to WebSocket at ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      // Setup connection timeout
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout');
          ws.close();
          // Notify user with error event
          onMessage({
            type: 'error',
            message: 'Failed to connect to the server via WebSocket. Falling back to HTTP API.'
          });
        }
      }, 5000); // 5 second timeout
      
      ws.onopen = () => {
        console.log('WebSocket connection established');
        clearTimeout(connectionTimeout);
        
        // Send a connection success message to clear any previous error messages
        onMessage({
          type: 'system',
          message: 'WebSocket connection established successfully',
          status: 'connected' // Special flag to clear error messages
        });
        
        // Send an immediate ping to verify the connection works both ways
        try {
          ws.send(JSON.stringify({ 
            type: 'ping',
            time: Date.now()
          }));
          console.log('Sent initial ping to verify connection');
        } catch (e) {
          console.error('Error sending initial ping:', e);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          onMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      // Track if we've ever had a successful connection
      let hasConnected = false;
      
      // Store the original onopen handler
      const originalOnOpen = ws.onopen;
      
      // Replace with our enhanced version
      ws.onopen = (event) => {
        hasConnected = true;
        console.log('WebSocket connected successfully, hasConnected=true');
        
        // Call the original handler if it exists
        if (typeof originalOnOpen === 'function') {
          originalOnOpen.call(ws, event);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
        
        // Only show errors if we had a previously successful connection
        // This prevents showing errors during the initial connection attempts
        if (hasConnected) {
          // Notify user with error event
          onMessage({
            type: 'error',
            message: 'WebSocket connection error. Some features may not work properly.'
          });
        } else {
          console.log('Suppressing WebSocket error notification during initial connection');
        }
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
        clearTimeout(connectionTimeout);
        
        // Only notify if:
        // 1. This wasn't a normal closure (code 1000)
        // 2. We had previously established a connection
        if (event.code !== 1000 && hasConnected) {
          onMessage({
            type: 'error',
            message: `WebSocket connection closed (${event.code}). Real-time updates disabled.`
          });
        } else {
          console.log('Suppressing WebSocket close notification (normal closure or during startup)');
        }
      };
      
      return ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      // Notify about connection error
      onMessage({
        type: 'error',
        message: 'Failed to establish WebSocket connection. Using HTTP API instead.'
      });
      return null;
    }
  },
  
  /**
   * Send a query through an established WebSocket connection
   * @param ws WebSocket connection
   * @param query Query text
   * @param module Module to use
   */
  sendWebSocketQuery(ws: WebSocket, query: string, module: string = 'run'): boolean {
    try {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not open');
        return false;
      }
      
      ws.send(JSON.stringify({ 
        type: 'query',
        query, 
        module 
      }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket query:', error);
      return false;
    }
  },
  
  /**
   * Send a ping to keep the WebSocket connection alive
   * @param ws WebSocket connection
   */
  sendWebSocketPing(ws: WebSocket): boolean {
    try {
      if (ws.readyState !== WebSocket.OPEN) {
        return false;
      }
      
      ws.send(JSON.stringify({ 
        type: 'ping',
        time: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('Error sending WebSocket ping:', error);
      return false;
    }
  },
  
  /**
   * Cancel a running task via WebSocket
   * @param ws WebSocket connection
   * @param taskId Task ID to cancel
   */
  cancelWebSocketTask(ws: WebSocket, taskId: string): boolean {
    try {
      if (ws.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not open');
        return false;
      }
      
      ws.send(JSON.stringify({ 
        type: 'cancel',
        task_id: taskId
      }));
      return true;
    } catch (error) {
      console.error('Error cancelling task via WebSocket:', error);
      return false;
    }
  },
  
  /**
   * Get environment variables from the backend
   */
  async getEnvironmentVariables(): Promise<EnvVar[]> {
    try {
      // First try the API endpoint
      const response = await api.get('/env/api_related');
      
      // Transform response to EnvVar[] format
      return response.data.map((item: any) => ({
        key: item.key,
        value: item.value || '',
      }));
    } catch (error) {
      console.error('Error fetching environment variables:', error);
      
      // Fallback to checking environment status
      try {
        const checkResponse = await api.get('/env/check');
        if (checkResponse.data.status === 'missing') {
          // Return the missing variables as empty
          return checkResponse.data.missing_vars.map((key: string) => ({
            key,
            value: ''
          }));
        }
      } catch (e) {
        console.error('Error checking environment status:', e);
      }
      
      // Return a default if all else fails
      return [{ 
        key: 'OPENAI_API_KEY', 
        value: OPENAI_API_KEY ? '••••••••••••••••••••••••••' : '' 
      }];
    }
  },
  
  /**
   * Check the status of environment variables
   */
  async checkEnvVars(): Promise<{
    status: string;
    missing_vars?: string[];
    message?: string;
  }> {
    try {
      const response = await api.get('/env/check');
      return response.data;
    } catch (error) {
      console.error('Error checking environment variables:', error);
      throw error;
    }
  },
  
  /**
   * Update environment variables on the backend
   * @param variables Array of { key, value } pairs
   */
  async updateEnvVars(variables: EnvVar[]): Promise<any[]> {
    try {
      // Send each variable to the API
      const results = [];
      for (const v of variables) {
        if (v.key && v.value !== undefined) {
          const response = await api.post('/env/set', {
            key: v.key,
            value: v.value
          });
          results.push(response.data);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error updating environment variables:', error);
      throw error;
    }
  },
  
  /**
   * Get available modules
   */
  async getAvailableModules(): Promise<Record<string, string>> {
    try {
      const response = await api.get('/modules');
      return response.data;
    } catch (error) {
      console.error('Error fetching available modules:', error);
      return { 
        "run": "Default mode: Using OpenAI model's default agent collaboration mode, suitable for most tasks." 
      };
    }
  },
  
  /**
   * Get detailed information about a specific module
   * @param moduleName Name of the module
   */
  async getModuleDetails(moduleName: string): Promise<any> {
    try {
      const response = await api.get(`/modules/${moduleName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for module ${moduleName}:`, error);
      throw error;
    }
  },
  
  /**
   * List current tasks
   * @param limit Maximum number of tasks to return
   * @param status Optional status filter
   */
  async listTasks(limit: number = 10, status?: string): Promise<TaskInfo[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (status) {
        params.append('status', status);
      }
      
      const response = await api.get(`/run/tasks?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error listing tasks:', error);
      throw error;
    }
  },
  
  /**
   * Get task details
   * @param taskId Task ID
   */
  async getTaskDetails(taskId: string): Promise<TaskInfo> {
    try {
      const response = await api.get(`/run/task/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting task ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Cancel a task
   * @param taskId Task ID
   */
  async cancelTask(taskId: string): Promise<any> {
    try {
      const response = await api.delete(`/run/task/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`Error cancelling task ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Get log entries
   * @param maxEntries Maximum number of entries to return
   * @param filterText Optional text to filter logs by
   * @param logFile Optional specific log file to read
   */
  async getLogs(maxEntries: number = 100, filterText?: string, logFile?: string): Promise<LogEntry[]> {
    try {
      const params = new URLSearchParams();
      params.append('max_entries', maxEntries.toString());
      if (filterText) {
        params.append('filter_text', filterText);
      }
      if (logFile) {
        params.append('log_file', logFile);
      }
      
      const response = await api.get(`/logs?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting logs:', error);
      throw error;
    }
  },
  
  /**
   * Get available log files
   */
  async getLogFiles(): Promise<LogFile[]> {
    try {
      const response = await api.get('/logs/files');
      return response.data;
    } catch (error) {
      console.error('Error getting log files:', error);
      throw error;
    }
  },
  
  /**
   * Get conversation history
   * @param maxConversations Maximum number of conversations to return
   */
  async getConversationHistory(maxConversations: number = 10): Promise<Conversation[]> {
    try {
      const params = new URLSearchParams();
      params.append('max_conversations', maxConversations.toString());
      
      const response = await api.get(`/logs/conversations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  },
  
  /**
   * Clear a log file
   * @param logFile Optional specific log file to clear
   */
  async clearLogs(logFile?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (logFile) {
        params.append('log_file', logFile);
      }
      
      const response = await api.delete(`/logs/clear?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error clearing logs:', error);
      throw error;
    }
  },
  
  /**
   * Check if backend is reachable
   */
  async checkConnection(): Promise<boolean> {
    try {
      console.log('Checking backend connection to:', API_BASE_URL);
      
      // Try a basic GET to see if the server responds
      try {
        const baseUrl = API_BASE_URL.replace(/\/api$/, '');
        const response = await axios.get(baseUrl, { 
          timeout: 5000  // Short timeout for quick feedback
        });
        console.log('✅ Backend API is accessible:', response.status);
        return true;
      } catch (error: any) {
        console.error('❌ Cannot access backend API:', error.message);
        return false;
      }
    } catch (error: any) {
      console.error('❌ Error in connection check process:', error);
      return false;
    }
  }
};

export default owlApiService;