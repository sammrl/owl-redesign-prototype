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
import sys
import time
import json
import traceback
import multiprocessing
from typing import Dict, Any, Optional

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("browser_process")

def browser_worker(input_queue, output_queue, env_vars=None):
    """
    Worker function that runs in a separate process to handle browser operations
    
    Args:
        input_queue: Queue for receiving tasks
        output_queue: Queue for sending results
        env_vars: Environment variables to set in the worker process
    """
    logger.info("Browser worker process started with PID: %s", os.getpid())
    
    # Set environment variables if provided
    if env_vars:
        for key, value in env_vars.items():
            os.environ[key] = value
            
    # Import modules here to ensure they're loaded in the worker process
    try:
        from dotenv import load_dotenv
        load_dotenv()  # Load environment variables
        
        # Import CAMEL modules inside the process
        from camel.models import ModelFactory
        from camel.toolkits import BrowserToolkit
        from camel.types import ModelPlatformType, ModelType
        from camel.societies import RolePlaying
        
        # Import OWL utilities
        from owl.utils import run_society
        
        # Import example modules
        sys.path.insert(0, ".")  # Ensure imports work from the project root
        
        logger.info("Imports successful in browser worker")
    except ImportError as e:
        error_msg = f"Failed to import required modules in browser worker: {str(e)}"
        logger.error(error_msg)
        output_queue.put({"status": "error", "error": error_msg})
        return
    
    # Main worker loop
    while True:
        try:
            # Get task from queue
            task = input_queue.get()
            
            # Check for termination signal
            if task == "STOP":
                logger.info("Received STOP signal, shutting down browser worker")
                break
                
            # Process task
            task_id = task.get("task_id")
            query = task.get("query")
            module_name = task.get("module")
            
            logger.info(f"Processing task {task_id} with query: {query[:50]}...")
            
            # Send initial status update
            output_queue.put({
                "task_id": task_id,
                "status": "processing",
                "message": f"Browser process started (PID: {os.getpid()})"
            })
            
            # Load the specified module
            try:
                if module_name == "run_mini":
                    # Direct import for run_mini as it's the most common
                    import examples.run_mini as module
                else:
                    # Dynamic import for other modules
                    module = __import__(f"examples.{module_name}", fromlist=[""])
                
                # Check if module has construct_society function
                if not hasattr(module, "construct_society"):
                    raise ImportError(f"Module {module_name} does not have construct_society function")
                
                # Send status update about module loading
                output_queue.put({
                    "task_id": task_id,
                    "status": "processing",
                    "message": f"Loaded module {module_name}, initializing browser"
                })
                
                # Create society using the module
                society = module.construct_society(query)
                
                # Send status update about browser mode
                browser_mode = "visible"  # Default to visible for now
                try:
                    # Try to detect browser visibility mode
                    tools = society.assistant_agent.tools
                    for tool in tools:
                        if hasattr(tool, "__closure__") and "headless" in str(tool.__closure__):
                            headless = "headless=True" in str(tool.__closure__)
                            browser_mode = "headless" if headless else "visible"
                            break
                except Exception as e:
                    logger.warning(f"Could not detect browser mode: {e}")
                
                output_queue.put({
                    "task_id": task_id,
                    "status": "processing",
                    "message": f"Creating society with {browser_mode} browser mode",
                    "browser_mode": browser_mode
                })
                
                # Run society
                logger.info(f"Running society for task {task_id}...")
                answer, chat_history, token_info = run_society(society)
                
                # Send success result
                logger.info(f"Task {task_id} completed successfully")
                output_queue.put({
                    "task_id": task_id,
                    "status": "completed",
                    "result": {
                        "answer": answer,
                        "chat_history": chat_history,
                        "token_info": token_info
                    }
                })
                
            except Exception as e:
                error_msg = f"Error in browser worker: {str(e)}\n{traceback.format_exc()}"
                logger.error(error_msg)
                output_queue.put({
                    "task_id": task_id,
                    "status": "error",
                    "error": error_msg
                })
                
        except Exception as e:
            # Handle any exceptions in the worker loop
            logger.error(f"Unhandled exception in browser worker: {str(e)}\n{traceback.format_exc()}")
            if 'task_id' in locals():
                output_queue.put({
                    "task_id": task_id,
                    "status": "error",
                    "error": f"Unhandled exception in browser worker: {str(e)}"
                })
    
    logger.info("Browser worker process shutting down")