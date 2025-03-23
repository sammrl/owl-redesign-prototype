#!/usr/bin/env python3
# ========= Copyright 2023-2024 @ CAMEL-AI.org. All Rights Reserved. =========
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ========= Copyright 2023-2024 @ CAMEL-AI.org. All Rights Reserved. =========

import asyncio
import json
import logging
import uuid
import traceback
import time  # Added missing time import
from typing import Dict, List, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect

from owl_api.services.owl_runner import run_owl_query, TASK_REGISTRY

logger = logging.getLogger(__name__)

# Active WebSocket connections
active_connections: Dict[str, WebSocket] = {}

# Active tasks for WebSocket clients
websocket_tasks: Dict[str, Dict[str, Any]] = {}

class ConnectionManager:
    """WebSocket connection manager"""
    
    def __init__(self):
        """Initialize the connection manager"""
        self.active_connections: Dict[str, WebSocket] = {}
        
    async def connect(self, websocket: WebSocket, client_id: str):
        """Connect a new client
        
        Args:
            websocket: WebSocket connection
            client_id: Client identifier
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected. Total active connections: {len(self.active_connections)}")
        
    def disconnect(self, client_id: str):
        """Disconnect a client
        
        Args:
            client_id: Client identifier
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            logger.info(f"Client {client_id} disconnected. Remaining connections: {len(self.active_connections)}")
            
    async def send_message(self, client_id: str, message: Dict[str, Any]):
        """Send a message to a specific client
        
        Args:
            client_id: Client identifier
            message: Message to send
        """
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)
            
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients
        
        Args:
            message: Message to broadcast
        """
        for client_id in list(self.active_connections.keys()):
            await self.send_message(client_id, message)
            
    async def send_task_updates(self, task_id: str, client_id: str, registry: Dict[str, Dict[str, Any]]):
        """Send task updates to a client
        
        Args:
            task_id: Task identifier
            client_id: Client identifier
            registry: Task registry
        """
        try:
            # Check for completely empty registry - this indicates a severe synchronization issue
            if len(registry) == 0:
                logger.critical(f"Registry is completely empty - process synchronization problem detected")
                
                # Create a fresh instance of the registry directly
                from owl_api.services.owl_runner import run_owl_query
                import importlib
                import sys
                
                # Force reload the module to get fresh instance
                if 'owl_api.services.owl_runner' in sys.modules:
                    logger.info("Reloading owl_runner module to get fresh registry")
                    del sys.modules['owl_api.services.owl_runner']
                
                # Import with fresh registry
                logger.info("Importing fresh registry from owl_runner")
                owl_runner = importlib.import_module('owl_api.services.owl_runner')
                fresh_registry = owl_runner.TASK_REGISTRY
                
                # Check if we got a valid registry
                logger.info(f"Fresh registry has {len(fresh_registry)} tasks")
                
                # Create a special emergency task entry
                logger.info(f"Creating emergency task entry for {task_id}")
                fresh_registry[task_id] = {
                    "status": "processing",
                    "query": "Query information unavailable - emergency recovery",
                    "module": "unknown",
                    "client_id": client_id,
                    "emergency_recovery": True,
                    "created_at": time.time()
                }
                
                # Use the fresh registry
                registry = fresh_registry
                logger.info(f"Using emergency recovery registry with {len(registry)} tasks")
            
            # Normal debug logging
            logger.info(f"Registry status: {len(registry)} tasks. First 10 keys: {list(registry.keys())[:10]}...")
            
            # Check task status initially with enhanced debugging
            if task_id not in registry:
                logger.error(f"Task {task_id} not found in registry for client {client_id}")
                logger.error(f"Registry keys: {list(registry.keys())}")
                logger.error(f"Registry type: {type(registry)}, ID: {id(registry)}")
                
                # Get the absolute latest from the module directly
                import sys
                import importlib
                
                # Force reload the module to get the latest registry
                logger.error("Attempting emergency registry recovery")
                try:
                    # Clear module from sys.modules to force reload
                    if 'owl_api.services.owl_runner' in sys.modules:
                        del sys.modules['owl_api.services.owl_runner']
                        
                    # Reimport to get fresh registry
                    owl_runner = importlib.import_module('owl_api.services.owl_runner')
                    global_registry = owl_runner.TASK_REGISTRY
                    
                    logger.error(f"Emergency registry reload complete - has {len(global_registry)} tasks")
                    logger.error(f"Registry keys: {list(global_registry.keys())}")
                    
                    # Check if task exists in reloaded registry
                    if task_id in global_registry:
                        logger.error(f"Task {task_id} found in reloaded registry")
                        # Use the global registry instead
                        registry = global_registry
                        logger.info(f"Switching to reloaded registry, task exists: {task_id in registry}")
                    else:
                        # Try one last direct registry modification
                        logger.error(f"Task still not found even after reload. Last resort: recreating task entry")
                        
                        # Create a basic placeholder task entry
                        global_registry[task_id] = {
                            "status": "processing",
                            "query": "Query information not available",
                            "module": "unknown",
                            "emergency_recovery": True
                        }
                        
                        registry = global_registry
                        logger.error(f"Emergency task creation complete: {task_id} in registry: {task_id in registry}")
                        
                        # Continue the process, don't return - let it try to use this emergency entry
                except Exception as e:
                    logger.error(f"Emergency recovery failed: {str(e)}")
                    await self.send_message(client_id, {
                        "type": "status",
                        "task_id": task_id,
                        "status": "error",
                        "error": "Task registry desynchronized - please try again"
                    })
                    return
            
            # At this point we should have a registry with the task
            task_info = registry.get(task_id, {})
            last_status = task_info.get("status", "unknown")
            created_in = task_info.get("created_in", "unknown")
            created_at = task_info.get("created_at", "unknown")
            
            logger.info(f"Task {task_id} found, initial status: {last_status}, created_in: {created_in}, created_at: {created_at}")
            logger.info(f"Starting to send updates for task {task_id}, initial status: {last_status}")
            
            # Send initial status with more detailed info
            initial_message = {
                "type": "status",
                "task_id": task_id,
                "status": last_status
            }
            
            # Add browser mode if available
            if "browser_mode" in registry[task_id]:
                initial_message["browser_mode"] = registry[task_id]["browser_mode"]
                # Send an immediate log message about browser mode
                await self.send_message(client_id, {
                    "type": "log",
                    "task_id": task_id,
                    "message": f"Using browser mode: {registry[task_id]['browser_mode']}. " + 
                              ("A browser window should open soon." if registry[task_id]['browser_mode'] == 'visible' else "Using headless browser.")
                })
                
                # Additional browser verification messages
                if registry[task_id]['browser_mode'] == 'visible':
                    await self.send_message(client_id, {
                        "type": "log",
                        "task_id": task_id,
                        "message": "Make sure your system allows Chrome to open windows. Browser operations might take 30-60 seconds to complete."
                    })
            
            # Add browser pool info if available
            if "browser_pool" in registry[task_id] and registry[task_id]["browser_pool"]:
                initial_message["browser_pool"] = True
                await self.send_message(client_id, {
                    "type": "log",
                    "task_id": task_id,
                    "message": "Using dedicated browser process pool for improved stability."
                })
            
            await self.send_message(client_id, initial_message)
            
            # Poll for status changes with enhanced logging
            update_count = 0
            start_time = asyncio.get_event_loop().time()
            timeout = 600  # 10 minute timeout
            
            while last_status == "processing" and task_id in registry:
                update_count += 1
                await asyncio.sleep(0.5)  # Check every 500ms
                
                # Check for timeout
                current_time = asyncio.get_event_loop().time()
                elapsed = current_time - start_time
                if elapsed > timeout:
                    logger.error(f"Task {task_id} timed out after {elapsed:.1f} seconds")
                    await self.send_message(client_id, {
                        "type": "status",
                        "task_id": task_id,
                        "status": "error",
                        "error": f"Task timed out after {elapsed:.1f} seconds"
                    })
                    break
                
                if task_id not in registry:
                    # Task was removed from registry
                    logger.warning(f"Task {task_id} was removed from registry")
                    await self.send_message(client_id, {
                        "type": "status",
                        "task_id": task_id,
                        "status": "error",
                        "error": "Task was cancelled or removed from registry"
                    })
                    break
                    
                current_status = registry[task_id]["status"]
                
                # Check for process status updates even if main status hasn't changed
                if "process_status" in registry[task_id] and update_count % 10 == 0:  # Every ~5 seconds
                    process_status = registry[task_id].get("process_status", "unknown")
                    monitor_status = registry[task_id].get("monitor_status", "unknown")
                    
                    logger.info(f"Task {task_id} process status: {process_status}, monitor status: {monitor_status}")
                    
                    # For user-friendly messages about browser status
                    message = f"Process status: {process_status}, Monitor status: {monitor_status}, Elapsed: {elapsed:.1f}s"
                    if process_status == "processing" and "browser_mode" in registry[task_id]:
                        if registry[task_id]["browser_mode"] == "visible":
                            message = f"Browser operation in progress... (elapsed: {elapsed:.1f}s)"
                        else:
                            message = f"Headless browser operation in progress... (elapsed: {elapsed:.1f}s)"
                    
                    # Send detailed status update to client
                    await self.send_message(client_id, {
                        "type": "log",
                        "task_id": task_id,
                        "message": message,
                        "time": current_time
                    })
                
                # Check for browser pool specific status updates
                if "browser_pool" in registry[task_id] and registry[task_id]["browser_pool"]:
                    # For browser pool tasks, check monitor_status for detailed updates
                    if "monitor_status" in registry[task_id] and registry[task_id]["monitor_status"] != "waiting":
                        monitor_message = registry[task_id]["monitor_status"]
                        
                        # Only send the message if it looks like a user-facing message (not an internal status)
                        if len(monitor_message) > 10 and not monitor_message.startswith("waiting"):
                            # Send user-friendly browser status updates
                            await self.send_message(client_id, {
                                "type": "log",
                                "task_id": task_id,
                                "message": monitor_message,
                                "time": current_time
                            })
                
                # Send occasional log messages about the process
                if "browser_mode" in registry[task_id] and registry[task_id]["browser_mode"] == "visible":
                    # Send browser status updates periodically
                    if update_count % 20 == 0:  # Every ~10 seconds
                        await self.send_message(client_id, {
                            "type": "log",
                            "task_id": task_id,
                            "message": f"Browser operation in progress... (elapsed: {elapsed:.1f}s)",
                            "time": current_time
                        })
                        
                        # Log more detailed browser status in the server logs
                        logger.info(f"Browser operation for task {task_id} still in progress (elapsed: {elapsed:.1f}s)")
                        
                        # Add heartbeat to registry to track activity
                        registry[task_id]["last_heartbeat"] = current_time
                
                if current_status != last_status:
                    # Status changed, send update
                    logger.info(f"Task {task_id} status changed from {last_status} to {current_status}")
                    update_message = {
                        "type": "status",
                        "task_id": task_id,
                        "status": current_status,
                    }
                    
                    # Add error details if status is error
                    if current_status == "error" and "error" in registry[task_id]:
                        update_message["error"] = registry[task_id]["error"]
                        logger.error(f"Task {task_id} error: {registry[task_id]['error']}")
                    
                    # Add result if status is completed
                    if current_status == "completed" and "result" in registry[task_id]:
                        result = registry[task_id]["result"]
                        update_message["result"] = result
                        
                        # Log success details
                        answer_length = len(result.get("answer", "")) if result and "answer" in result else 0
                        logger.info(f"Task {task_id} completed with answer length: {answer_length}")
                        
                        # If answer is empty or very short, add a warning message
                        if answer_length < 10:
                            logger.warning(f"Task {task_id} returned very short answer: '{result.get('answer', '')}'")
                            await self.send_message(client_id, {
                                "type": "log",
                                "task_id": task_id,
                                "message": "Warning: The browser response is unusually short. The browser may have encountered issues."
                            })
                            
                            # Check if process info is available to help debug
                            if "process_status" in registry[task_id]:
                                process_status = registry[task_id].get("process_status", "unknown")
                                await self.send_message(client_id, {
                                    "type": "log",
                                    "task_id": task_id,
                                    "message": f"Process status: {process_status}. Check server logs for more details."
                                })
                                
                            # Since the browser may have failed, add some helpful info to the answer
                            if not result.get("answer"):
                                result["answer"] = "The browser process completed but didn't return any content. This usually happens when the browser encounters an error or can't access the requested site."
                            elif len(result.get("answer", "")) < 10:
                                result["answer"] = f"{result.get('answer', '')}\n\nNote: This response seems unusually short. The browser may have encountered access restrictions or other issues."
                    
                    # Add browser mode if available
                    if "browser_mode" in registry[task_id]:
                        update_message["browser_mode"] = registry[task_id]["browser_mode"]
                    
                    await self.send_message(client_id, update_message)
                    logger.info(f"Sent status update to client: {current_status}")
                    
                    last_status = current_status
                    
                    # If task is completed or errored, stop polling
                    if current_status in ["completed", "error"]:
                        logger.info(f"Task {task_id} finished with status {current_status}, stopping updates")
                        break
                        
        except Exception as e:
            logger.error(f"Error sending task updates for task {task_id} to client {client_id}: {str(e)}")
            logger.error(traceback.format_exc())
            await self.send_message(client_id, {
                "type": "status",
                "task_id": task_id,
                "status": "error",
                "error": f"Error tracking task: {str(e)}"
            })

# Create a singleton connection manager
manager = ConnectionManager()

async def handle_websocket(websocket: WebSocket, client_id: str = None):
    """Handle WebSocket connection
    
    Args:
        websocket: WebSocket connection
        client_id: Optional client identifier (if None, a new one will be generated)
    """
    # Generate client ID if not provided
    if client_id is None:
        client_id = str(uuid.uuid4())
        
    # Accept the connection
    await manager.connect(websocket, client_id)
    
    # Send welcome message
    await manager.send_message(client_id, {
        "type": "system",
        "message": "Connected to OWL API WebSocket server",
        "client_id": client_id
    })
    
    try:
        # Process incoming messages
        while True:
            # Wait for a message
            data = await websocket.receive_text()
            
            try:
                # Parse the message as JSON
                message_data = json.loads(data)
                message_type = message_data.get("type", "query")
                
                if message_type == "query":
                    # Handle query request
                    query = message_data.get("query")
                    module = message_data.get("module", "run")
                    
                    if not query:
                        await manager.send_message(client_id, {
                            "type": "error",
                            "message": "Query is required"
                        })
                        continue
                        
                    # Generate task ID
                    task_id = str(uuid.uuid4())
                    
                    # Store task in WebSocket tasks registry
                    websocket_tasks[task_id] = {
                        "client_id": client_id,
                        "query": query,
                        "module": module
                    }
                    
                    # Send acknowledgment
                    await manager.send_message(client_id, {
                        "type": "ack",
                        "task_id": task_id,
                        "message": "Query received and processing started"
                    })
                    
                    # Log incoming browser requests for debugging
                    if module == "run_mini" or "browser" in module.lower():
                        await manager.send_message(client_id, {
                            "type": "log",
                            "task_id": task_id,
                            "message": f"Browser module detected: {module}. A Chrome window should open shortly."
                        })
                        logger.info(f"Browser module request from client {client_id}: module={module}, query={query[:50]}...")
                    
                    # Start background task to process query - isolate in its own thread for greenlet compatibility
                    import threading
                    
                    def run_in_thread():
                        # Run in a new thread to avoid greenlet context issues
                        try:
                            import asyncio
                            asyncio.run(run_owl_query_ws(task_id, query, module, client_id))
                            logger.info(f"Thread for task {task_id} completed successfully")
                        except Exception as e:
                            logger.error(f"Error in thread for task {task_id}: {str(e)}")
                    
                    # Use a dedicated thread instead of asyncio task for browser operations
                    if module == "run_mini" or "browser" in module.lower():
                        logger.info(f"Using dedicated thread for browser module {module}")
                        thread = threading.Thread(target=run_in_thread)
                        thread.daemon = True
                        thread.start()
                    else:
                        # For non-browser operations, use regular asyncio task
                        query_task = asyncio.create_task(run_owl_query_ws(task_id, query, module, client_id))
                        query_task.add_done_callback(
                            lambda t: logger.info(f"Query task {task_id} completed with status: {TASK_REGISTRY.get(task_id, {}).get('status', 'unknown')}")
                        )
                    
                    # Start background task to send task updates
                    # Use direct TASK_REGISTRY import for consistency across processes
                    import importlib
                    import sys
                    
                    # Force reload the module to get the absolute latest registry
                    if 'owl_api.services.owl_runner' in sys.modules:
                        logger.info("Reloading owl_runner module to get guaranteed fresh registry")
                        del sys.modules['owl_api.services.owl_runner']
                        
                    # Import the module directly to get fresh registry
                    owl_runner = importlib.import_module('owl_api.services.owl_runner')
                    fresh_registry = owl_runner.TASK_REGISTRY
                    
                    logger.info(f"Using freshly imported registry with ID={id(fresh_registry)}")
                    logger.info(f"Registry comparison: Fresh={id(fresh_registry)}, Imported={id(TASK_REGISTRY)}")
                    logger.info(f"Fresh registry contains {len(fresh_registry)} tasks")
                    logger.info(f"Task in registries: Fresh={task_id in fresh_registry}, Imported={task_id in TASK_REGISTRY}")
                    
                    # If task is not in the fresh registry but is in TASK_REGISTRY, copy it over
                    if task_id not in fresh_registry and task_id in TASK_REGISTRY:
                        logger.warning(f"Registry sync issue: Task {task_id} in TASK_REGISTRY but not in fresh registry - copying")
                        fresh_registry[task_id] = TASK_REGISTRY[task_id]
                    
                    # Always use the freshly imported registry to ensure consistency
                    updates_task = asyncio.create_task(manager.send_task_updates(task_id, client_id, fresh_registry)) 
                    updates_task.add_done_callback(
                        lambda t: logger.info(f"Task updates for {task_id} completed")
                    )
                    
                elif message_type == "cancel":
                    # Handle cancel request
                    task_id = message_data.get("task_id")
                    
                    if not task_id:
                        await manager.send_message(client_id, {
                            "type": "error",
                            "message": "Task ID is required for cancellation"
                        })
                        continue
                        
                    # Check if task exists and belongs to this client
                    if task_id in websocket_tasks and websocket_tasks[task_id]["client_id"] == client_id:
                        # Remove task from registry
                        if task_id in TASK_REGISTRY:
                            TASK_REGISTRY[task_id]["status"] = "cancelled"
                            
                        # Remove task from WebSocket tasks
                        del websocket_tasks[task_id]
                        
                        await manager.send_message(client_id, {
                            "type": "status",
                            "task_id": task_id,
                            "status": "cancelled",
                            "message": "Task cancelled"
                        })
                    else:
                        await manager.send_message(client_id, {
                            "type": "error",
                            "message": "Task not found or not owned by this client"
                        })
                        
                elif message_type == "ping":
                    # Handle ping request (keep connection alive)
                    await manager.send_message(client_id, {
                        "type": "pong",
                        "time": message_data.get("time")
                    })
                    
                else:
                    # Unknown message type
                    await manager.send_message(client_id, {
                        "type": "error",
                        "message": f"Unknown message type: {message_type}"
                    })
                    
            except json.JSONDecodeError:
                # Invalid JSON
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": "Invalid JSON in message"
                })
                
            except Exception as e:
                # Other error
                logger.error(f"Error processing WebSocket message from client {client_id}: {str(e)}")
                await manager.send_message(client_id, {
                    "type": "error",
                    "message": f"Error processing message: {str(e)}"
                })
                
    except WebSocketDisconnect:
        # Client disconnected
        manager.disconnect(client_id)
        
        # Clean up tasks for this client
        for task_id in list(websocket_tasks.keys()):
            if websocket_tasks[task_id]["client_id"] == client_id:
                if task_id in TASK_REGISTRY:
                    TASK_REGISTRY[task_id]["status"] = "cancelled"
                del websocket_tasks[task_id]
                
    except Exception as e:
        # Unexpected error
        logger.error(f"Unexpected error in WebSocket handler for client {client_id}: {str(e)}")
        manager.disconnect(client_id)

async def run_owl_query_ws(task_id: str, question: str, module_name: str, client_id: str):
    """Run a query for a WebSocket client
    
    This function runs the query in a background task and updates the task registry.
    
    Args:
        task_id: Task identifier
        question: User question
        module_name: Example module name
        client_id: Client identifier
    """
    try:
        # Debug: Print registry contents before modifying
        logger.info(f"REGISTRY DEBUG - BEFORE: Task registry has {len(TASK_REGISTRY)} tasks. Keys: {list(TASK_REGISTRY.keys())}")
        
        # Initialize task in registry with a clear, distinctive marker
        TASK_REGISTRY[task_id] = {
            "status": "processing",
            "query": question,
            "module": module_name,
            "client_id": client_id,
            "created_in": "run_owl_query_ws",  # Marker to track task origin
            "created_at": time.time()
        }
        
        # Debug: Verify task was added to registry
        logger.info(f"REGISTRY DEBUG - AFTER ADD: Task {task_id} added to registry. Now has {len(TASK_REGISTRY)} tasks. Task present: {task_id in TASK_REGISTRY}")
        if task_id in TASK_REGISTRY:
            logger.info(f"REGISTRY DEBUG - TASK DETAILS: {TASK_REGISTRY[task_id]}")
        
        # For browser modules, run in a way that preserves greenlet context
        is_browser_module = module_name == "run_mini" or "browser" in module_name.lower()
        
        if is_browser_module:
            logger.info(f"Running browser module {module_name} for task {task_id} with dedicated greenlet context")
            
            # Import here to avoid circular imports
            from owl_api.services.owl_runner import run_owl_query
            
            # Debug: Print registry state before running the task
            logger.info(f"REGISTRY DEBUG - BEFORE BROWSER RUN: Task {task_id} registry state: {TASK_REGISTRY.get(task_id, 'NOT FOUND')}")
            
            # Re-import the latest global registry
            from owl_api.services.owl_runner import TASK_REGISTRY as global_registry
            
            # Verify registry still has our task or re-add it
            if task_id not in global_registry:
                logger.warning(f"Task {task_id} missing from global registry before browser run - re-adding it")
                global_registry[task_id] = TASK_REGISTRY[task_id]
            
            # Run in the current thread context (since we're already in a dedicated thread)
            # Always use the global registry directly
            run_owl_query(task_id, question, module_name, global_registry)
            
            # Debug: Check registry after task execution
            logger.info(f"REGISTRY DEBUG - AFTER RUN: Task {task_id} in registry: {task_id in TASK_REGISTRY}")
            if task_id in TASK_REGISTRY:
                logger.info(f"REGISTRY DEBUG - TASK STATUS: {TASK_REGISTRY[task_id].get('status', 'unknown')}")
        else:
            # For non-browser modules, use standard call
            # Import here to avoid circular imports
            from owl_api.services.owl_runner import run_owl_query
            
            # Debug: Print registry state before running the task
            logger.info(f"REGISTRY DEBUG - BEFORE STANDARD RUN: Task {task_id} registry state: {TASK_REGISTRY.get(task_id, 'NOT FOUND')}")
            
            # Re-import the latest global registry
            from owl_api.services.owl_runner import TASK_REGISTRY as global_registry
            
            # Verify registry still has our task or re-add it
            if task_id not in global_registry:
                logger.warning(f"Task {task_id} missing from global registry before standard run - re-adding it")
                global_registry[task_id] = TASK_REGISTRY[task_id]
                
            # Run the task using the global registry directly
            run_owl_query(task_id, question, module_name, global_registry)
            
            # Debug: Check registry after task execution
            logger.info(f"REGISTRY DEBUG - AFTER RUN: Task {task_id} in registry: {task_id in TASK_REGISTRY}")
            if task_id in TASK_REGISTRY:
                logger.info(f"REGISTRY DEBUG - TASK STATUS: {TASK_REGISTRY[task_id].get('status', 'unknown')}")
                
        # Final check to ensure task is still in registry
        logger.info(f"REGISTRY DEBUG - END: Task {task_id} in final registry check: {task_id in TASK_REGISTRY}")
        if task_id in TASK_REGISTRY:
            logger.info(f"REGISTRY DEBUG - FINAL STATUS: {TASK_REGISTRY[task_id].get('status', 'unknown')}")
        
    except Exception as e:
        # Update task registry with error
        import traceback
        error_traceback = traceback.format_exc()
        
        TASK_REGISTRY[task_id] = {
            "status": "error",
            "query": question,
            "module": module_name,
            "client_id": client_id,
            "error": f"Unexpected error: {str(e)}",
            "traceback": error_traceback
        }
        logger.error(f"Error running query for task {task_id}: {str(e)}")
        logger.error(f"Traceback: {error_traceback}")