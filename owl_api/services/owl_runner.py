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

import logging
import importlib
import traceback
import sys
import os
import threading
import time
import inspect
import queue
from typing import Dict, Tuple, Any, Optional, Callable

from dotenv import load_dotenv
from owl.utils import run_society

logger = logging.getLogger(__name__)

# Task tracking dictionary for async operations
TASK_REGISTRY: Dict[str, Dict[str, Any]] = {}

# Process synchronization utilities
def save_registry_snapshot():
    """Save current task registry to disk as backup for recovery"""
    import json
    import os
    try:
        # Ensure logs directory exists
        log_dir = "/Users/smill/code/owl/logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
            
        # Create serializable copy of registry (some objects may not be JSON serializable)
        serializable_registry = {}
        for task_id, task_data in TASK_REGISTRY.items():
            try:
                # Create shallow copy and remove potentially non-serializable elements
                safe_task = task_data.copy()
                for key in list(safe_task.keys()):
                    if not isinstance(safe_task[key], (str, int, float, bool, list, dict, type(None))):
                        safe_task[key] = str(safe_task[key])
                serializable_registry[task_id] = safe_task
            except Exception as e:
                print(f"Error serializing task {task_id}: {str(e)}")
                
        # Save to file with timestamp
        import time
        snapshot_path = os.path.join(log_dir, f"registry_snapshot.json")
        with open(snapshot_path, 'w') as f:
            json.dump(serializable_registry, f)
            
        # Log success
        print(f"Task registry snapshot saved to {snapshot_path} with {len(serializable_registry)} tasks")
    except Exception as e:
        print(f"Error saving registry snapshot: {str(e)}")

def load_registry_snapshot():
    """Load task registry from disk if available"""
    import json
    import os
    try:
        # Check if snapshot file exists
        log_dir = "/Users/smill/code/owl/logs"
        snapshot_path = os.path.join(log_dir, f"registry_snapshot.json")
        if not os.path.exists(snapshot_path):
            print("No registry snapshot found")
            return
            
        # Load from file
        with open(snapshot_path, 'r') as f:
            loaded_registry = json.load(f)
            
        # Only use if current registry is empty
        if not TASK_REGISTRY and loaded_registry:
            print(f"Loading {len(loaded_registry)} tasks from snapshot")
            TASK_REGISTRY.update(loaded_registry)
            print(f"Registry now has {len(TASK_REGISTRY)} tasks")
    except Exception as e:
        print(f"Error loading registry snapshot: {str(e)}")

# Try to load backup registry at module import time
load_registry_snapshot()

# Set up automatic snapshot saving
import threading
import time

def registry_snapshot_thread():
    """Thread function to periodically save registry snapshots"""
    while True:
        time.sleep(10)  # Save every 10 seconds
        if TASK_REGISTRY:  # Only save if not empty
            save_registry_snapshot()

# Start snapshot thread
snapshot_thread = threading.Thread(target=registry_snapshot_thread, daemon=True)
snapshot_thread.start()

def validate_input(question: str) -> bool:
    """Validate if user input is valid
    
    Args:
        question: User question
        
    Returns:
        bool: Whether the input is valid
    """
    # Check if input is empty or contains only spaces
    if not question or question.strip() == "":
        return False
    return True

def load_module(module_name: str) -> Tuple[bool, Any, str]:
    """Dynamically load a module from examples directory
    
    Args:
        module_name: Name of the module to import
        
    Returns:
        Tuple[bool, Any, str]: Success flag, module object if successful, error message if failed
    """
    # Ensure environment variables are loaded
    load_dotenv()
    
    try:
        # Dynamically import target module
        module_path = f"examples.{module_name}"
        logger.info(f"Importing module: {module_path}")
        module = importlib.import_module(module_path)

        # Check if it contains the construct_society function
        if not hasattr(module, "construct_society"):
            error_msg = f"construct_society function not found in module {module_path}"
            logger.error(error_msg)
            return False, None, error_msg
        
        return True, module, ""
        
    except ImportError as ie:
        error_msg = f"Unable to import module {module_name}: {str(ie)}"
        logger.error(error_msg)
        return False, None, error_msg
    except Exception as e:
        error_msg = f"Error occurred while importing module {module_name}: {str(e)}"
        logger.error(error_msg)
        return False, None, error_msg

def run_owl_query(task_id: str, question: str, module_name: str = "run", task_registry: Dict = None) -> None:
    """Run a query through the OWL system
    
    This function is designed to be run asynchronously in a background task.
    
    Args:
        task_id: Unique identifier for the task
        question: User question
        module_name: Example module name to import
        task_registry: Dictionary to store task status and results
    """
    # Use global registry to ensure consistency across all processes
    registry = TASK_REGISTRY
    
    # Log debug info about registry usage
    logger.info(f"run_owl_query using global registry ID={id(TASK_REGISTRY)}")
    if task_registry is not None and task_registry is not TASK_REGISTRY:
        logger.warning(f"Ignoring passed registry ID={id(task_registry)} in favor of global registry")
        # Copy any existing task data to ensure we don't lose information
        if task_id in task_registry and task_id not in TASK_REGISTRY:
            TASK_REGISTRY[task_id] = task_registry[task_id]
            logger.info(f"Copied task {task_id} data from passed registry to global registry")
    
    try:
        # Initialize task status
        registry[task_id] = {
            "status": "processing",
            "query": question, 
            "module": module_name
        }
        
        # Validate input
        if not validate_input(question):
            registry[task_id].update({
                "status": "error",
                "error": "Invalid input question"
            })
            return
        
        # First, check if the module contains browser operations
        success, module, error_msg = load_module(module_name)
        if not success:
            registry[task_id].update({
                "status": "error",
                "error": error_msg
            })
            return
        
        # Check if the module has a main() function with a default_task
        # If so, use that instead of the user's query for browser modules
        actual_query = question
        is_browser_module = "browser" in module_name.lower() or module_name == "run_mini"
        
        if hasattr(module, "main") and hasattr(module.main, "__globals__") and "default_task" in module.main.__globals__:
            default_task = module.main.__globals__["default_task"]
            logger.info(f"Module {module_name} has default_task: {default_task[:50]}...")
            
            # Only use default_task for browser-related modules if user's query doesn't contain browser keywords
            if is_browser_module:
                # Check if user's query already contains browser instructions
                browser_keywords = ["navigate", "browser", "chrome", "firefox", "safari", 
                                   "go to", "visit", "open website", "search on", 
                                   "amazon.com", "google.com", "youtube.com",
                                   "http://", "https://", ".com", ".org", ".net"]
                
                has_browser_instructions = any(keyword in question.lower() for keyword in browser_keywords)
                
                if has_browser_instructions:
                    logger.info(f"User query contains browser instructions - using user query")
                    # If query contains URLs or browser instructions, use the user's query
                    actual_query = question
                    
                    # But add a prefix to ensure browser instructions are clear
                    if not any(phrase in question.lower() for phrase in ["use the browser", "open browser"]):
                        actual_query = f"Using the browser tool (not search), {question}"
                        logger.info(f"Added browser instruction prefix to user query")
                else:
                    logger.info(f"Using default_task instead of user query for browser module")
                    actual_query = default_task
        
        # Check if the module uses BrowserToolkit with headless=False
        needs_process_pool = _module_uses_visible_browser(module)
        logger.info(f"Module {module_name} needs process pool: {needs_process_pool}")
        
        # For run_mini module, always use process pool since we know it uses visible browser
        if module_name == "run_mini":
            logger.info("Forcing run_mini to use process pool as it's known to use visible browser")
            needs_process_pool = True
        
        if needs_process_pool:
            # Run in separate process for browser operations
            logger.info(f"Using process pool for task {task_id} with module {module_name}")
            logger.info(f"Using query: {actual_query[:50]}...")
            registry[task_id]["browser_mode"] = "visible"  # Add info to registry for frontend
            _run_in_process_pool(task_id, actual_query, module_name, registry)
        else:
            # Run normally for non-browser operations
            logger.info(f"Using current process for task {task_id} with module {module_name}")
            registry[task_id]["browser_mode"] = "headless"  # Add info to registry for frontend
            _run_in_current_process(task_id, actual_query, module, registry)
            
    except Exception as e:
        error_msg = f"Uncaught error processing task: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        registry[task_id].update({
            "status": "error",
            "error": error_msg
        })

def _module_uses_visible_browser(module) -> bool:
    """Check if a module uses BrowserToolkit with headless=False"""
    # Examine the module source code
    try:
        source = inspect.getsource(module.construct_society)
        
        # Log the source code for debugging
        logger.info(f"Module source code for detection:\n{source[:200]}...")
        
        has_browser_toolkit = "BrowserToolkit" in source
        has_headless_false = "headless=False" in source
        
        logger.info(f"Module {module.__name__} detection:")
        logger.info(f"  - Has BrowserToolkit: {has_browser_toolkit}")
        logger.info(f"  - Has headless=False: {has_headless_false}")
        
        # Special handling for test modules
        if module.__name__ == "examples.run_test_browser":
            logger.info("Detected test browser module - forcing process pool usage")
            return True
            
        result = has_browser_toolkit and has_headless_false
        logger.info(f"Module {module.__name__} uses visible browser: {result}")
        return result
    except Exception as e:
        logger.error(f"Could not determine if module uses visible browser: {str(e)}")
        logger.error(f"Exception details: {traceback.format_exc()}")
        # If we can't determine, assume it might need process pool
        return True

def _run_in_current_process(task_id: str, question: str, module, registry: Dict):
    """Run the query in the current process (for non-browser operations)"""
    try:
        # Build society simulation
        logger.info("Building society simulation...")
        society = module.construct_society(question)
        
        # Run society simulation
        logger.info("Running society simulation...")
        answer, chat_history, token_info = run_society(society)
        logger.info("Society simulation completed")
        
        # Update task with results
        registry[task_id].update({
            "status": "completed",
            "result": {
                "answer": answer,
                "chat_history": chat_history,
                "token_info": token_info
            }
        })
    except Exception as e:
        error_msg = f"Error in current process: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        registry[task_id].update({
            "status": "error",
            "error": error_msg
        })

def _run_in_process_pool(task_id: str, question: str, module_name: str, registry: Dict):
    """Run the query in a separate process via the process pool"""
    try:
        # First check if we should use the specialized browser process pool
        use_browser_pool = module_name == "run_mini" or module_name == "run_test_browser" or "browser" in module_name.lower()
        
        # Update registry with processing info
        registry[task_id].update({
            "process_status": "submitting",
            "module_name": module_name,
        })
        
        if use_browser_pool:
            # Use the specialized browser process pool for browser operations
            from .process_pool import get_browser_process_pool
            browser_pool = get_browser_process_pool()
            
            # Log the browser pool operation
            logger.info(f"Submitting task {task_id} to browser process pool with module {module_name}")
            logger.info(f"Question: {question[:100]}...")
            
            # Submit task to browser process pool - this will be processed asynchronously
            browser_pool.submit_task(task_id, question, module_name, registry)
            
            # Update registry
            registry[task_id].update({
                "process_status": "running",
                "submitted_at": time.time(),
                "browser_pool": True
            })
            
            logger.info(f"Task {task_id} submitted to browser process pool")
        else:
            # Use the regular process pool for non-browser operations
            from .process_pool import get_process_pool
            pool = get_process_pool()
            
            # Log the process pool operation for debugging
            logger.info(f"Submitting task {task_id} to regular process pool with module {module_name}")
            logger.info(f"Question: {question[:100]}...")
            
            # Submit task to process pool
            result_queue = pool.submit_task(
                task_id,
                _execute_owl_in_process,
                (question, module_name)
            )
            
            # Update registry
            registry[task_id].update({
                "process_status": "running",
                "submitted_at": time.time(),
                "browser_pool": False
            })
            
            # Start a thread to monitor the result queue
            monitoring_thread = threading.Thread(
                target=_monitor_process_result,
                args=(result_queue, task_id, registry),
                daemon=True
            )
            monitoring_thread.start()
            
            logger.info(f"Started monitoring thread for task {task_id}")
        
    except Exception as e:
        error_msg = f"Error submitting to process pool: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        registry[task_id].update({
            "status": "error",
            "error": error_msg,
            "process_status": "failed",
        })

def _monitor_process_result(result_queue, task_id: str, registry: Dict):
    """Monitor the result queue from a process and update the task registry"""
    logger.info(f"Starting to monitor process result for task {task_id}")
    
    # Update registry with monitoring status
    if task_id in registry:
        registry[task_id].update({
            "monitor_status": "waiting_for_result",
            "monitor_started_at": time.time(),
        })
    
    try:
        # Set a timeout for getting the result
        # This helps us debug if the process is stuck or not responding
        logger.info(f"Waiting for process to return result for task {task_id}...")
        
        # Monitor with heartbeats to detect stalled processes
        start_time = time.time()
        heartbeat_interval = 300  # 5 minutes
        max_wait_time = 3600      # 1 hour timeout
        
        while True:
            try:
                # Try to get result with a shorter timeout to allow heartbeats
                result_type, result_data = result_queue.get(block=True, timeout=heartbeat_interval)
                logger.info(f"Received result from process for task {task_id}: {result_type}")
                
                # We got a result, break the loop
                break
            except queue.Empty:
                # No result yet, check if we've exceeded the max wait time
                elapsed_time = time.time() - start_time
                if elapsed_time >= max_wait_time:
                    logger.error(f"Timeout waiting for result from process for task {task_id}")
                    
                    # Instead of raising an exception, set error status and return a helpful message
                    registry[task_id].update({
                        "status": "error",
                        "process_status": "timeout",
                        "monitor_status": "timeout",
                        "completed_at": time.time(),
                        "error": f"Browser process timeout after {elapsed_time:.1f}s. The browser may be stuck or not responding.",
                        "result": {
                            "answer": "The browser operation timed out after running for too long. This could be due to a slow website, network issues, or the browser getting stuck. You may want to try again with a simpler request.",
                            "chat_history": [],
                            "token_info": {}
                        }
                    })
                    logger.info(f"Task {task_id} marked as error due to timeout")
                    
                    # Break the loop to stop waiting
                    break
                
                # Log a heartbeat and continue waiting
                if elapsed_time % 60 < 1:  # Log approximately every minute
                    logger.info(f"Still waiting for process to complete task {task_id} "
                              f"(elapsed: {elapsed_time:.1f}s, max: {max_wait_time}s)")
                
                # Update registry with heartbeat
                registry[task_id].update({
                    "monitor_status": "waiting_for_result",
                    "monitor_last_heartbeat": time.time(),
                    "monitor_elapsed_time": elapsed_time,
                    "percent_complete": min(int(elapsed_time / max_wait_time * 100), 99)  # Never show 100% until done
                })
        
        # Process the result
        if result_type == "success":
            # Successful execution
            try:
                # Validate result format
                if not isinstance(result_data, tuple) or len(result_data) < 3:
                    raise ValueError(f"Invalid result format: expected tuple of 3 elements, got {type(result_data)}")
                
                answer, chat_history, token_info = result_data
                
                # Convert answer to string if it's not already
                if answer is not None and not isinstance(answer, str):
                    logger.warning(f"Converting non-string answer to string for task {task_id}")
                    answer = str(answer)
                
                # Ensure chat_history is list-like
                if chat_history is not None and not hasattr(chat_history, '__iter__'):
                    logger.warning(f"Converting non-iterable chat_history to empty list for task {task_id}")
                    chat_history = []
                
                # Ensure token_info is dict-like
                if token_info is not None and not isinstance(token_info, dict):
                    logger.warning(f"Converting non-dict token_info to empty dict for task {task_id}")
                    token_info = {}
                
                logger.info(f"Success result for task {task_id}: answer length={len(answer) if answer else 0}")
                
                registry[task_id].update({
                    "status": "completed",
                    "process_status": "completed",
                    "monitor_status": "result_processed",
                    "completed_at": time.time(),
                    "result": {
                        "answer": answer,
                        "chat_history": chat_history,
                        "token_info": token_info
                    }
                })
                logger.info(f"Task {task_id} marked as completed")
            except Exception as unpacking_error:
                # Error handling result data
                logger.error(f"Error unpacking result data for task {task_id}: {str(unpacking_error)}")
                logger.error(traceback.format_exc())
                
                # Try to salvage what we can from the result
                answer = "Error processing result data from browser process."
                if isinstance(result_data, tuple):
                    if len(result_data) > 0 and result_data[0] is not None:
                        answer = str(result_data[0])
                
                registry[task_id].update({
                    "status": "completed",  # Still mark as completed, just with error message
                    "process_status": "completed_with_errors",
                    "monitor_status": "result_processing_error",
                    "completed_at": time.time(),
                    "result": {
                        "answer": answer,
                        "chat_history": [],
                        "token_info": {}
                    }
                })
                logger.info(f"Task {task_id} marked as completed with result processing errors")
        else:
            # Error occurred in the process
            try:
                error_msg, traceback_str = result_data
                logger.error(f"Process error for task {task_id}: {error_msg}\n{traceback_str}")
                
                # Improve error message for common issues
                user_friendly_error = error_msg
                if "chrome not found" in error_msg.lower() or "executable path" in error_msg.lower():
                    user_friendly_error = "Browser not found. Please install Google Chrome to use browser features."
                elif "pickling" in error_msg.lower():
                    user_friendly_error = "Internal serialization error in browser process."
                
                registry[task_id].update({
                    "status": "error",
                    "process_status": "failed",
                    "monitor_status": "process_reported_error",
                    "completed_at": time.time(),
                    "error": f"Browser process error: {user_friendly_error}"
                })
                logger.info(f"Task {task_id} marked as error")
            except Exception as error_unpacking_error:
                # Error handling error data
                logger.error(f"Error unpacking error data for task {task_id}: {str(error_unpacking_error)}")
                registry[task_id].update({
                    "status": "error",
                    "process_status": "failed",
                    "monitor_status": "error_processing_error",
                    "completed_at": time.time(),
                    "error": "Unknown error in browser process."
                })
                logger.info(f"Task {task_id} marked as error due to error data unpacking failure")
    except Exception as e:
        error_msg = f"Error monitoring process result: {str(e)}"
        logger.error(f"{error_msg}\n{traceback.format_exc()}")
        registry[task_id].update({
            "status": "error",
            "process_status": "monitor_failed",
            "monitor_status": "exception",
            "completed_at": time.time(),
            "error": error_msg
        })
        logger.info(f"Task {task_id} marked as error due to monitoring exception")

def _execute_owl_in_process(question: str, module_name: str):
    """Execute OWL query in a separate process
    
    This function runs in a separate process and returns results via a queue.
    It handles its own greenlet/thread context to avoid threading issues.
    """
    import logging
    import sys
    import pathlib
    import time
    import traceback
    import platform
    import threading
    
    # Set a marker to indicate we're in a browser process
    os.environ["OWL_BROWSER_PROCESS"] = "1"
    
    # Patch greenlet threading to work in our context if needed
    try:
        import greenlet
        # Ensure PYTHONPATH is set correctly for imports
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        print(f"Added module path to Python path for greenlet compatibility")
    except ImportError:
        print("Greenlet not available, skipping thread patching")
    
    # Create a log file specific to this process with proper directory check
    log_dir = "/Users/smill/code/owl/logs"
    try:
        # Ensure directory exists and is writable
        if not os.path.isdir(log_dir):
            os.makedirs(log_dir, exist_ok=True)
            print(f"Created log directory: {log_dir}")
        
        # Verify write permissions by testing with a small write
        test_file = os.path.join(log_dir, f"test_write_{os.getpid()}.txt")
        with open(test_file, 'w') as f:
            f.write("Testing write permissions")
        if os.path.exists(test_file):
            os.remove(test_file)
            print("Verified write permissions")
            
        process_log_file = os.path.join(log_dir, f"browser_process_{os.getpid()}.log")
        
        # Set up logging to both console and file
        logging.basicConfig(
            level=logging.DEBUG,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.FileHandler(process_log_file),
                logging.StreamHandler()
            ]
        )
        print(f"Logging to {process_log_file}")
    except Exception as e:
        print(f"Error setting up logging: {str(e)}")
        print(f"Exception details: {traceback.format_exc()}")
        process_log_file = None
        # Fall back to console-only logging
        logging.basicConfig(
            level=logging.DEBUG,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.StreamHandler()
            ]
        )
    logger = logging.getLogger("owl_process")
    logger.info(f"======= BROWSER PROCESS STARTED (PID: {os.getpid()}) =======")
    logger.info(f"Process log file: {process_log_file}")
    logger.info(f"Question: {question}")
    logger.info(f"Module name: {module_name}")
    logger.info(f"Platform: {platform.platform()}")
    logger.info(f"User: {os.environ.get('USER')}")
    
    try:
        # Add repository root to path for imports
        repo_root = str(pathlib.Path(__file__).parent.parent.parent.parent)
        if repo_root not in sys.path:
            sys.path.append(repo_root)
            logger.info(f"Added repository root to Python path: {repo_root}")
        
        logger.info(f"Python path: {sys.path}")
        
        # Setup environment variables
        from dotenv import load_dotenv
        logger.info("Loading environment variables")
        load_dotenv()
        
        # Check for Chrome installation first
        browser_available = False
        browser_executable = None
        browser_paths = [
            # Chrome paths
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",  # macOS
            "/Applications/Google Chrome.app/Contents/MacOS/chrome",  # Alternative macOS path
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",     # Windows
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "/usr/bin/google-chrome",                                        # Linux
            "/usr/bin/chromium-browser",
            # Firefox paths
            "/Applications/Firefox.app/Contents/MacOS/firefox",  # macOS
            "C:\\Program Files\\Mozilla Firefox\\firefox.exe",  # Windows
            "/usr/bin/firefox",  # Linux
            # Safari path (macOS only)
            "/Applications/Safari.app/Contents/MacOS/Safari",  # macOS
        ]
        
        # Log which browsers we're checking for
        logger.info("Checking for browsers at the following paths:")
        for path in browser_paths:
            exists = os.path.exists(path)
            executable = os.access(path, os.X_OK) if exists else False
            logger.info(f" - {path} (exists: {exists}, executable: {executable})")
            
        # Check if any browser exists and is executable
        for browser_path in browser_paths:
            if os.path.exists(browser_path) and os.access(browser_path, os.X_OK):
                browser_available = True
                browser_executable = browser_path
                logger.info(f"Found browser executable: {browser_path}")
                
                # Get browser name
                browser_name = "Unknown"
                if "Chrome" in browser_path or "chrome" in browser_path:
                    browser_name = "Chrome"
                elif "Firefox" in browser_path or "firefox" in browser_path:
                    browser_name = "Firefox"
                elif "Safari" in browser_path:
                    browser_name = "Safari"
                    
                logger.info(f"Detected browser: {browser_name}")
                print(f"Found browser: {browser_name} at {browser_path}")
                break
        
        if not browser_available:
            if platform.system() == "Darwin":  # macOS
                logger.warning("No browser found at expected locations on macOS.")
                import subprocess
                
                # Try to find browsers using mdfind
                browsers_to_check = [
                    ("Chrome", "com.google.Chrome"),
                    ("Firefox", "org.mozilla.firefox"),
                    ("Safari", "com.apple.Safari"),
                ]
                
                for browser_name, bundle_id in browsers_to_check:
                    try:
                        logger.info(f"Checking for {browser_name} using mdfind...")
                        result = subprocess.run(["mdfind", f"kMDItemCFBundleIdentifier == '{bundle_id}'"], 
                                              capture_output=True, text=True, timeout=5)
                        if result.stdout.strip():
                            logger.info(f"{browser_name} application found via mdfind: {result.stdout.strip()}")
                            print(f"Found {browser_name} via mdfind: {result.stdout.strip()}")
                            browser_available = True
                            # If we found it, let's try to specify the executable path
                            app_path = result.stdout.strip().split("\n")[0]  # Take first result
                            if browser_name == "Chrome":
                                exec_path = os.path.join(app_path, "Contents/MacOS/Google Chrome")
                                if os.path.exists(exec_path):
                                    browser_executable = exec_path
                                    logger.info(f"Found Chrome executable at: {exec_path}")
                            elif browser_name == "Firefox":
                                exec_path = os.path.join(app_path, "Contents/MacOS/firefox")
                                if os.path.exists(exec_path):
                                    browser_executable = exec_path
                                    logger.info(f"Found Firefox executable at: {exec_path}")
                            elif browser_name == "Safari":
                                exec_path = os.path.join(app_path, "Contents/MacOS/Safari")
                                if os.path.exists(exec_path):
                                    browser_executable = exec_path
                                    logger.info(f"Found Safari executable at: {exec_path}")
                        else:
                            logger.warning(f"{browser_name} not found via mdfind")
                    except Exception as e:
                        logger.error(f"Error checking for {browser_name} via mdfind: {e}")
            else:
                logger.warning(f"No browser found on {platform.system()}")
                
        # If no browser is available, try to install one via playwright
        if not browser_available:
            logger.warning("No browser found! Attempting to install a browser via playwright...")
            print("\n==== IMPORTANT: No browsers detected! ====")
            print("Attempting to install a browser via playwright...")
            
            try:
                import subprocess
                logger.info("Running playwright install to get browsers")
                
                # Try to install a browser with playwright
                install_result = subprocess.run(
                    ["python", "-m", "playwright", "install", "chromium"],
                    capture_output=True,
                    text=True,
                    timeout=300  # 5 minutes timeout
                )
                
                if install_result.returncode == 0:
                    logger.info("Successfully installed chromium via playwright")
                    print("Successfully installed chromium browser!")
                    browser_available = True
                else:
                    logger.error(f"Failed to install browser: {install_result.stderr}")
                    print(f"Failed to install browser. Error: {install_result.stderr}")
            except Exception as e:
                logger.error(f"Error during browser installation: {e}")
                print(f"Error during browser installation: {e}")
                
            # Also provide instructions for manual installation
            print("\nIf automatic installation fails, please install Chrome manually:")
            print("  - Download Chrome from https://www.google.com/chrome/")
            print("  - Install it to the Applications folder")
            print("  - Restart the OWL API server")
        
        # Import module
        logger.info(f"Importing module: examples.{module_name}")
        module_path = f"examples.{module_name}"
        module = importlib.import_module(module_path)
        logger.info(f"Module imported successfully: {module}")
        
        # Check if default_task exists in module
        if hasattr(module, "main") and hasattr(module.main, "__globals__") and "default_task" in module.main.__globals__:
            default_task = module.main.__globals__["default_task"]
            logger.info(f"Module has default_task: {default_task[:50]}...")
            if question == default_task:
                logger.info("Using module's default_task - good!")
            else:
                logger.warning("Not using module's default_task - this might cause issues with browser operations")
        
        # Log browser toolkit configuration
        try:
            source = inspect.getsource(module.construct_society)
            logger.info(f"Module source code contains BrowserToolkit: {'BrowserToolkit' in source}")
            logger.info(f"Module source code contains headless=False: {'headless=False' in source}")
            
            # Extract and log BrowserToolkit configuration
            import re
            browser_config = re.search(r'BrowserToolkit\((.*?)\)', source, re.DOTALL)
            if browser_config:
                logger.info(f"BrowserToolkit configuration: {browser_config.group(1)}")
        except Exception as e:
            logger.error(f"Error inspecting source: {str(e)}")
        
        # Check if browser is available before building society for browser modules
        if (not browser_available and 
            (module_name in ["run_mini", "run_test_browser"] or "browser" in module_name.lower())):
            logger.error("CRITICAL ERROR: Browser module requested but no browser is available!")
            print("\n" + "="*80)
            print("CRITICAL ERROR: Browser module requested but no browser is available!")
            print("Please install Google Chrome or another browser and try again.")
            print("="*80 + "\n")
            
            # Return an error message instead of continuing with the browser module
            return (
                "ERROR: Cannot run browser module because no browser is available on this system. "
                "Please install Google Chrome (https://www.google.com/chrome/) and try again.\n\n"
                "This OWL module requires a visible browser to work properly.",
                [],
                {}
            )
            
        # Build society
        logger.info(f"Building society with question: {question[:100]}...")
        society = module.construct_society(question)
        logger.info(f"Society built successfully")
        
        # Check society's toolkit configuration
        if hasattr(society, "assistant_agent") and hasattr(society.assistant_agent, "tools"):
            tool_names = [t.__name__ if hasattr(t, "__name__") else str(t) for t in society.assistant_agent.tools]
            logger.info(f"Society has tools: {tool_names}")
            browser_tools = [t for t in tool_names if "browse" in str(t).lower() or "chrome" in str(t).lower()]
            if browser_tools:
                logger.info(f"Browser tools configured: {browser_tools}")
            else:
                logger.warning("No browser tools found in society configuration!")
        
        # Log warning about browser window
        logger.info("===== BROWSER WINDOW SHOULD OPEN SOON =====")
        logger.info("If you don't see a browser window, check if there are browser processes running in the background")
        logger.info("Or if there are any permissions/environment issues preventing window display")
        
        # Run society
        logger.info(f"Running society simulation")
        print(f"\n\n===== BROWSER PROCESS {os.getpid()} IS RUNNING SOCIETY =====")
        print(f"A browser window should open now for module: {module_name}")
        print(f"Query being processed: {question[:50]}...")
        
        # Special handling for known threading issues with browser tools
        try:
            # Monkey-patch the browser toolkit if this is a known problematic module
            if "BrowserToolkit" in source:
                logger.info("Applying BrowserToolkit threading compatibility patch")
                # We'll set a specific environment variable that the BrowserToolkit can check
                os.environ["BROWSER_TOOLKIT_THREAD_SAFE"] = "1"
                # Force single thread for browser operations
                os.environ["PLAYWRIGHT_FORCE_THREAD"] = "1"
        except Exception as patch_error:
            logger.warning(f"Error during BrowserToolkit patching: {patch_error}")
            # Continue anyway, as the patch is optional
        
        # Check for running browser processes
        try:
            import subprocess
            import platform
            
            if platform.system() == "Darwin":  # macOS
                # Check for common browsers
                browsers = ["Google Chrome", "Firefox", "Safari", "Microsoft Edge"]
                for browser in browsers:
                    try:
                        result = subprocess.run(["osascript", "-e", f'tell application "System Events" to count processes whose name is "{browser}"'], 
                                               capture_output=True, text=True, timeout=5)
                        logger.info(f"Found {result.stdout.strip()} instances of {browser}")
                    except Exception as e:
                        logger.error(f"Error checking for {browser}: {e}")
                
                # Check for X11 environment 
                try:
                    x11_check = subprocess.run(["ps", "-e"], capture_output=True, text=True, timeout=5)
                    if "Xorg" in x11_check.stdout or "X11" in x11_check.stdout:
                        logger.info("X11 environment detected")
                    else:
                        logger.warning("No X11 environment detected - may affect browser visibility")
                except Exception as e:
                    logger.error(f"Error checking X11 environment: {e}")
                
                # Check if in SSH session
                if "SSH_CLIENT" in os.environ or "SSH_TTY" in os.environ:
                    logger.warning("Running in SSH session - browser windows may not be visible")
            elif platform.system() == "Linux":
                # Check display variable on Linux
                display = os.environ.get("DISPLAY")
                logger.info(f"DISPLAY environment variable: {display}")
                if not display:
                    logger.warning("No DISPLAY environment variable set - browser windows will not be visible")
        except Exception as e:
            logger.error(f"Error checking browser environment: {e}")
        
        from owl.utils import run_society
        
        # Small delay to ensure logs are flushed
        time.sleep(2)
        
        logger.info("About to call run_society - browser should launch now")
        print("About to call run_society - browser should launch now")
        
        # Set up a timeout mechanism to detect browser launch failures
        browser_launched = False
        browser_error = None
        
        try:
            # Add browser-specific exception handling
            import threading
            import queue
            
            # Create a queue for the result
            result_queue = queue.Queue()
            
            # Define a function to run in a thread
            def run_with_timeout():
                try:
                    result = run_society(society)
                    result_queue.put(("success", result))
                except Exception as e:
                    result_queue.put(("error", (str(e), traceback.format_exc())))
            
            # Start the thread
            thread = threading.Thread(target=run_with_timeout)
            thread.daemon = True
            thread.start()
            
            # Wait for the thread with timeout (20 seconds for browser launch)
            thread.join(20)
            
            # Check if browser launched
            if thread.is_alive():
                # Thread is still running, browser likely launched successfully
                browser_launched = True
                logger.info("Browser appears to have launched successfully")
                
                # Check again for browser processes
                try:
                    import subprocess
                    if platform.system() == "Darwin":  # macOS
                        for browser in ["Google Chrome", "Firefox"]:
                            result = subprocess.run(["osascript", "-e", f'tell application "System Events" to count processes whose name is "{browser}"'], 
                                                capture_output=True, text=True, timeout=5)
                            count = result.stdout.strip()
                            if count and int(count) > 0:
                                logger.info(f"After launch: Found {count} {browser} processes")
                                print(f"After launch: Found {count} {browser} processes")
                except Exception as e:
                    logger.error(f"Error checking browser processes after launch: {e}")
                
                # Continue waiting for final result
                try:
                    result_type, result_data = result_queue.get(timeout=600)  # 10 min timeout
                    
                    if result_type == "success":
                        answer, chat_history, token_info = result_data
                        logger.info(f"Society simulation completed successfully (answer length: {len(answer) if answer else 0})")
                        if not answer or len(answer) < 10:
                            logger.warning(f"Answer is suspiciously short: '{answer}'")
                    else:
                        error_message, error_trace = result_data
                        logger.error(f"Error in society simulation: {error_message}\n{error_trace}")
                        # Return empty results but with error note
                        answer = f"Error in browser process: {error_message}\n\nYou may need to install Chrome or fix browser permissions."
                        chat_history = []
                        token_info = {}
                except queue.Empty:
                    logger.error("Timeout waiting for browser task to complete")
                    answer = "Browser process timeout - task took too long to complete. This might indicate that the browser is stuck or not responding."
                    chat_history = []
                    token_info = {}
            else:
                # Thread completed quickly, check result
                try:
                    result_type, result_data = result_queue.get_nowait()
                    
                    if result_type == "success":
                        answer, chat_history, token_info = result_data
                        logger.info(f"Society simulation completed successfully (fast, answer length: {len(answer) if answer else 0})")
                        if not answer or len(answer) < 10:
                            logger.warning(f"Answer is suspiciously short: '{answer}'")
                            if not browser_available:
                                answer = "The task completed, but no browser may be available. Please make sure Chrome is installed and accessible."
                    else:
                        error_message, error_trace = result_data
                        logger.error(f"Error in society simulation: {error_message}\n{error_trace}")
                        
                        # Check for common error patterns
                        if "chrome not found" in error_message.lower() or "executable path" in error_message.lower():
                            answer = f"Error: Chrome browser not found. Please install Google Chrome to use browser features."
                        elif "permission" in error_message.lower():
                            answer = f"Error: Permission issues with browser. Check browser permissions and try again."
                        else:
                            answer = f"Error in browser process: {error_message}\n\nThis might be due to browser configuration issues or missing dependencies."
                        
                        chat_history = []
                        token_info = {}
                except queue.Empty:
                    logger.error("Thread finished but no result available")
                    
                    if not browser_available:
                        answer = "Browser process error - no browser appears to be installed. Please install Google Chrome."
                    else:
                        answer = "Browser process error - no result available. This might indicate an issue with browser launching."
                    
                    chat_history = []
                    token_info = {}
        except Exception as e:
            logger.error(f"Error managing browser process: {str(e)}\n{traceback.format_exc()}")
            answer = f"Error managing browser process: {str(e)}\n\nPlease check browser installation and configuration."
            chat_history = []
            token_info = {}
        
        # Return results
        if answer:
            logger.info(f"Returning results (answer length={len(answer)})")
        else:
            logger.warning("Returning empty answer")
            answer = "Browser process completed but produced no response. Please check if your browser is properly installed and configured."
            
        return answer, chat_history, token_info
    except Exception as e:
        logger.error(f"===== ERROR IN BROWSER PROCESS {os.getpid()} =====")
        logger.error(f"Error in _execute_owl_in_process: {str(e)}")
        logger.error(traceback.format_exc())
        print(f"\n\n===== ERROR IN BROWSER PROCESS {os.getpid()} =====")
        print(f"Error: {str(e)}")
        print(f"See log file for details: {process_log_file}")
        
        error_summary = str(e)
        if "chrome not found" in error_summary.lower() or "chrome" in error_summary.lower():
            return "Error: Chrome browser not found. Please install Google Chrome to use browser features.", [], {}
        else:
            return f"Error in browser process: {error_summary}", [], {}

async def run_owl_query_async(task_id: str, question: str, module_name: str = "run", task_registry: Dict = None) -> None:
    """Async version of run_owl_query - wrapper around the sync version for now
    
    This is a separate function to allow for future async implementation.
    """
    # Just call the sync version for now
    # In the future, this can be refactored to use camel's async methods
    run_owl_query(task_id, question, module_name, task_registry)