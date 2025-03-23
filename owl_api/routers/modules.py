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

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
import logging

from owl_api.services.module_manager import get_available_modules, get_module_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/modules", tags=["modules"])

@router.get("/", summary="Get all available modules")
async def list_modules() -> Dict[str, str]:
    """Get all available agent modules
    
    Returns:
        Dict[str, str]: Dictionary of module names and descriptions
    """
    try:
        modules = get_available_modules()
        return modules
    except Exception as e:
        logger.error(f"Error retrieving modules: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving modules: {str(e)}")

@router.get("/{module_name}", summary="Get module details")
async def get_module(module_name: str) -> Dict[str, Any]:
    """Get detailed information about a specific module
    
    Args:
        module_name: Name of the module
        
    Returns:
        Dict[str, Any]: Detailed module information
    """
    try:
        # Validate module name
        available_modules = get_available_modules()
        if module_name not in available_modules:
            logger.warning(f"Module {module_name} not found")
            raise HTTPException(status_code=404, detail=f"Module {module_name} not found")
            
        # Get module information
        module_info = get_module_info(module_name)
        return module_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving module information: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving module information: {str(e)}")