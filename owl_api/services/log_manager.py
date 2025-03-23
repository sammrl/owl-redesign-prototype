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
import re
import json
import glob
import logging
import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Global variables
LOG_DIRECTORY = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")

def setup_logging() -> str:
    """Set up logging configuration
    
    Returns:
        str: Path to the log file
    """
    # Create logs directory if it doesn't exist
    os.makedirs(LOG_DIRECTORY, exist_ok=True)
    
    # Generate current date for log filename
    current_date = datetime.datetime.now().strftime("%Y-%m-%d")
    log_file = os.path.join(LOG_DIRECTORY, f"owl_api_{current_date}.log")
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    
    logger.info(f"Logging initialized, log file: {log_file}")
    return log_file

def get_log_files(include_browser_logs: bool = True) -> List[Dict[str, Any]]:
    """Get a list of available log files
    
    Args:
        include_browser_logs: Whether to include browser process logs
        
    Returns:
        List[Dict[str, Any]]: List of log file information
    """
    if not os.path.exists(LOG_DIRECTORY):
        os.makedirs(LOG_DIRECTORY, exist_ok=True)
        return []
    
    log_files = []
    
    # Get regular log files
    for filename in glob.glob(os.path.join(LOG_DIRECTORY, "*.log")):
        basename = os.path.basename(filename)
        file_size = os.path.getsize(filename)
        mod_time = os.path.getmtime(filename)
        
        # Determine log type
        log_type = "regular"
        if "browser_process" in basename:
            log_type = "browser"
        elif "process_pool" in basename:
            log_type = "process_pool"
        
        log_files.append({
            "filename": basename,
            "path": filename,
            "size": file_size,
            "size_human": f"{file_size / 1024:.1f} KB" if file_size < 1024 * 1024 else f"{file_size / (1024 * 1024):.1f} MB",
            "modified": datetime.datetime.fromtimestamp(mod_time).isoformat(),
            "is_current": filename == get_current_log_file(),
            "type": log_type
        })
    
    # Sort by modification time (most recent first)
    log_files.sort(key=lambda x: x["modified"], reverse=True)
    
    # Filter browser logs if requested
    if not include_browser_logs:
        log_files = [log for log in log_files if log["type"] == "regular"]
        
    return log_files

def get_current_log_file() -> str:
    """Get the path to the current log file
    
    Returns:
        str: Path to the current log file
    """
    current_date = datetime.datetime.now().strftime("%Y-%m-%d")
    return os.path.join(LOG_DIRECTORY, f"owl_api_{current_date}.log")

def get_latest_log_file() -> Optional[str]:
    """Get the path to the most recent log file
    
    Returns:
        Optional[str]: Path to the most recent log file, or None if no log files exist
    """
    log_files = get_log_files()
    return log_files[0]["path"] if log_files else None

def parse_log_line(line: str) -> Optional[Dict[str, Any]]:
    """Parse a log line into a structured format
    
    Args:
        line: A line from the log file
        
    Returns:
        Optional[Dict[str, Any]]: Structured log entry or None if couldn't parse
    """
    # Example: "2023-12-01 12:00:00,123 - module - INFO - message"
    log_pattern = r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+) - ([a-zA-Z0-9_\.]+) - ([A-Z]+) - (.*)"
    match = re.match(log_pattern, line)
    
    if match:
        timestamp, module, level, message = match.groups()
        try:
            dt = datetime.datetime.strptime(timestamp, "%Y-%m-%d %H:%M:%S,%f")
            return {
                "timestamp": dt.isoformat(),
                "timestamp_raw": timestamp,
                "module": module,
                "level": level,
                "message": message
            }
        except ValueError:
            # If timestamp parsing fails
            return None
    
    return None

def extract_conversation_records(logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Extract conversation records from logs
    
    Args:
        logs: List of parsed log entries
        
    Returns:
        List[Dict[str, Any]]: List of conversation records
    """
    conversation_records = []
    
    for log in logs:
        # Only process logs from chat agents
        if "camel.agents.chat_agent" not in log.get("module", ""):
            continue
            
        message = log.get("message", "")
        
        # Try to extract messages array
        messages_match = re.search(r"Model (.*?), index (\d+), processed these messages: (\[.*\])", message)
        
        if messages_match:
            try:
                # Extract model name, conversation index, and messages
                model_name = messages_match.group(1)
                index = int(messages_match.group(2))
                messages = json.loads(messages_match.group(3))
                
                # Extract user and assistant messages
                for msg in messages:
                    if msg.get("role") in ["user", "assistant"]:
                        conversation_records.append({
                            "timestamp": log.get("timestamp", ""),
                            "model": model_name,
                            "index": index,
                            "role": msg.get("role"),
                            "content": msg.get("content", "")
                        })
            except json.JSONDecodeError:
                pass
        
        # If JSON parsing fails or no message array is found, try to extract conversation directly
        if not messages_match:
            user_pattern = re.compile(r"\{'role': 'user', 'content': '(.*?)'\}")
            assistant_pattern = re.compile(r"\{'role': 'assistant', 'content': '(.*?)'\}")
            
            for content in user_pattern.findall(message):
                conversation_records.append({
                    "timestamp": log.get("timestamp", ""),
                    "model": "unknown",
                    "index": -1,
                    "role": "user",
                    "content": content
                })
                
            for content in assistant_pattern.findall(message):
                conversation_records.append({
                    "timestamp": log.get("timestamp", ""),
                    "model": "unknown",
                    "index": -1,
                    "role": "assistant",
                    "content": content
                })
                
    return conversation_records

def get_log_entries(max_entries: int = 100, 
                   filter_text: Optional[str] = None,
                   log_file: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get log entries from the system
    
    Args:
        max_entries: Maximum number of log entries to return
        filter_text: Text to filter logs by
        log_file: Specific log file to read from
        
    Returns:
        List[Dict[str, Any]]: List of log entries
    """
    # Ensure logs directory exists
    os.makedirs(LOG_DIRECTORY, exist_ok=True)
    
    # Determine which log file to read
    if log_file:
        if os.path.dirname(log_file):
            # Full path specified
            file_path = log_file
        else:
            # Just filename specified
            file_path = os.path.join(LOG_DIRECTORY, log_file)
    else:
        # Use current log file
        file_path = get_current_log_file()
        
    # Check if file exists
    if not os.path.exists(file_path):
        logger.warning(f"Log file not found: {file_path}")
        return []
        
    entries = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            current_entry = None
            
            for line in f:
                line = line.rstrip()
                
                # Try to parse as a new log entry
                parsed = parse_log_line(line)
                
                if parsed:
                    # This is a new log entry
                    if current_entry and (not filter_text or 
                                        filter_text.lower() in str(current_entry).lower()):
                        entries.append(current_entry)
                        if len(entries) >= max_entries:
                            break
                            
                    # Start new entry
                    current_entry = parsed
                elif current_entry:
                    # This is a continuation of the previous entry
                    current_entry["message"] += "\n" + line
                    
            # Add the last entry if there is one
            if current_entry and (not filter_text or 
                                filter_text.lower() in str(current_entry).lower()):
                entries.append(current_entry)
                
    except Exception as e:
        logger.error(f"Error reading log file {file_path}: {str(e)}")
        
    # Reverse to get newest entries first and apply limit
    return list(reversed(entries))[:max_entries]

def get_conversation_history(max_conversations: int = 10) -> List[Dict[str, Any]]:
    """Get the most recent conversation history from logs
    
    Args:
        max_conversations: Maximum number of conversations to return
        
    Returns:
        List[Dict[str, Any]]: List of conversation records
    """
    # Get raw logs (more lines to ensure we capture full conversations)
    raw_logs = get_log_entries(max_entries=1000)
    
    # Extract conversation records
    conversation_records = extract_conversation_records(raw_logs)
    
    # Keep only the most recent conversations
    if len(conversation_records) > max_conversations:
        conversation_records = conversation_records[-max_conversations:]
        
    return conversation_records

def clear_log_file(log_file: Optional[str] = None) -> str:
    """Clear the specified log file or the current log file
    
    Args:
        log_file: Specific log file to clear
        
    Returns:
        str: Result message
    """
    # Ensure logs directory exists
    os.makedirs(LOG_DIRECTORY, exist_ok=True)
    
    # Determine which log file to clear
    if log_file:
        if os.path.dirname(log_file):
            # Full path specified
            file_path = log_file
        else:
            # Just filename specified
            file_path = os.path.join(LOG_DIRECTORY, log_file)
    else:
        # Use current log file
        file_path = get_current_log_file()
        
    # Check if file exists
    if not os.path.exists(file_path):
        logger.warning(f"Log file not found: {file_path}")
        return f"Log file not found: {os.path.basename(file_path)}"
        
    try:
        # Clear the file contents
        with open(file_path, "w") as f:
            pass
            
        logger.info(f"Cleared log file: {file_path}")
        return f"Successfully cleared log file: {os.path.basename(file_path)}"
        
    except Exception as e:
        logger.error(f"Error clearing log file {file_path}: {str(e)}")
        raise Exception(f"Error clearing log file: {str(e)}")