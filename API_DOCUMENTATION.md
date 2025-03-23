# OWL API Documentation

This document describes the custom FastAPI backend implementation for the OWL (Optimized Workforce Learning) system. The API provides a modern, efficient interface for interacting with the OWL multi-agent collaboration system.

## API Overview

The OWL API is implemented using FastAPI, providing RESTful endpoints and WebSocket communication for real-time updates. It replaces the original Gradio-based interface with a more powerful and flexible API design.

## Starting the API Server

```bash
# From the project root directory
cd owl_api

# Run with Python directly (development mode)
python main.py

# Or run with uvicorn (production)
uvicorn owl_api.main:app --host 0.0.0.0 --port 8000
```

The server will start on port 8000 by default, or you can specify a different port with the `PORT` environment variable.

## API Endpoints

### Chat/Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/run/async` | POST | Start an asynchronous query |
| `/api/run/task/{task_id}` | GET | Get the status of a specific task |
| `/api/run/task/{task_id}` | DELETE | Cancel a running task |
| `/api/run/tasks` | GET | List all active tasks |
| `/api/run/ws` | WebSocket | Real-time communication endpoint |

### Environment Variable Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/env/variables` | GET | Get all environment variables |
| `/api/env/variables/{key}` | GET | Get a specific environment variable |
| `/api/env/variables` | POST | Set an environment variable |
| `/api/env/variables/{key}` | DELETE | Delete an environment variable |

### Module Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/modules/list` | GET | List available modules |
| `/api/modules/info/{module_name}` | GET | Get information about a specific module |

### Log Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/logs/list` | GET | List available log files |
| `/api/logs/content/{filename}` | GET | Get content of a log file |
| `/api/logs/latest` | GET | Get the latest log entries |

## Using the API

### Example: Starting a Query

```javascript
// Using fetch API
const response = await fetch('http://localhost:8000/api/run/async', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: "What's the weather in New York?",
    module: "run"
  }),
});

const data = await response.json();
console.log('Task ID:', data.task_id);
```

### Example: Getting Task Status

```javascript
// Using fetch API
const taskId = "1234-5678-90ab-cdef"; // From previous response
const response = await fetch(`http://localhost:8000/api/run/task/${taskId}`);
const data = await response.json();

console.log('Task Status:', data.status);
if (data.status === 'completed') {
  console.log('Result:', data.result.answer);
}
```

### Using WebSockets for Real-time Updates

```javascript
// Create WebSocket connection
const ws = new WebSocket('ws://localhost:8000/api/run/ws');

// Connection opened
ws.addEventListener('open', (event) => {
  // Send a query when connection is established
  ws.send(JSON.stringify({
    type: 'query',
    query: "What's the weather in New York?",
    module: "run"
  }));
});

// Listen for messages
ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'status') {
    console.log('Task Status:', data.status);
    if (data.status === 'completed' && data.result) {
      console.log('Result:', data.result.answer);
    }
  } else if (data.type === 'log') {
    console.log('Log Message:', data.message);
  }
});
```

## How It Works

The API communicates with the OWL system through a custom integration layer. Key components include:

1. **Task Management**: Asynchronous task processing with background workers
2. **WebSocket Support**: Real-time updates on task progress and results
3. **Process Pool**: Management of separate processes for browser operations
4. **Error Handling**: Comprehensive error handling and status tracking

## Integration with OWL Core

The API integrates with the core OWL functionality by:

1. Loading modules from the examples directory
2. Constructing OWL societies based on user queries
3. Running OWL agents through the existing framework
4. Managing browser automation through a process pool for isolation

## WebSocket Protocol

The WebSocket implementation follows this protocol:

1. **Client Messages**:
   - `{ "type": "query", "query": "...", "module": "..." }` - Start a new query
   - `{ "type": "cancel", "task_id": "..." }` - Cancel a task

2. **Server Messages**:
   - `{ "type": "status", "task_id": "...", "status": "..." }` - Task status updates
   - `{ "type": "log", "task_id": "...", "message": "..." }` - Log messages
   - `{ "type": "error", "task_id": "...", "error": "..." }` - Error messages

## Error Handling

The API provides detailed error information through:

1. HTTP status codes for REST endpoints
2. Error messages in response bodies
3. WebSocket error messages for real-time communication

## Log Management

The API includes endpoints for accessing and managing log files, providing visibility into system operations and debugging information. 

## Implementation Notes

The API implementation includes several key architectural decisions and recent improvements:

### Process-Based Browser Operations

To solve threading issues with browser operations, the API uses a process-based approach:

1. **Dedicated Process Pool**: Browser operations run in isolated processes to prevent threading conflicts
2. **IPC Communication**: Inter-Process Communication (IPC) via queues for data transfer between processes
3. **Status Monitoring**: Real-time status updates from browser processes to the frontend

### Recent Implementation Improvements

1. **WebSocket URL Construction**
   - Fixed URL construction in frontend's api.ts to properly connect to the backend
   - Changed from string manipulation to proper URL object handling

2. **Task Registry Reference Management**
   - Modified BrowserProcessPool.submit_task to always maintain a reference to the global registry
   - Fixed how registry references are passed between components
   - Added direct imports of the global registry at critical points

3. **Multiprocessing Resource Management**
   - Added proper cleanup of queues, semaphores, and other IPC resources
   - Implemented explicit close and join operations for queues in shutdown functions
   - Added resource cleanup for process termination

4. **Error Handling in WebSocket Connection**
   - Enhanced frontend error handling during connection attempts
   - Added connection status tracking with the hasConnected flag
   - Suppressed error messages during initial connection, only showing errors for disrupted connections
   - Added automatic clearing of error messages when connection is established

5. **Missing Time Import**
   - Added the critical missing import time in chat.py which was causing task creation to fail
   - Fixed task creation and timestamp generation

6. **Registry Persistence and Recovery**
   - Implemented registry snapshot saving to disk
   - Added automatic registry recovery from disk if empty
   - Added emergency task creation for cases where tasks aren't found

7. **Module Reloading for Fresh Registry References**
   - Added forced module reloading to get fresh registry references at critical points
   - Implemented registry consistency checks across different processes

### Known Limitations and Next Steps

While the major architectural issues have been resolved, some challenges remain:

1. **Empty Response Bubbles**: Tasks complete successfully but response content sometimes doesn't appear in chat bubbles
2. **Task Duplication**: Tasks may be processed multiple times
3. **Semaphore Leaks**: Still seeing semaphore leaks at shutdown (reported 48 leaked semaphores)
4. **Module Compatibility**: Currently, only the `run_mini` module is fully functional with the frontend. Other modules may work but haven't been thoroughly tested or integrated with the UI.

These are being addressed as part of ongoing development.

## Advanced Features

### Browser Automation

The API handles browser automation through a process pool to ensure isolation and stability. It automatically detects when a module requires visible browser automation and routes the request accordingly.

### Environment Variable Management

The API provides endpoints for managing environment variables, which are crucial for configuring API keys and other settings used by the OWL system.

#### Environment Manager UI

The frontend implementation includes a sophisticated environment variable management interface that provides:

1. **RESTful Integration**: Fully integrated with the backend environment variable API endpoints
2. **Grouped Variables**: Organizes variables by provider (OpenAI, Azure, Google, etc.)
3. **Secret Handling**: 
   - Secure display of API keys with visibility toggles
   - Password-style inputs for sensitive information
   - Clear indication of which fields contain secrets
4. **Bulk Operations**:
   - Import multiple variables at once from .env format
   - Smart parsing with placeholder detection
   - Validation and error reporting
5. **API Key Testing**: Direct testing of API keys (e.g., OpenAI) to verify connectivity
6. **Documentation Links**: Quick access to relevant documentation for each variable type
7. **UX Enhancements**:
   - Show/hide optional fields
   - Filter to show only configured values
   - Clear descriptions and default values

This component (`frontend/src/components/settings/EnvironmentManager.tsx`) demonstrates a comprehensive approach to configuration management, focusing on developer experience and ease of use.

### Log Management

The API includes endpoints for accessing and managing log files, providing visibility into system operations and debugging information. 