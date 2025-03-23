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
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Query

from pydantic import BaseModel

from owl_api.services.env_manager import (
    get_env_vars, 
    set_env_var, 
    delete_env_var, 
    get_api_related_vars,
    is_api_related,
    get_api_guide,
    check_required_env_vars
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/env", tags=["environment"])

# Models for API requests and responses
class EnvVarRequest(BaseModel):
    """Environment variable request model"""
    key: str
    value: str

class EnvVarResponse(BaseModel):
    """Environment variable response model"""
    success: bool
    message: str

# API endpoints
@router.get("/list")
async def list_env_vars():
    """List environment variables
    
    Returns:
        Dict[str, Dict]: Dictionary of environment variables
    """
    env_vars = get_env_vars()
    
    # Format environment variables for response
    result = {}
    for key, (value, source) in env_vars.items():
        # Mask sensitive values
        is_sensitive = any(word in key.lower() for word in ["key", "token", "secret", "password"])
        masked_value = "********" if is_sensitive and value else value
        
        result[key] = {
            "value": masked_value,
            "source": source,
            "is_api_related": is_api_related(key),
            "guide": get_api_guide(key) if is_api_related(key) else ""
        }
        
    return result

@router.get("/api_related")
async def list_api_related_vars():
    """List API-related environment variables
    
    Returns:
        List[Dict]: List of API-related environment variables
    """
    api_vars = get_api_related_vars()
    
    # Mask sensitive values
    for var in api_vars:
        is_sensitive = any(word in var["key"].lower() for word in ["key", "token", "secret", "password"])
        if is_sensitive and var["value"]:
            var["value"] = "********"
            
    return api_vars

@router.post("/set")
async def update_env_var(env_var: EnvVarRequest):
    """Set an environment variable
    
    Args:
        env_var: Environment variable request containing key and value
        
    Returns:
        EnvVarResponse: Success status and message
    """
    if not env_var.key:
        raise HTTPException(status_code=400, detail="Environment variable key cannot be empty")
        
    success, message = set_env_var(env_var.key, env_var.value)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    logger.info(f"Environment variable '{env_var.key}' set successfully")
    
    return {
        "success": success,
        "message": message
    }

@router.delete("/delete/{key}")
async def remove_env_var(key: str):
    """Delete an environment variable
    
    Args:
        key: Environment variable key
        
    Returns:
        EnvVarResponse: Success status and message
    """
    if not key:
        raise HTTPException(status_code=400, detail="Environment variable key cannot be empty")
        
    success, message = delete_env_var(key)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
        
    logger.info(f"Environment variable '{key}' deleted successfully")
    
    return {
        "success": success,
        "message": message
    }

@router.get("/check")
async def check_env_vars():
    """Check if required environment variables are set
    
    Returns:
        Dict: Status and missing variables (if any)
    """
    result = check_required_env_vars()
    
    return result

@router.get("/guide/{key}")
async def get_env_var_guide(key: str):
    """Get guide for a specific environment variable
    
    Args:
        key: Environment variable key
        
    Returns:
        Dict: Guide information
    """
    guide = get_api_guide(key)
    
    return {
        "key": key,
        "is_api_related": is_api_related(key),
        "guide": guide
    }