#!/usr/bin/env python3
"""
Consolidated prerequisite checking script for Spec-Driven Development workflow.

This script provides unified prerequisite checking for Spec-Driven Development workflow.
It replaces the functionality previously spread across multiple bash scripts.

This script uses the shared `common.py` module for core utility functions.

Usage: ZO_DEBUG=1 python3check-prerequisites.py [OPTIONS]

OPTIONS:
  --json              Output in JSON format
  --require-tasks     Require tasks.md to exist (for implementation phase)
  --include-tasks     Include tasks.md in AVAILABLE_DOCS list
  --paths-only        Only output path variables (no validation)
  --help, -h          Show help message

OUTPUTS:
  JSON mode: {"FEATURE_DIR":"...", "AVAILABLE_DOCS":["..."]}
  Text mode: FEATURE_DIR:... \n AVAILABLE_DOCS: \n ✓/✗ file.md
  Paths only: REPO_ROOT: ... \n BRANCH: ... \n FEATURE_DIR: ... etc.
"""

import argparse
import json
import logging
import os
import sys

# Import shared utility functions from common.py
from common import (
    get_feature_paths,
    has_git,
    get_repo_root,
    get_current_branch,
    get_workspace_path,
    check_feature_branch,
    check_file_exists,
    check_dir_exists_with_files,
    resolve_path,
    validate_execution_environment,
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


# ============================================================================
# Output Functions (script-specific)
# ============================================================================

def format_json_paths(paths: dict) -> str:
    """
    Format paths as JSON for paths-only mode.
    
    Args:
        paths: Dictionary of path variables
        
    Returns:
        JSON formatted string (compact, no indentation)
    """
    return json.dumps({
        'REPO_ROOT': paths['REPO_ROOT'],
        'BRANCH': paths['CURRENT_BRANCH'],
        'FEATURE_DIR': paths['FEATURE_DIR'],
        'FEATURE_SPEC': paths['FEATURE_SPEC'],
        'IMPL_PLAN': paths['IMPL_PLAN'],
        'TASKS': paths['TASKS'],
    }, separators=(',', ':'))


def format_json_result(feature_dir: str, available_docs: list) -> str:
    """
    Format result as JSON.
    
    Args:
        feature_dir: Feature directory path
        available_docs: List of available document names
        
    Returns:
        JSON formatted string (compact)
    """
    result = {
        'FEATURE_DIR': feature_dir,
        'AVAILABLE_DOCS': available_docs,
    }
    return json.dumps(result, separators=(',', ':'))


def check_file_status(file_path: str, display_name: str) -> str:
    """
    Check file status and return formatted string.
    
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


def check_dir_status(dir_path: str, display_name: str) -> str:
    """
    Check directory status and return formatted string.
    
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


def print_help():
    """Print help message."""
    help_text = """Usage: check-prerequisites.sh [OPTIONS]

Consolidated prerequisite checking for Spec-Driven Development workflow.

OPTIONS:
  --json              Output in JSON format
  --require-tasks     Require tasks.md to exist (for implementation phase)
  --include-tasks     Include tasks.md in AVAILABLE_DOCS list
  --paths-only        Only output path variables (no prerequisite validation)
  --help, -h          Show this help message

EXAMPLES:
  # Check task prerequisites (plan.md required)
  ./check-prerequisites.sh --json
  
  # Check implementation prerequisites (plan.md + tasks.md required)
  ./check-prerequisites.sh --json --require-tasks --include-tasks
  
  # Get feature paths only (no validation)
  ./check-prerequisites.sh --paths-only
  
"""
    print(help_text)


# ============================================================================
# Main Logic
# ============================================================================

def main():
    """Main entry point for the script."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--json', action='store_true', help='Output in JSON format')
    parser.add_argument('--require-tasks', action='store_true', help='Require tasks.md to exist')
    parser.add_argument('--include-tasks', action='store_true', help='Include tasks.md in AVAILABLE_DOCS list')
    parser.add_argument('--paths-only', action='store_true', help='Only output path variables (no validation)')
    parser.add_argument('--help', '-h', action='store_true', help='Show help message')
    
    # Check for unknown arguments
    args, unknown = parser.parse_known_args()
    if unknown:
        print(f"ERROR: Unknown option '{unknown[0]}'. Use --help for usage information.", file=sys.stderr)
        sys.exit(1)
    
    # Handle help flag
    if args.help:
        print_help()
        sys.exit(0)
    
    logger.debug("Starting prerequisite check")
    
    # Validate execution environment
    if not validate_execution_environment():
        print("ERROR: Execution environment validation failed.", file=sys.stderr)
        sys.exit(1)
    
    # Get feature paths and validate branch
    paths = get_feature_paths()
    
    # Log all paths for debugging
    logger.debug("Feature paths resolved:")
    for key, value in paths.items():
        logger.debug(f"  {key}: {value}")
    
    is_valid, error_msg = check_feature_branch(
        paths['CURRENT_BRANCH'], 
        paths['HAS_GIT'] == 'true'
    )
    
    if not is_valid:
        print(f"ERROR: {error_msg}", file=sys.stderr)
        sys.exit(1)
    
    # If paths-only mode, output paths and exit
    if args.paths_only:
        if args.json:
            print(format_json_paths(paths))
        else:
            print(f"REPO_ROOT: {paths['REPO_ROOT']}")
            print(f"BRANCH: {paths['CURRENT_BRANCH']}")
            print(f"FEATURE_DIR: {paths['FEATURE_DIR']}")
            print(f"FEATURE_SPEC: {paths['FEATURE_SPEC']}")
            print(f"IMPL_PLAN: {paths['IMPL_PLAN']}")
            print(f"TASKS: {paths['TASKS']}")
        sys.exit(0)
    
    # Resolve paths for file operations
    feature_dir = resolve_path(paths['FEATURE_DIR'])
    impl_plan = resolve_path(paths['IMPL_PLAN'])
    tasks = resolve_path(paths['TASKS'])
    research = resolve_path(paths['RESEARCH'])
    data_model = resolve_path(paths['DATA_MODEL'])
    design_file = resolve_path(paths['DESIGN_FILE'])
    contracts_dir = resolve_path(paths['CONTRACTS_DIR'])
    quickstart = resolve_path(paths['QUICKSTART'])
    
    # Validate required directories and files
    if not os.path.isdir(feature_dir):
        print(f"ERROR: Feature directory not found: {feature_dir}", file=sys.stderr)
        print(f"  Current working directory: {os.getcwd()}", file=sys.stderr)
        print(f"  Expected feature directory: {feature_dir}", file=sys.stderr)
        print("Run /zo.zo first to create the feature structure.", file=sys.stderr)
        sys.exit(1)
    
    if not os.path.isfile(impl_plan):
        print(f"ERROR: plan.md not found in {feature_dir}", file=sys.stderr)
        print("Run /zo.plan first to create the implementation plan.", file=sys.stderr)
        sys.exit(1)
    
    # Check for tasks.md if required
    if args.require_tasks and not os.path.isfile(tasks):
        print(f"ERROR: tasks.md not found in {feature_dir}", file=sys.stderr)
        print("Run /zo.tasks first to create the task list.", file=sys.stderr)
        sys.exit(1)
    
    # Build list of available documents
    available_docs = []
    
    # Always check these optional docs
    if check_file_exists(research):
        available_docs.append('research.md')
    if check_file_exists(data_model):
        available_docs.append('data-model.md')
    if check_file_exists(design_file):
        available_docs.append('design.md')
    
    # Check contracts directory (only if it exists and has files)
    if check_dir_exists_with_files(contracts_dir):
        available_docs.append('contracts/')
    
    if check_file_exists(quickstart):
        available_docs.append('quickstart.md')
    
    # Include tasks.md if requested and it exists
    if args.include_tasks and check_file_exists(tasks):
        available_docs.append('tasks.md')
    
    # Output results
    if args.json:
        print(format_json_result(paths['FEATURE_DIR'], available_docs))
    else:
        # Text output
        print(f"FEATURE_DIR:{paths['FEATURE_DIR']}")
        print("AVAILABLE_DOCS:")
        
        # Show status of each potential document
        print(check_file_status(research, 'research.md'))
        print(check_file_status(data_model, 'data-model.md'))
        print(check_file_status(design_file, 'design.md'))
        print(check_dir_status(contracts_dir, 'contracts/'))
        print(check_file_status(quickstart, 'quickstart.md'))
        
        if args.include_tasks:
            print(check_file_status(tasks, 'tasks.md'))
    
    logger.debug("Prerequisite check completed successfully")
    sys.exit(0)


if __name__ == '__main__':
    main()
