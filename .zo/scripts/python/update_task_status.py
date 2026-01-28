#!/usr/bin/env python3
"""
Update task status in tasks.md files.

This script marks tasks as completed by changing `- [ ]` to `- [x]` 
for specified task IDs in a markdown tasks file.

Usage:
    ZO_DEBUG=1 python3 update_task_status.py <tasks_file> <task_id> [task_id...]
    ZO_DEBUG=1 python3 update_task_status.py /path/to/tasks.md T001
    ZO_DEBUG=1 python3 update_task_status.py tasks.md T001 T002 T003

Examples:
    # Single task
    ZO_DEBUG=1 python3 update_task_status.py specs/001-feature/tasks.md T001
    
    # Multiple tasks
    ZO_DEBUG=1 python3 update_task_status.py tasks.md T001 T002 T005
    
    # Task range
    ZO_DEBUG=1 python3 update_task_status.py tasks.md T001-T005
    
    # Mixed (range + individual)
    ZO_DEBUG=1 python3 update_task_status.py tasks.md T001-T003 T005 T007-T009
    
    # Bracket format
    ZO_DEBUG=1 python3 update_task_status.py tasks.md [T001] [T002] --verbose
    
    # With task_ prefix
    ZO_DEBUG=1 python3 update_task_status.py tasks.md task_T001 task_T002 --verbose

Options:
    --dry-run    Show what would be changed without modifying file
    --verbose    Show detailed output
    --help, -h   Show this help message
"""

import argparse
import logging
import os
import re
import sys
from pathlib import Path
from typing import List, Optional, Set, Tuple

# Import shared utilities from common module
from common import (
    get_workspace_path,
    validate_execution_environment,
    normalize_task_id,
    strip_duplicate_workspace_prefix,
    resolve_path as common_resolve_path
)

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Update task status in tasks.md files (supports batch updates)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Single task
  ZO_DEBUG=1 python3 update_task_status.py tasks.md T001
  
  # Multiple tasks
  ZO_DEBUG=1 python3 update_task_status.py tasks.md T001 T002 T005
  
  # Task range
  ZO_DEBUG=1 python3 update_task_status.py tasks.md T001-T005
  
  # Mixed (range + individual)
  ZO_DEBUG=1 python3 update_task_status.py tasks.md T001-T003 T005 T007-T009
  
  # Dry run to preview changes
  ZO_DEBUG=1 python3 update_task_status.py tasks.md T001-T005 --dry-run
        '''
    )
    parser.add_argument(
        'tasks_file',
        help='Path to the tasks.md file'
    )
    parser.add_argument(
        'task_ids',
        nargs='+',
        help='Task ID(s) to mark as completed (e.g., T001, T001-T005, or multiple IDs)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without modifying file'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed output'
    )
    return parser.parse_args()


def validate_task_id(task_id: str) -> bool:
    """Validate task ID format (e.g., T001, T123)."""
    pattern = r'^T\d{3}$'
    return bool(re.match(pattern, task_id))


def expand_task_range(range_str: str) -> List[str]:
    """
    Expand task range to list of task IDs.
    
    Args:
        range_str: Range string like "T001-T005" or single "T001"
    
    Returns:
        List of task IDs
    
    Examples:
        expand_task_range("T001-T005") -> ["T001", "T002", "T003", "T004", "T005"]
        expand_task_range("T001") -> ["T001"]
    """
    # Check if it's a range (contains hyphen)
    if '-' in range_str:
        parts = range_str.split('-')
        if len(parts) != 2:
            logger.warning(f"Invalid range format: {range_str}")
            return []
        
        start_id, end_id = parts[0].strip(), parts[1].strip()
        
        # Normalize task IDs
        start_id = normalize_task_id(start_id)
        end_id = normalize_task_id(end_id)
        
        # Validate format
        if not (validate_task_id(start_id) and validate_task_id(end_id)):
            logger.warning(f"Invalid task ID format in range: {range_str}")
            return []
        
        # Extract numbers
        start_num = int(start_id[1:])  # Remove 'T' prefix
        end_num = int(end_id[1:])
        
        if start_num > end_num:
            logger.warning(f"Invalid range: start ({start_id}) > end ({end_id})")
            return []
        
        # Generate range
        return [f"T{i:03d}" for i in range(start_num, end_num + 1)]
    else:
        # Single task ID
        normalized = normalize_task_id(range_str)
        if validate_task_id(normalized):
            return [normalized]
        else:
            logger.warning(f"Invalid task ID: {range_str}")
            return []


def parse_task_ids(task_id_args: List[str]) -> Set[str]:
    """
    Parse and expand task ID arguments (handles ranges and multiple IDs).
    
    Args:
        task_id_args: List of task ID strings (can include ranges)
    
    Returns:
        Set of normalized task IDs
    """
    all_task_ids = set()
    
    for arg in task_id_args:
        expanded = expand_task_range(arg)
        all_task_ids.update(expanded)
    
    return all_task_ids


def find_task_line(content: str, task_id: str) -> Optional[int]:
    """
    Find the line number of a task by its ID.
    
    Args:
        content: File content as string
        task_id: Task ID to find (e.g., 'T001')
    
    Returns:
        Line number if found, None otherwise
    """
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Match task pattern: - [ ] T001 or - [x] T001
        # Also handles: - [ ] [T001] for bracket-wrapped IDs
        task_pattern = rf'- \[([ xX])\] ?\[?{re.escape(task_id)}\]?'
        if re.search(task_pattern, line):
            return i
    return None


def update_single_task(lines: List[str], task_id: str) -> Tuple[bool, Optional[str]]:
    """
    Update a single task status in the lines array.
    
    Args:
        lines: List of file lines
        task_id: Task ID to mark as completed
    
    Returns:
        Tuple of (was_modified, old_line)
    """
    task_pattern = rf'^(- \[)([ xX])(\] ?\[?{re.escape(task_id)}\]?.*)$'
    
    for i, line in enumerate(lines):
        match = re.match(task_pattern, line)
        if match:
            # Check if task is already completed
            if match.group(2).lower() == 'x':
                logger.debug(f"Task {task_id} already completed")
                return False, None
            
            # Update from - [ ] to - [x]
            old_line = line
            new_line = f"{match.group(1)}x{match.group(3)}"
            lines[i] = new_line
            logger.debug(f"Updated line {i+1}: {old_line} -> {new_line}")
            return True, old_line
    
    return False, None


def batch_update_tasks(content: str, task_ids: Set[str]) -> Tuple[str, dict]:
    """
    Update multiple task statuses.
    
    Args:
        content: File content as string
        task_ids: Set of task IDs to mark as completed
    
    Returns:
        Tuple of (updated_content, results_dict)
        
        results_dict contains:
        - 'updated': list of task IDs that were updated
        - 'already_done': list of task IDs already marked as complete
        - 'not_found': list of task IDs not found in file
    """
    lines = content.split('\n')
    results = {
        'updated': [],
        'already_done': [],
        'not_found': []
    }
    
    for task_id in sorted(task_ids):
        line_num = find_task_line(content, task_id)
        
        if line_num is None:
            results['not_found'].append(task_id)
            logger.debug(f"Task {task_id} not found")
            continue
        
        modified, old_line = update_single_task(lines, task_id)
        
        if modified:
            results['updated'].append(task_id)
        else:
            results['already_done'].append(task_id)
    
    return '\n'.join(lines), results


def main():
    """Main entry point."""
    # Validate execution environment first
    if not validate_execution_environment():
        logger.error("Execution environment validation failed. Please check the workspace path.")
        sys.exit(1)
    
    args = parse_args()
    
    # Set logging level
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Parse and expand task IDs (handles ranges)
    task_ids = parse_task_ids(args.task_ids)
    
    if not task_ids:
        logger.error("No valid task IDs provided")
        sys.exit(1)
    
    logger.debug(f"Processing {len(task_ids)} task(s): {sorted(task_ids)}")
    
    # Resolve path (handle common AI path mistakes)
    resolved_path = common_resolve_path(args.tasks_file)
    
    # Check if tasks file exists
    if not os.path.isfile(resolved_path):
        logger.error(f"Tasks file not found: {args.tasks_file}")
        logger.error(f"Resolved path: {resolved_path}")
        sys.exit(1)
    
    # Read file content
    try:
        with open(resolved_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except IOError as e:
        logger.error(f"Failed to read tasks file: {e}")
        sys.exit(1)
    
    # Update task statuses
    updated_content, results = batch_update_tasks(content, task_ids)
    
    # Report results
    if args.dry_run:
        logger.info("[DRY RUN] Changes that would be made:")
        if results['updated']:
            logger.info(f"  Would update {len(results['updated'])} task(s): {', '.join(results['updated'])}")
        if results['already_done']:
            logger.info(f"  Already completed: {', '.join(results['already_done'])}")
        if results['not_found']:
            logger.warning(f"  Not found: {', '.join(results['not_found'])}")
    else:
        # Write updated content if there were changes
        if results['updated']:
            try:
                with open(resolved_path, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                logger.info(f"✓ Marked {len(results['updated'])} task(s) as completed: {', '.join(results['updated'])}")
            except IOError as e:
                logger.error(f"Failed to write tasks file: {e}")
                sys.exit(1)
        else:
            logger.info("No tasks were updated")
        
        # Report already done tasks
        if results['already_done']:
            logger.info(f"  Already completed: {', '.join(results['already_done'])}")
        
        # Report not found tasks
        if results['not_found']:
            logger.warning(f"  Not found: {', '.join(results['not_found'])}")
    
    # Exit with error if any tasks were not found
    if results['not_found']:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == '__main__':
    main()