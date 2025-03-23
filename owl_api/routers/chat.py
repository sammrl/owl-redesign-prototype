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
import uuid
import asyncio
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, BackgroundTasks, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query

from pydantic import BaseModel

from owl_api.services.owl_runner import run_owl_query, TASK_REGISTRY
from owl_api.ws.chat import handle_websocket

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/run", tags=["chat"])

# Models for API requests and responses
class QueryRequest(BaseModel):
    """Query request model"""
    query: str
    module: str = "run"

class QueryResponse(BaseModel):
    """Query response model"""
    task_id: str
    status: str

class TaskStatusResponse(BaseModel):
    """Task status response model"""
    status: str
    query: str
    module: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# API Endpoints
@router.post("/async")
async def start_query(query_request: QueryRequest, background_tasks: BackgroundTasks):
    """Start an asynchronous query
    
    Args:
        query_request: Query request containing query and module
        background_tasks: FastAPI background tasks
        
    Returns:
        Task ID and status
    """
    task_id = str(uuid.uuid4())
    
    # Start query in background task
    background_tasks.add_task(
        run_owl_query,
        task_id=task_id,
        question=query_request.query,
        module_name=query_request.module,
        task_registry=TASK_REGISTRY
    )
    
    logger.info(f"Started async query task {task_id}: {query_request.query[:100]}...")
    
    return {
        "task_id": task_id,
        "status": "processing"
    }

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Get status of a specific task
    
    Args:
        task_id: Task identifier
        
    Returns:
        Task status and result if available
    """
    if task_id not in TASK_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    
    task_info = TASK_REGISTRY[task_id]
    
    return task_info

@router.delete("/task/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a running task
    
    Args:
        task_id: Task identifier
        
    Returns:
        Success status
    """
    if task_id not in TASK_REGISTRY:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    
    # Mark task as cancelled
    TASK_REGISTRY[task_id]["status"] = "cancelled"
    logger.info(f"Task {task_id} cancelled by API request")
    
    return {
        "status": "success",
        "message": f"Task {task_id} cancelled"
    }

@router.get("/tasks")
async def list_tasks(
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None
):
    """List running tasks
    
    Args:
        limit: Maximum number of tasks to return
        status: Filter by status (processing, completed, error, cancelled)
        
    Returns:
        List of tasks
    """
    tasks = []
    
    for task_id, task_info in list(TASK_REGISTRY.items())[-limit:]:
        # Filter by status if specified
        if status and task_info.get("status") != status:
            continue
            
        tasks.append({
            "task_id": task_id,
            "query": task_info.get("query", "")[:100] + "..." if len(task_info.get("query", "")) > 100 else task_info.get("query", ""),
            "module": task_info.get("module", ""),
            "status": task_info.get("status", "unknown")
        })
        
    return tasks

# WebSocket endpoint
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time communication
    
    Args:
        websocket: WebSocket connection
    """
    client_id = str(uuid.uuid4())
    await handle_websocket(websocket, client_id)