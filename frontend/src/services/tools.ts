import axios from 'axios';

// Types for tool registry
export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: any;
}

export interface Tool {
  name: string;
  description: string;
  category: string;
  parameters: ToolParameter[];
}

export interface ToolSuggestion {
  name: string;
  description: string;
  category: string;
  confidence: number;
  reasoning?: string;
}

// Get the API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tool registry service
export const toolService = {
  /**
   * Get all tools, optionally filtered by category
   * @param category Optional category to filter tools
   */
  async getTools(category?: string): Promise<Tool[]> {
    try {
      const url = category ? `/tools?category=${category}` : '/tools';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching tools:', error);
      return [];
    }
  },

  /**
   * Get all tool categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const response = await api.get('/tools/categories');
      return response.data;
    } catch (error) {
      console.error('Error fetching tool categories:', error);
      return [];
    }
  },

  /**
   * Get detailed information about a specific tool
   * @param toolName Name of the tool to get info for
   */
  async getToolInfo(toolName: string): Promise<Tool | null> {
    try {
      const response = await api.get(`/tools/${toolName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching info for tool ${toolName}:`, error);
      return null;
    }
  },

  /**
   * Get tool suggestions based on a query and optional context
   * @param query The user query to get suggestions for
   * @param context Optional conversation context
   */
  async suggestTools(query: string, context?: any[]): Promise<ToolSuggestion[]> {
    try {
      const response = await api.post('/tools/suggest', {
        query,
        context
      });
      return response.data;
    } catch (error) {
      console.error('Error getting tool suggestions:', error);
      return [];
    }
  },

  /**
   * Execute a tool with the given parameters
   * @param toolName Name of the tool to execute
   * @param parameters Parameters to pass to the tool
   */
  async executeTool(toolName: string, parameters: Record<string, any>): Promise<any> {
    try {
      const response = await api.post('/tools/execute', {
        tool_name: toolName,
        parameters
      });
      
      if (response.data.status === 'error') {
        throw new Error(response.data.error);
      }
      
      return response.data.result;
    } catch (error: any) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw new Error(error.message || 'Error executing tool');
    }
  }
};

export default toolService; 