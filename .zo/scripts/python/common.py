#!/usr/bin/env python3
"""
Common utility functions for Spec-Driven Development workflow.

This module provides shared utility functions that can be used by other
Python scripts in the .zo/scripts/python directory. It ports functionality
from .zo/scripts/bash/common.sh for use in Python-based scripts.

Usage:
    # Import functions
    from common import get_repo_root, get_current_branch, has_git
    
    # Import path resolution utilities
    from common import resolve_path, get_workspace_path, normalize_task_id

Functions:
    has_git() - Check if git is available
    get_repo_root() - Get repository root path
    get_workspace_path() - Get workspace root path from PWD or git
    get_current_branch() - Get current git branch
    get_feature_paths() - Get all feature-related paths (eval-style output)
    check_feature_branch() - Validate feature branch naming
    check_file() - Check if file exists and print status
    check_dir() - Check if directory exists and print status
    check_file_exists() - Check if file exists (return bool)
    check_dir_exists() - Check if directory exists (return bool)
    check_dir_exists_with_files() - Check if directory has files (return bool)
    find_feature_dir_by_prefix() - Find feature directory by numeric prefix
    get_feature_dir() - Get feature directory path
    resolve_path() - Resolve file path, handling common AI mistakes
    strip_duplicate_workspace_prefix() - Remove doubled workspace path
    normalize_task_id() - Normalize task ID: [T001] -> T001, task_T001 -> T001
"""

import logging
import os
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Optional, Tuple

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)


# ============================================================================
# Git Utility Functions
# ============================================================================

def run_git_command(args: list) -> Optional[str]:
    """
    Run a git command and return output, or None if git not available.
    
    Args:
        args: List of git command arguments
        
    Returns:
        Command output as string, or None if command fails
    """
    try:
        result = subprocess.run(
            ['git'] + args,
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def has_git() -> bool:
    """
    Check if git is available and this is a git repository.
    
    Returns:
        True if git is available, False otherwise
    """
    return run_git_command(['rev-parse', '--show-toplevel']) is not None


# ============================================================================
# Repository and Branch Functions
# ============================================================================

def get_repo_root() -> str:
    """
    Get repository root, with fallback for non-git repositories.
    
    Returns:
        Path to repository root directory
    """
    # Try git first
    git_root = run_git_command(['rev-parse', '--show-toplevel'])
    if git_root:
        return git_root
    
    # Fall back to script location for non-git repos
    script_dir = Path(__file__).parent.resolve()
    # Go up 3 levels: python -> scripts -> .zo -> project
    repo_root = script_dir.parent.parent.parent
    return str(repo_root.resolve())


def get_current_branch() -> str:
    """
    Get current branch, with fallback for non-git repositories.
    
    Returns:
        Current branch name or feature directory name
    """
    # First check if SPECIFY_FEATURE environment variable is set
    specify_feature = os.environ.get('SPECIFY_FEATURE', '')
    if specify_feature:
        logger.debug(f"Using SPECIFY_FEATURE env var: {specify_feature}")
        return specify_feature
    
    # Then check git if available
    git_branch = run_git_command(['rev-parse', '--abbrev-ref', 'HEAD'])
    if git_branch:
        logger.debug(f"Using git branch: {git_branch}")
        return git_branch
    
    # For non-git repos, try to find the latest feature directory
    repo_root = get_repo_root()
    specs_dir = Path(repo_root) / 'specs'
    
    if not specs_dir.exists():
        logger.debug("No specs directory found, using 'main' as fallback")
        return 'main'
    
    latest_feature = None
    highest = 0
    
    try:
        for entry in specs_dir.iterdir():
            if entry.is_dir():
                dirname = entry.name
                match = re.match(r'^(\d{3})-(.+)$', dirname)
                if match:
                    number = int(match.group(1))
                    if number > highest:
                        highest = number
                        latest_feature = dirname
    except OSError as e:
        logger.warning(f"Error reading specs directory: {e}")
    
    if latest_feature:
        logger.debug(f"Found latest feature directory: {latest_feature}")
        return latest_feature
    
    logger.debug("No feature directories found, using 'main' as fallback")
    return 'main'


def get_feature_dir(repo_root: str, branch_name: str) -> str:
    """
    Get the feature directory path for a given branch.
    
    Args:
        repo_root: Repository root path
        branch_name: Current branch name
        
    Returns:
        Path to feature directory
    """
    return find_feature_dir_by_prefix(repo_root, branch_name)


def find_feature_dir_by_prefix(repo_root: str, branch_name: str) -> str:
    """
    Find feature directory by numeric prefix instead of exact branch match.
    This allows multiple branches to work on the same spec.
    
    Args:
        repo_root: Repository root path
        branch_name: Current branch name
        
    Returns:
        Path to feature directory
    """
    specs_dir = Path(repo_root) / 'specs'
    
    # Extract numeric prefix from branch (e.g., "004" from "004-whatever")
    match = re.match(r'^(\d{3})-(.+)$', branch_name)
    if not match:
        # If branch doesn't have numeric prefix, fall back to exact match
        logger.debug(f"Branch '{branch_name}' doesn't match prefix pattern, using exact match")
        return str(specs_dir / branch_name)
    
    prefix = match.group(1)
    
    # Search for directories in specs/ that start with this prefix
    matches = []
    if specs_dir.exists():
        try:
            for entry in specs_dir.iterdir():
                if entry.is_dir() and entry.name.startswith(f'{prefix}-'):
                    matches.append(entry.name)
        except OSError as e:
            logger.warning(f"Error searching specs directory: {e}")
    
    # Handle results
    if len(matches) == 0:
        # No match found - return the branch name path (will fail later with clear error)
        logger.debug(f"No matching directories found for prefix '{prefix}'")
        return str(specs_dir / branch_name)
    elif len(matches) == 1:
        # Exactly one match - perfect!
        logger.debug(f"Found single matching directory: {matches[0]}")
        return str(specs_dir / matches[0])
    else:
        # Multiple matches - this shouldn't happen with proper naming convention
        error_msg = (
            f"Multiple spec directories found with prefix '{prefix}': {', '.join(matches)}\n"
            f"Please ensure only one spec directory exists per numeric prefix."
        )
        logger.error(error_msg)
        return str(specs_dir / branch_name)


# ============================================================================
# Feature Paths Functions
# ============================================================================

def get_feature_paths() -> dict:
    """
    Get all feature-related paths as a dictionary.
    
    Returns:
        Dictionary containing all path variables
    """
    workspace = get_workspace_path()
    repo_root = get_repo_root()
    current_branch = get_current_branch()
    has_git_repo = has_git()
    
    # Use prefix-based lookup to support multiple branches per spec
    feature_dir = find_feature_dir_by_prefix(repo_root, current_branch)
    
    # Resolve duplicate workspace prefix for feature_dir
    feature_dir = strip_duplicate_workspace_prefix(feature_dir, workspace)
    
    # Helper to resolve and normalize paths
    def resolve_path_var(path: str) -> str:
        resolved = strip_duplicate_workspace_prefix(path, workspace)
        return os.path.abspath(resolved)
    
    return {
        'REPO_ROOT': resolve_path_var(repo_root),
        'CURRENT_BRANCH': current_branch,
        'HAS_GIT': 'true' if has_git_repo else 'false',
        'FEATURE_DIR': resolve_path_var(feature_dir),
        'FEATURE_SPEC': resolve_path_var(os.path.join(feature_dir, 'spec.md')),
        'IMPL_PLAN': resolve_path_var(os.path.join(feature_dir, 'plan.md')),
        'TASKS': resolve_path_var(os.path.join(feature_dir, 'tasks.md')),
        'RESEARCH': resolve_path_var(os.path.join(feature_dir, 'research.md')),
        'DATA_MODEL': resolve_path_var(os.path.join(feature_dir, 'data-model.md')),
        'QUICKSTART': resolve_path_var(os.path.join(feature_dir, 'quickstart.md')),
        'CONTRACTS_DIR': resolve_path_var(os.path.join(feature_dir, 'contracts')),
        'DESIGN_FILE': resolve_path_var(os.path.join(feature_dir, 'design.md')),
        'GLOBAL_DESIGN_SYSTEM': resolve_path_var(os.path.join(repo_root, '.zo', 'design-system.md')),
    }


def format_feature_paths_for_eval() -> str:
    """
    Format feature paths as bash eval-compatible output.
    
    Returns:
        String with bash variable assignments (eval style)
    """
    paths = get_feature_paths()
    
    lines = [
        f"REPO_ROOT='{paths['REPO_ROOT']}'",
        f"CURRENT_BRANCH='{paths['CURRENT_BRANCH']}'",
        f"HAS_GIT='{paths['HAS_GIT']}'",
        f"FEATURE_DIR='{paths['FEATURE_DIR']}'",
        f"FEATURE_SPEC='{paths['FEATURE_SPEC']}'",
        f"IMPL_PLAN='{paths['IMPL_PLAN']}'",
        f"TASKS='{paths['TASKS']}'",
        f"RESEARCH='{paths['RESEARCH']}'",
        f"DATA_MODEL='{paths['DATA_MODEL']}'",
        f"QUICKSTART='{paths['QUICKSTART']}'",
        f"CONTRACTS_DIR='{paths['CONTRACTS_DIR']}'",
        f"DESIGN_FILE='{paths['DESIGN_FILE']}'",
    ]
    
    return '\n'.join(lines)


# ============================================================================
# Feature Branch Validation Functions
# ============================================================================

def check_feature_branch(branch: str, has_git_repo: bool) -> Tuple[bool, Optional[str]]:
    """
    Check if the current branch is a valid feature branch.
    
    Args:
        branch: Current branch name
        has_git_repo: Whether git repository is available
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # For non-git repos, we can't enforce branch naming but still provide output
    if not has_git_repo:
        return (True, None)
    
    # Check if branch matches feature branch pattern (e.g., 001-feature-name)
    if not re.match(r'^\d{3}-', branch):
        error_msg = (
            f"ERROR: Not on a feature branch. Current branch: {branch}\n"
            f"Feature branches should be named like: 001-feature-name"
        )
        return (False, error_msg)
    
    return (True, None)


# ============================================================================
# File and Directory Check Functions
# ============================================================================

def check_file_exists(file_path: str) -> bool:
    """
    Check if a file exists.
    
    Args:
        file_path: Path to file
        
    Returns:
        True if file exists, False otherwise
    """
    return os.path.isfile(file_path)


def check_dir_exists(dir_path: str) -> bool:
    """
    Check if a directory exists.
    
    Args:
        dir_path: Path to directory
        
    Returns:
        True if directory exists, False otherwise
    """
    return os.path.isdir(dir_path)


def check_dir_exists_with_files(dir_path: str) -> bool:
    """
    Check if a directory exists and contains files.
    
    Args:
        dir_path: Path to directory
        
    Returns:
        True if directory exists and has files, False otherwise
    """
    if not os.path.isdir(dir_path):
        return False
    try:
        # Check if directory has any files/subdirectories
        return any(os.scandir(dir_path))
    except OSError:
        return False


def check_file(file_path: str, display_name: str) -> str:
    """
    Check if file exists and return formatted status string.
    
    Args:
        file_path: Path to file
        display_name: Name to display
        
    Returns:
        Formatted status string with checkmark or cross
    """
    if check_file_exists(file_path):
        return f"  ✓ {display_name}"
    else:
        return f"  ✗ {display_name}"


def check_dir(dir_path: str, display_name: str) -> str:
    """
    Check if directory exists with files and return formatted status string.
    
    Args:
        dir_path: Path to directory
        display_name: Name to display
        
    Returns:
        Formatted status string with checkmark or cross
    """
    if check_dir_exists_with_files(dir_path):
        return f"  ✓ {display_name}"
    else:
        return f"  ✗ {display_name}"


# ============================================================================
# Path Resolution Functions (for AI CWD resilience)
# ============================================================================

def get_workspace_path() -> str:
    """
    Get the workspace root path from environment or current directory.
    
    This function handles the case where AIs may change the current working
    directory (CWD) to incorrect locations.
    
    Returns:
        Workspace root path as absolute string
    """
    pwd = os.environ.get('PWD', '')
    workspace = os.environ.get('WORKSPACE', os.environ.get('HOME', ''))
    cwd = os.getcwd()
    
    logger.debug(f"Environment check:")
    logger.debug(f"  PWD env: {pwd}")
    logger.debug(f"  CWD: {cwd}")
    
    # Detect duplicate path segments (e.g., /Users/Users/ or /home/home/)
    if '/Users/' in cwd and cwd.count('/Users/') > 1:
        logger.warning(f"CWD contains duplicate '/Users/' ({cwd.count('/Users/')} times): {cwd}")
    
    if '/home/' in cwd and cwd.count('/home/') > 1:
        logger.warning(f"CWD contains duplicate '/home/' ({cwd.count('/home/')} times): {cwd}")
    
    if pwd and os.path.exists(pwd):
        logger.debug(f"Using PWD: {pwd}")
        return os.path.abspath(pwd)
    
    logger.debug(f"Using CWD: {cwd}")
    return os.path.abspath(cwd)


def validate_execution_environment() -> bool:
    """
    Validate that we're running in the correct environment.
    
    Returns:
        True if environment is valid, False otherwise
    """
    workspace = get_workspace_path()
    
    # Check for obvious path duplication patterns
    segments = [s for s in workspace.split('/') if s]  # Filter empty strings
    
    segment_counts = Counter(segments)
    
    duplicates = [seg for seg, count in segment_counts.items() if count > 1]
    if duplicates:
        logger.error(f"Detected duplicate path segments: {duplicates}")
        logger.error(f"   Workspace: {workspace}")
        return False
    
    # Check if workspace exists
    if not os.path.exists(workspace):
        logger.error(f"Workspace path does not exist: {workspace}")
        return False
    
    logger.debug(f"Execution environment validated: {workspace}")
    return True


def normalize_task_id(task_id: str) -> str:
    """
    Normalize task ID to standard format TXXX.
    
    Handles common variations:
    - [T001] -> T001
    - task_T001 -> T001
    - T001 -> T001
    
    Args:
        task_id: Raw task ID input
    
    Returns:
        Normalized task ID in format T001
    """
    original = task_id
    
    # Remove brackets if present: [T001] -> T001
    task_id = task_id.strip()
    if task_id.startswith('[') and task_id.endswith(']'):
        task_id = task_id[1:-1]
    
    # Remove 'task_' prefix if present: task_T001 -> T001
    if task_id.lower().startswith('task_'):
        task_id = task_id[5:]
    
    # Ensure uppercase T prefix
    if not task_id.startswith('T') and re.match(r'^\d{3}$', task_id):
        task_id = 'T' + task_id
    
    if original != task_id:
        logger.debug(f"Normalized task ID: '{original}' -> '{task_id}'")
    
    return task_id


def strip_duplicate_workspace_prefix(path: str, workspace: str) -> str:
    """
    Strip duplicate workspace prefix from path.
    
    Handles cases like:
    /Users/xxx/Documents/zaob-dev/glean-v2/Users/xxx/Documents/zaob-dev/glean-v2/specs/...
    
    Args:
        path: The input file path
        workspace: The workspace root path
    
    Returns:
        Path with duplicate prefix stripped if detected
    """
    # Check for doubled workspace path (e.g., /path/to/workspace/path/to/workspace/...)
    doubled_pattern = workspace + workspace
    if path.startswith(doubled_pattern):
        corrected = path[len(workspace):]
        logger.warning(f"Detected doubled workspace path, corrected: {path[:50]}... -> {corrected[:50]}...")
        return corrected
    
    # Check if path starts with workspace + '/Users/xxx/...' pattern
    if path.startswith(workspace):
        after_workspace = path[len(workspace):].lstrip('/')
        
        if after_workspace.startswith('Users/') or after_workspace.startswith('User/'):
            second_occurrence = path.find(after_workspace)
            if second_occurrence > len(workspace):
                corrected = '/' + after_workspace
                logger.warning(f"Detected duplicate workspace segment, corrected: {path[:50]}... -> {corrected}")
                return corrected
    
    return path


def resolve_path(task_file: str) -> str:
    """
    Resolve task file path, handling common AI mistakes.
    
    This function handles:
    1. Double workspace path (AI mistakenly prepends workspace twice)
    2. Non-existent paths from wrong CWD (tries common locations)
    3. Relative paths from different directories
    
    Args:
        task_file: The input file path (possibly incorrect)
    
    Returns:
        Resolved absolute path to the file, or original if not found
    """
    workspace = get_workspace_path()
    original_path = task_file
    
    # Case A: Strip duplicate workspace prefix
    task_file = strip_duplicate_workspace_prefix(task_file, workspace)
    
    # Case B: Try multiple locations if file doesn't exist
    if not os.path.exists(task_file):
        possible_paths = []
        
        # Original path (just in case)
        possible_paths.append(task_file)
        
        # Try relative to workspace
        ws_relative = os.path.join(workspace, task_file)
        possible_paths.append(ws_relative)
        
        # Try with 'specs/' prefix if not already present
        basename = os.path.basename(task_file)
        possible_paths.append(os.path.join(workspace, 'specs', basename))
        
        # Try with 'specs/' prefix for full path
        if not task_file.startswith('specs/'):
            possible_paths.append(os.path.join(workspace, 'specs', task_file))
        
        # Try parent directories (for when AI assumes wrong CWD)
        parts = task_file.split(os.sep)
        if len(parts) > 1:
            possible_paths.append(os.path.join(workspace, parts[-1]))
        
        # Try current working directory
        cwd = os.getcwd()
        if cwd != workspace:
            possible_paths.append(os.path.join(cwd, task_file))
            possible_paths.append(os.path.join(cwd, 'specs', os.path.basename(task_file)))
        
        # Find the first existing path
        for path in possible_paths:
            if os.path.exists(path):
                abs_path = os.path.abspath(path)
                if abs_path != original_path:
                    logger.warning(f"Path not found at '{original_path}', resolved to: {abs_path}")
                return abs_path
        
        # If file exists after normalization, use it
        if os.path.exists(task_file):
            return os.path.abspath(task_file)
    
    # Return absolute path if file exists
    if os.path.exists(task_file):
        return os.path.abspath(task_file)
    
    # Return original if nothing works (will fail at file check later)
    logger.warning(f"Could not resolve path, using original: {task_file}")
    return task_file


# ============================================================================
# Main Entry Point (for bash sourcing)
# ============================================================================

def main():
    """Main entry point for bash sourcing mode."""
    print(format_feature_paths_for_eval())


if __name__ == '__main__':
    main()
