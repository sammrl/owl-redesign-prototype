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

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Any, Optional
import logging

from owl_api.services.log_manager import get_log_entries, get_log_files, clear_log_file, get_conversation_history

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/logs", tags=["logs"])

@router.get("/", summary="Get log entries")
async def get_logs(
    max_entries: Optional[int] = Query(100, description="Maximum number of log entries to return"),
    filter_text: Optional[str] = Query(None, description="Text to filter logs by"),
    log_file: Optional[str] = Query(None, description="Specific log file to read from")
) -> List[Dict[str, Any]]:
    """Get log entries from the system
    
    Args:
        max_entries: Maximum number of log entries to return
        filter_text: Text to filter logs by
        log_file: Specific log file to read from
        
    Returns:
        List[Dict[str, Any]]: List of log entries
    """
    try:
        logs = get_log_entries(max_entries, filter_text, log_file)
        return logs
    except Exception as e:
        logger.error(f"Error retrieving logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving logs: {str(e)}")

@router.get("/files", summary="Get available log files")
async def list_log_files(
    include_browser_logs: Optional[bool] = Query(True, description="Whether to include browser process logs")
) -> List[Dict[str, Any]]:
    """Get a list of available log files
    
    Args:
        include_browser_logs: Whether to include browser process logs
        
    Returns:
        List[Dict[str, Any]]: List of log file information
    """
    try:
        files = get_log_files(include_browser_logs=include_browser_logs)
        return files
    except Exception as e:
        logger.error(f"Error retrieving log files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving log files: {str(e)}")
        
@router.get("/browser", summary="Get browser process logs")
async def get_browser_logs(
    max_entries: Optional[int] = Query(100, description="Maximum number of log entries to return"),
    filter_text: Optional[str] = Query(None, description="Text to filter logs by")
) -> Dict[str, Any]:
    """Get logs from browser processes
    
    This endpoint returns logs from browser processes that run in separate processes.
    
    Args:
        max_entries: Maximum number of log entries to return
        filter_text: Text to filter logs by
        
    Returns:
        Dict[str, Any]: Log entries and file information
    """
    try:
        # Get list of browser log files
        all_files = get_log_files(include_browser_logs=True)
        browser_files = [f for f in all_files if f["type"] in ["browser", "process_pool"]]
        
        if not browser_files:
            return {
                "files": [],
                "entries": [],
                "message": "No browser log files found. Browser operations may not have been used yet."
            }
        
        # Get the most recent browser log file
        most_recent_file = browser_files[0]
        
        # Get log entries from the most recent file
        entries = get_log_entries(max_entries=max_entries, 
                                 filter_text=filter_text, 
                                 log_file=most_recent_file["path"])
        
        return {
            "files": browser_files[:5],  # Return up to 5 most recent files
            "current_file": most_recent_file,
            "entries": entries,
            "total_files": len(browser_files)
        }
        
    except Exception as e:
        logger.error(f"Error retrieving browser logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving browser logs: {str(e)}")

@router.get("/conversations", summary="Get conversation history")
async def get_conversations(
    max_conversations: Optional[int] = Query(10, description="Maximum number of conversations to return")
) -> List[Dict[str, Any]]:
    """Get conversation history from logs
    
    Args:
        max_conversations: Maximum number of conversations to return
        
    Returns:
        List[Dict[str, Any]]: List of conversation records
    """
    try:
        conversations = get_conversation_history(max_conversations)
        return conversations
    except Exception as e:
        logger.error(f"Error retrieving conversation history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving conversation history: {str(e)}")

@router.delete("/clear", summary="Clear log file")
async def clear_logs(log_file: Optional[str] = Query(None, description="Specific log file to clear")) -> Dict[str, str]:
    """Clear the specified log file or the current log file
    
    Args:
        log_file: Specific log file to clear
        
    Returns:
        Dict[str, str]: Result of the operation
    """
    try:
        result = clear_log_file(log_file)
        return {"status": "success", "message": result}
    except Exception as e:
        logger.error(f"Error clearing log file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error clearing log file: {str(e)}")