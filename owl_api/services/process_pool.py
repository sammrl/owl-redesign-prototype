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

import os
import time
import logging
import multiprocessing as mp
import threading
import queue
import atexit
import pickle
import signal
from multiprocessing import Process, Queue
from typing import Dict, List, Any, Optional, Callable

logger = logging.getLogger(__name__)

# Global process pool managers
_process_pool = None
_browser_process_pool = None

class ProcessPoolManager:
    """Manages a pool of processes for executing synchronous code"""

    def __init__(self, max_workers=4):
        self.max_workers = max_workers
        self.tasks = {}  # task_id -> (process, result_queue)
        self.active_processes = 0

    def submit_task(self, task_id: str, target_func: Callable, args: tuple) -> Queue:
        """Submit a task to be executed in a separate process
        
        Args:
            task_id: Unique task identifier
            target_func: Function to execute in separate process
            args: Arguments to pass to the function
            
        Returns:
            Queue: Result queue to receive results from the process
        """
        # Create queues for communication
        result_queue = Queue()

        # Create and start process
        process = Process(
            target=self._process_wrapper,
            args=(target_func, args, result_queue)
        )
        process.daemon = True  # Allow process to be terminated when main process exits
        process.start()

        # Store process and result queue
        self.tasks[task_id] = (process, result_queue)
        self.active_processes += 1

        logger.info(f"Task {task_id} submitted to process pool, active processes: {self.active_processes}")
        return result_queue

    def _process_wrapper(self, target_func, args, result_queue):
        """Wrapper function to execute in separate process and handle errors"""
        try:
            # Set up process-specific signal handlers
            signal.signal(signal.SIGINT, signal.SIG_IGN)
            signal.signal(signal.SIGTERM, signal.SIG_DFL)

            # Configure process-specific logging to both console and file
            log_dir = "/Users/smill/code/owl/logs"
            process_log_file = None
            try:
                # Ensure log directory exists
                if not os.path.exists(log_dir):
                    os.makedirs(log_dir, exist_ok=True)
                    print(f"Created log directory: {log_dir}")
                
                # Create process-specific log file
                process_log_file = os.path.join(log_dir, f"process_pool_{os.getpid()}.log")
                logging.basicConfig(
                    level=logging.DEBUG,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                    handlers=[
                        logging.FileHandler(process_log_file),
                        logging.StreamHandler()
                    ]
                )
                print(f"Process {os.getpid()}: Logging to {process_log_file}")
            except Exception as e:
                print(f"Error setting up logging: {str(e)}")
                # Fall back to console-only logging
                logging.basicConfig(level=logging.DEBUG)
                
            logger = logging.getLogger("process_pool_worker")
            logger.info(f"Worker process started with PID {os.getpid()}")
            logger.info(f"Function: {target_func.__name__}, Args: {args}")
            
            # Execute the target function
            logger.info(f"Executing {target_func.__name__} with args: {args}")
            result = target_func(*args)
            logger.info(f"Execution completed successfully")

            # Put the result in the queue, but handle it in a pickle-safe way
            logger.info("Sending success result back to main process")
            try:
                # Try direct pickling
                result_queue.put(("success", result))
                logger.info("Result sent successfully via direct pickling")
            except (pickle.PickleError, TypeError) as pickle_error:
                # If we got a pickling error, try to extract and send basic data
                logger.warning(f"Pickling error: {str(pickle_error)}. Attempting to extract basic data.")
                
                # Extract answer string, chat history, and token info from the result tuple
                if isinstance(result, tuple) and len(result) >= 3:
                    answer = str(result[0]) if result[0] is not None else ""
                    
                    # Handle chat history safely
                    try:
                        chat_history = []
                        if result[1]:
                            for msg in result[1]:
                                if hasattr(msg, 'to_dict'):
                                    chat_history.append(msg.to_dict())
                                elif isinstance(msg, dict):
                                    chat_history.append(msg)
                                else:
                                    chat_history.append(str(msg))
                    except Exception:
                        chat_history = []
                    
                    # Handle token info safely
                    try:
                        token_info = {}
                        if result[2] and isinstance(result[2], dict):
                            for k, v in result[2].items():
                                if isinstance(v, (int, float, str, bool, type(None))):
                                    token_info[str(k)] = v
                    except Exception:
                        token_info = {}
                    
                    simplified_result = (answer, chat_history, token_info)
                    result_queue.put(("success", simplified_result))
                    logger.info("Sent simplified result after handling pickling error")
                else:
                    # If it's not the expected format, send an error
                    logger.error("Result format not as expected, cannot extract basic data")
                    result_queue.put(("error", (f"Pickling error: {str(pickle_error)}", "")))
        except Exception as e:
            # Capture the exception and traceback
            import traceback
            error_traceback = traceback.format_exc()
            print(f"Process {os.getpid()} error: {str(e)}\n{error_traceback}")
            result_queue.put(("error", (str(e), error_traceback)))

    def terminate_task(self, task_id: str):
        """Terminate a running task"""
        if task_id in self.tasks:
            process, _ = self.tasks[task_id]
            if process.is_alive():
                process.terminate()
                logger.info(f"Task {task_id} terminated")
            self._cleanup_task(task_id)

    def _cleanup_task(self, task_id: str):
        """Clean up resources for a completed task"""
        if task_id in self.tasks:
            process, result_queue = self.tasks[task_id]
            # Close the queue if possible
            try:
                if hasattr(result_queue, 'close'):
                    result_queue.close()
            except:
                pass

            # Remove from tasks dictionary
            del self.tasks[task_id]
            self.active_processes -= 1
            logger.info(f"Task {task_id} cleaned up, active processes: {self.active_processes}")

    def shutdown(self):
        """Shutdown the process pool, terminating all running processes"""
        for task_id in list(self.tasks.keys()):
            self.terminate_task(task_id)
            
        # Force close any remaining queues
        for task_id, (process, result_queue) in list(self.tasks.items()):
            try:
                if hasattr(result_queue, 'close'):
                    logger.info(f"Closing queue for task {task_id}")
                    result_queue.close()
                    result_queue.join_thread()  # Wait for the background thread
            except Exception as e:
                logger.error(f"Error closing queue for task {task_id}: {str(e)}")
                
        # Clean up any semaphores or other IPC resources
        try:
            import gc
            logger.info("Running garbage collection to clean up resources")
            gc.collect()
        except Exception as e:
            logger.error(f"Error during garbage collection: {str(e)}")
            
        logger.info("Process pool shut down completely")


class BrowserProcessPool:
    """Manages a pool of browser worker processes"""
    
    def __init__(self, num_workers=2, max_queue_size=100):
        """
        Initialize the process pool
        
        Args:
            num_workers: Number of worker processes to create
            max_queue_size: Maximum size of task and result queues
        """
        self.num_workers = num_workers
        
        # Create queues for communication
        self.input_queue = mp.Queue(maxsize=max_queue_size)
        self.output_queue = mp.Queue(maxsize=max_queue_size)
        
        # Create and start worker processes
        self.processes = []
        self.start_workers()
        
        # Create a thread to monitor the output queue
        self.results_thread = threading.Thread(
            target=self._process_results,
            daemon=True
        )
        self.results_thread.start()
        
        # Task registry for tracking status
        self.task_registry = {}
        
        # Register cleanup function
        atexit.register(self.shutdown)
        
        logger.info(f"BrowserProcessPool initialized with {num_workers} workers")
    
    def start_workers(self):
        """Start worker processes"""
        # Import here to avoid circular imports
        from .browser_process import browser_worker
        
        # Get current environment variables to pass to workers
        env_vars = {
            key: os.environ.get(key)
            for key in os.environ
            if key.startswith(("OPENAI_", "AZURE_", "GOOGLE_", "BROWSER_"))
        }
        
        for i in range(self.num_workers):
            p = mp.Process(
                target=browser_worker,
                args=(self.input_queue, self.output_queue, env_vars),
                daemon=True,
                name=f"browser-worker-{i}"
            )
            p.start()
            self.processes.append(p)
            logger.info(f"Started browser worker {i} with PID {p.pid}")
    
    def submit_task(self, task_id: str, query: str, module_name: str, registry: Dict):
        """
        Submit a task to the process pool
        
        Args:
            task_id: Unique identifier for the task
            query: User query/task description
            module_name: Module to run (e.g., "run_mini")
            registry: Task registry to update with status
        """
        # Store reference to the registry without modifying its contents
        self.task_registry = registry
            
        # Put task in queue
        task = {
            "task_id": task_id,
            "query": query,
            "module": module_name
        }
        
        logger.info(f"Submitting task {task_id} to browser process pool")
        self.input_queue.put(task)
        
        # Update registry with initial status
        if task_id in registry:
            registry[task_id].update({
                "process_status": "submitted",
                "monitor_status": "waiting"
            })
    
    def _process_results(self):
        """Thread function to process results from output queue"""
        while True:
            try:
                # Get result from queue with timeout
                result = self.output_queue.get(timeout=0.5)
                
                # Process the result
                if isinstance(result, dict) and "task_id" in result:
                    task_id = result["task_id"]
                    
                    # Import the global registry to ensure we're working with the latest version
                    from owl_api.services.owl_runner import TASK_REGISTRY as global_registry
                    
                    # Task registry persistence is critical for WebSocket updates
                    # Always use the global registry first, then fall back to our reference
                    if task_id in global_registry:
                        registry_to_use = global_registry
                        logger.info(f"Found task {task_id} in global registry")
                    elif self.task_registry and task_id in self.task_registry:
                        registry_to_use = self.task_registry
                        logger.info(f"Found task {task_id} in class registry but not global registry")
                    else:
                        logger.warning(f"Received result for unknown task {task_id} - not in any registry")
                        continue
                        
                    logger.info(f"Got update for task {task_id}: {result.get('status')}")
                    
                    # Handle different status updates
                    if result.get("status") == "processing":
                        # Update processing status and message
                        registry_to_use[task_id].update({
                            "process_status": result.get("status"),
                            "monitor_status": result.get("message", "processing")
                        })
                        
                        # Add browser mode if provided
                        if "browser_mode" in result:
                            registry_to_use[task_id]["browser_mode"] = result["browser_mode"]
                            
                    elif result.get("status") == "completed":
                        # Task completed, update with result
                        registry_to_use[task_id].update({
                            "status": "completed",
                            "result": result.get("result", {}),
                            "process_status": "completed",
                            "monitor_status": "completed"
                        })
                        
                    elif result.get("status") == "error":
                        # Error occurred, update with error message
                        registry_to_use[task_id].update({
                            "status": "error",
                            "error": result.get("error", "Unknown error in browser process"),
                            "process_status": "error",
                            "monitor_status": "error"
                        })
                
            except queue.Empty:
                # No results in queue, just continue
                continue
                
            except Exception as e:
                logger.error(f"Error processing result: {str(e)}")
    
    def shutdown(self):
        """Shutdown the process pool and clean up resources"""
        logger.info("Shutting down BrowserProcessPool")
        
        # Send stop signal to all workers
        for _ in range(len(self.processes)):
            try:
                self.input_queue.put("STOP", timeout=1)
            except queue.Full:
                logger.warning("Could not send STOP signal, queue is full")
        
        # Wait for processes to terminate
        for p in self.processes:
            try:
                p.join(timeout=2)
                if p.is_alive():
                    logger.warning(f"Process {p.pid} did not terminate, killing it")
                    p.terminate()
                    p.join(timeout=1)  # Wait again after terminating
            except Exception as e:
                logger.error(f"Error shutting down process {p.pid}: {str(e)}")
        
        # Properly close the queues to release resources
        try:
            logger.info("Closing input queue")
            self.input_queue.close()
            self.input_queue.join_thread()  # Wait for background thread
        except Exception as e:
            logger.error(f"Error closing input queue: {str(e)}")
            
        try:
            logger.info("Closing output queue")
            self.output_queue.close()
            self.output_queue.join_thread()  # Wait for background thread
        except Exception as e:
            logger.error(f"Error closing output queue: {str(e)}")
            
        # Clean up resources used by Queue objects
        try:
            import gc
            gc.collect()  # Force garbage collection
            logger.info("Forced garbage collection to clean up resources")
        except Exception as e:
            logger.error(f"Error during garbage collection: {str(e)}")
            
        logger.info("BrowserProcessPool shutdown complete")


# Initialize and get the process pool
def get_process_pool() -> ProcessPoolManager:
    global _process_pool
    if _process_pool is None:
        _process_pool = ProcessPoolManager()
    return _process_pool

# Initialize and get the browser process pool
def get_browser_process_pool() -> BrowserProcessPool:
    global _browser_process_pool
    if _browser_process_pool is None:
        # Import global registry to ensure it's initialized
        from owl_api.services.owl_runner import TASK_REGISTRY as global_registry
        logger.info(f"Initializing browser process pool with global registry ID={id(global_registry)}")
        
        # Apply spawn-mode compatibility
        # When using spawn mode, we need to ensure the registry is serializable
        # and properly copied to child processes
        try:
            # Check if we're using spawn mode
            import multiprocessing as mp
            if hasattr(mp, 'get_start_method') and mp.get_start_method() == 'spawn':
                logger.info("Using spawn mode for multiprocessing - applying additional fixes")
                
                # Ensure registry is prepared for sharing between processes
                import os
                # Use a shared manager to help with registry synchronization
                from multiprocessing import Manager
                
                # Create a shared process manager
                shared_manager = Manager()
                
                # Create an optimized namespace for communication
                shared_namespace = shared_manager.Namespace()
                
                # This helps prevent resource leaks
                os.environ["MULTIPROCESSING_SPAWN_WARNING"] = "1"
        except Exception as e:
            logger.error(f"Error during spawn mode setup: {str(e)}")
        
        # Create the browser process pool
        _browser_process_pool = BrowserProcessPool()
        
        # Set an explicit reference to the global registry
        _browser_process_pool.task_registry = global_registry
        logger.info(f"Browser process pool initialized with task_registry ID={id(_browser_process_pool.task_registry)}")
    return _browser_process_pool

# Cleanup on module unload
def _cleanup():
    global _process_pool, _browser_process_pool
    
    logger.info("Starting comprehensive cleanup of process pools")
    
    # Clean up process pool
    if _process_pool is not None:
        logger.info("Shutting down regular process pool")
        _process_pool.shutdown()
        _process_pool = None
    
    # Clean up browser process pool
    if _browser_process_pool is not None:
        logger.info("Shutting down browser process pool")
        _browser_process_pool.shutdown()
        _browser_process_pool = None
    
    # Additional cleanup for multiprocessing resources
    try:
        # This helps clean up any leaked semaphores
        logger.info("Running additional multiprocessing cleanup")
        import multiprocessing as mp
        if hasattr(mp, 'resource_tracker') and hasattr(mp.resource_tracker, '_resource_tracker'):
            if hasattr(mp.resource_tracker._resource_tracker, '_fd_to_resource_types'):
                # Clear any tracked resources
                logger.info("Cleaning resource tracker references")
                mp.resource_tracker._resource_tracker._fd_to_resource_types.clear()
                mp.resource_tracker._resource_tracker._resource_type_to_fds.clear()
                # No need to close these as we're shutting down, but this ensures they won't leak
    except Exception as e:
        logger.error(f"Error during additional multiprocessing cleanup: {str(e)}")
        
    # Final garbage collection
    try:
        import gc
        logger.info("Running final garbage collection")
        gc.collect()
    except Exception as e:
        logger.error(f"Error during final garbage collection: {str(e)}")
    
    logger.info("Process pool cleanup complete")

# Register cleanup function
atexit.register(_cleanup)