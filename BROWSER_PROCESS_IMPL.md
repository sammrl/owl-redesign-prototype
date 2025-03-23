# Browser Process Implementation for OWL

This document provides an overview of the browser process implementation in the OWL API.

## Overview

The implementation follows a process-based approach to handling browser operations, which improves stability and isolates browser tasks in separate processes to prevent threading issues.

## Components

1. **Browser Process Worker**
   - Located in `owl_api/services/browser_process.py`
   - Runs in a separate process dedicated to browser operations
   - Handles browser initialization, execution, and result handling
   - Communicates with the main process via message queues

2. **Browser Process Pool**
   - Located in `owl_api/services/process_pool.py`
   - Manages multiple browser worker processes
   - Handles task distribution, monitoring, and status updates
   - Provides a clean API for submitting browser tasks

3. **OWL Runner Integration**
   - Located in `owl_api/services/owl_runner.py`
   - Detects when to use the browser process pool based on module name and configuration
   - Routes requests to either the standard process pool or the browser process pool

4. **WebSocket Status Updates**
   - Located in `owl_api/ws/chat.py`
   - Enhanced to provide real-time updates on browser process status
   - Communicates browser window visibility and task progress to clients

## Testing

You can test the implementation by using the included browser test script:

```bash
# Start the API server
python owl_api/main.py

# In a separate terminal, run the test browser script
python examples/run_test_browser.py
```

This should launch a visible Chrome window and execute a simple browser task.

## API Usage

The API interface remains unchanged, but now handles browser operations more robustly:

```bash
# Test with curl
curl -X POST http://localhost:8000/api/run/async \
  -H "Content-Type: application/json" \
  -d '{"query": "Visit example.com and tell me what you see", "module": "run_mini"}'
```

## Implementation Details

1. **Process Isolation**: Each browser task runs in its own dedicated process to prevent threading issues.
2. **Environment Variable Handling**: Environment variables are properly passed to worker processes.
3. **Error Handling**: Comprehensive error handling ensures that browser failures don't crash the API server.
4. **Status Updates**: Detailed status updates are provided to clients via WebSockets.
5. **Resource Management**: Processes are properly terminated and resources are cleaned up.

## Future Improvements

- Implement process recycling to improve performance
- Add browser process health monitoring
- Implement automatic browser installation if not found
- Add browser session management for more complex tasks