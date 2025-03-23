import axios from 'axios';

// Get environment variables
const VITE_API_URL = import.meta.env.VITE_API_URL;
const API_BASE_URL = VITE_API_URL || 'http://localhost:8000';

// Create an axios instance for browser API
const browserApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, 
});

export interface BrowserNavigateParams {
  url: string;
  session_id?: string;
}

export interface BrowserExtractParams {
  url: string;
  selector?: string;
  session_id?: string;
}

export interface BrowserActionParams {
  url: string;
  task: string;
  session_id?: string;
}

export interface BrowserResponse {
  success: boolean;
  session_id?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Browser automation service for interacting with web pages
 */
const browserService = {
  currentSessionId: null as string | null,
  
  /**
   * Get the current session ID or use the one provided
   */
  _getSessionId(providedId?: string) {
    return providedId || this.currentSessionId;
  },
  
  /**
   * Set the current session ID
   */
  _setSessionId(sessionId: string) {
    this.currentSessionId = sessionId;
    return sessionId;
  },

  /**
   * Navigate to a URL
   */
  async navigate(params: BrowserNavigateParams): Promise<BrowserResponse> {
    try {
      const sessionId = this._getSessionId(params.session_id);
      const response = await browserApi.post('/browser/navigate', {
        ...params,
        session_id: sessionId
      });
      
      if (response.data.session_id) {
        this._setSessionId(response.data.session_id);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error navigating browser:', error);
      return {
        success: false,
        error: error.message || 'Failed to navigate'
      };
    }
  },

  /**
   * Extract content from a web page
   */
  async extract(params: BrowserExtractParams): Promise<BrowserResponse> {
    try {
      const sessionId = this._getSessionId(params.session_id);
      const response = await browserApi.post('/browser/extract', {
        ...params,
        session_id: sessionId
      });
      
      if (response.data.session_id) {
        this._setSessionId(response.data.session_id);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error extracting from browser:', error);
      return {
        success: false,
        error: error.message || 'Failed to extract content'
      };
    }
  },
  
  /**
   * Perform a custom action described in natural language
   */
  async performAction(params: BrowserActionParams): Promise<BrowserResponse> {
    try {
      const sessionId = this._getSessionId(params.session_id);
      const response = await browserApi.post('/browser/action', {
        ...params,
        session_id: sessionId
      });
      
      if (response.data.session_id) {
        this._setSessionId(response.data.session_id);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error performing browser action:', error);
      return {
        success: false,
        error: error.message || 'Failed to perform action'
      };
    }
  },
  
  /**
   * Close a browser session
   */
  async closeSession(session_id?: string): Promise<BrowserResponse> {
    try {
      const sessionId = this._getSessionId(session_id);
      if (!sessionId) {
        return {
          success: false,
          error: 'No session ID provided or stored'
        };
      }
      
      const response = await browserApi.post('/browser/sessions/close', {
        session_id: sessionId
      });
      
      if (response.data.success && sessionId === this.currentSessionId) {
        this.currentSessionId = null;
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error closing browser session:', error);
      return {
        success: false,
        error: error.message || 'Failed to close session'
      };
    }
  },
  
  /**
   * Simple Amazon product search demo
   */
  async amazonSearch(keyword: string): Promise<BrowserResponse> {
    try {
      const response = await browserApi.get('/browser/amazon-search', {
        params: { keyword }
      });
      
      if (response.data.session_id) {
        this._setSessionId(response.data.session_id);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error searching Amazon:', error);
      return {
        success: false,
        error: error.message || 'Failed to search Amazon'
      };
    }
  }
};

export default browserService; 