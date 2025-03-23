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

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
import sys
import os
import pathlib

# Add repository root to path for imports
sys.path.append(str(pathlib.Path(__file__).parent.parent))

# Import routers
from owl_api.routers import chat, env, modules, logs
from owl_api.services.process_pool import get_process_pool, get_browser_process_pool, _cleanup

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f"owl_api_{time.strftime('%Y-%m-%d')}.log")
    ]
)

logger = logging.getLogger("owl_api")

# Application lifecycle events
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing process pools...")
    try:
        # Initialize regular process pool
        from owl_api.services.process_pool import get_process_pool
        get_process_pool()
        logger.info("Regular process pool initialized")
        
        # Initialize browser process pool
        from owl_api.services.process_pool import get_browser_process_pool
        get_browser_process_pool()
        logger.info("Browser process pool initialized")
    except Exception as e:
        logger.error(f"Error initializing process pools: {str(e)}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down process pools...")
    try:
        from owl_api.services.process_pool import _cleanup
        _cleanup()  # Shutdown all process pools
        logger.info("Process pools shut down")
    except Exception as e:
        logger.error(f"Error shutting down process pools: {str(e)}")

# Fix for multiprocessing resource leaks
import multiprocessing
# Set spawn method to avoid issues with forking
# This is especially important for macOS where fork can cause issues
if hasattr(multiprocessing, 'set_start_method'):
    try:
        multiprocessing.set_start_method('spawn', force=True)
        logger.info("Set multiprocessing start method to 'spawn'")
    except RuntimeError:
        logger.warning("Could not set multiprocessing start method - already set")

# Create FastAPI application
app = FastAPI(
    title="OWL API",
    description="API for OWL (Optimized Workforce Learning) multi-agent collaboration system",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware with explicit WebSocket support
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request processing time middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Request processed in {process_time:.4f}s: {request.url.path}")
    return response

# Health check endpoint
@app.get("/")
async def root():
    return {
        "status": "online",
        "api": "OWL API",
        "version": "1.0.0"
    }

# Exception handling
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "message": str(exc)}
    )

# Include routers
app.include_router(chat.router, prefix="/api")
app.include_router(env.router, prefix="/api")
app.include_router(modules.router, prefix="/api")
app.include_router(logs.router, prefix="/api")

# Start server with uvicorn when script is run directly
if __name__ == "__main__":
    import uvicorn
    import signal
    
    # Determine port - use PORT env var if available, else 8000
    port = int(os.environ.get("PORT", 8000))
    
    # Set up proper signal handlers for clean process termination
    def handle_exit(sig, frame):
        logger.info(f"Received signal {sig}, shutting down...")
        # Force cleanup of process pools before exit
        from owl_api.services.process_pool import _cleanup
        _cleanup()
        
        # Force cleanup of multiprocessing resources
        try:
            import multiprocessing as mp
            from multiprocessing.resource_tracker import _resource_tracker
            logger.info("Forcing resource tracker cleanup...")
            if hasattr(_resource_tracker, "_stop"):
                _resource_tracker._stop()
            
            # Attempt to close any remaining semaphores
            if hasattr(_resource_tracker, "_fd_to_resource_types"):
                for fd in list(_resource_tracker._fd_to_resource_types.keys()):
                    try:
                        logger.info(f"Manually closing resource fd: {fd}")
                        os.close(fd)
                    except Exception as e:
                        logger.error(f"Error closing resource fd {fd}: {str(e)}")
            
            # Reset the resource tracker state
            if hasattr(_resource_tracker, "_resource_type_to_fds"):
                _resource_tracker._resource_type_to_fds.clear()
            if hasattr(_resource_tracker, "_fd_to_resource_types"):
                _resource_tracker._fd_to_resource_types.clear()
        except Exception as e:
            logger.error(f"Error during resource tracker cleanup: {str(e)}")
        
        # Force full garbage collection
        try:
            import gc
            logger.info("Running final garbage collection...")
            gc.collect()
        except Exception as e:
            logger.error(f"Error during final GC: {str(e)}")
            
        logger.info("Cleanup complete, exiting...")
        
    # Register signal handlers
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    
    # Start server 
    logger.info(f"Starting OWL API server on port {port}")
    uvicorn.run("owl_api.main:app", host="0.0.0.0", port=port, reload=True)