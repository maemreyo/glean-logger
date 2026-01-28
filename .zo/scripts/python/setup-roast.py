#!/usr/bin/env python3
"""
setup-roast.py
Initialize a roast report for code review.

Usage:
    ./setup-roast.py [--json] [--json=JSON_DATA] [feature_dir]
    ./setup-roast.py [--json] {JSON_DATA} [feature_dir]

Options:
    --json              Output results in JSON format
    --json=JSON_DATA    Input JSON data with commits array and optional design_system
                        Example: --json='{"commits":["abc123","def456"],"design_system":"/path"}'
    feature_dir         Optional feature directory path (defaults to current branch)
    --help, -h          Show this help message

Output:
    JSON object with:
    - REPORT_FILE: Path to roast report
    - TASKS: Path to tasks file
    - IMPL_PLAN: Path to implementation plan
    - BRANCH: Current git branch
    - COMMITS: Comma-separated commit hashes (if provided)
    - DESIGN_SYSTEM: Path to design system file

The roast report is created at: FEATURE_DIR/roasts/roast-report-FEATURE_NAME-YYYY-MM-DD-HHMM.md
"""

import argparse
import json
import logging
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)

# Add parent directory to path to import common module
script_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(script_dir))

from common import (
    get_feature_paths,
    check_file_exists,
    validate_execution_environment,
)


def parse_json_input(arg_value: str) -> dict:
    """
    Parse JSON input from command line argument.
    
    Args:
        arg_value: JSON string or argument starting with {
        
    Returns:
        Parsed JSON as dictionary
    """
    json_str = arg_value
    
    # Handle --json= format where value is after =
    if arg_value.startswith('--json='):
        json_str = arg_value[7:]  # Remove --json= prefix
    elif arg_value.startswith('{'):
        # Already a JSON object, use as-is
        json_str = arg_value
    else:
        # --json flag without value, return empty dict
        return {}
    
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON input: {e}")
        sys.exit(1)


def resolve_feature_dir(feature_arg: str, repo_root: str) -> tuple:
    """
    Resolve feature directory path from argument.
    
    Args:
        feature_arg: Feature directory argument (relative or absolute path)
        repo_root: Repository root path
        
    Returns:
        Tuple of (feature_dir, feature_name)
    """
    feature_path = Path(feature_arg)
    
    if feature_path.is_absolute() and feature_path.is_dir():
        # Absolute path
        feature_dir = str(feature_path.resolve())
        feature_name = feature_path.name
        logger.info(f"Using specified feature directory: {feature_dir}")
        return feature_dir, feature_name
    
    # Try as relative path from current directory
    if feature_path.is_dir():
        feature_dir = str(feature_path.resolve())
        feature_name = feature_path.name
        logger.info(f"Using specified feature directory: {feature_dir}")
        return feature_dir, feature_name
    
    # Try as relative path from repo root
    repo_relative = Path(repo_root) / feature_arg
    if repo_relative.is_dir():
        feature_dir = str(repo_relative.resolve())
        feature_name = repo_relative.name
        logger.info(f"Using specified feature directory: {feature_dir}")
        return feature_dir, feature_name
    
    logger.error(f"Directory '{feature_arg}' not found.")
    sys.exit(1)


def create_roast_report(report_file: str, template_path: str, json_data: dict) -> None:
    """
    Create roast report from template, optionally appending metadata.
    
    Args:
        report_file: Path to roast report file
        template_path: Path to template file
        json_data: Parsed JSON data for metadata
    """
    if check_file_exists(template_path):
        shutil.copy(template_path, report_file)
        logger.info(f"Initialized Roast Report at {report_file}")
    else:
        logger.warning(f"Roast template not found at {template_path}")
        Path(report_file).touch()
    
    # Append metadata if JSON input provided
    commits = json_data.get('commits', [])
    design_system = json_data.get('design_system', '')
    
    if commits or design_system:
        with open(report_file, 'a') as f:
            f.write("\n\n<!--\n")
            if commits:
                commits_str = ','.join(commits)
                f.write(f"Commits: {commits_str}\n")
            if design_system:
                f.write(f"Design System: {design_system}\n")
            f.write("-->\n")


def main():
    """Main entry point."""
    # Validate execution environment
    if not validate_execution_environment():
        logger.error("Execution environment validation failed.")
        sys.exit(1)
    
    parser = argparse.ArgumentParser(
        description='Initialize a roast report for code review',
        add_help=False
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )
    
    parser.add_argument(
        '--json-data',
        help='JSON data with commits and design_system (internal use)'
    )
    
    parser.add_argument(
        'feature_dir',
        nargs='?',
        help='Optional feature directory path'
    )
    
    parser.add_argument(
        '--help',
        '-h',
        action='store_true',
        help='Show this help message'
    )
    
    # Parse known args to handle potential JSON object as positional arg
    args, remaining = parser.parse_known_args()
    
    # Handle help
    if args.help:
        print(__doc__)
        sys.exit(0)
    
    # Get all feature paths from common module
    paths = get_feature_paths()
    repo_root = paths['REPO_ROOT']
    current_branch = paths['CURRENT_BRANCH']
    
    # Parse JSON input if provided
    json_data = {}
    json_mode = args.json
    
    # Check for --json= format in remaining args
    for arg in remaining:
        if arg.startswith('--json='):
            json_data = parse_json_input(arg)
            json_mode = True
            break
        elif arg.startswith('{'):
            json_data = parse_json_input(arg)
            json_mode = True
            break
    
    # Also check internal --json-data argument
    if args.json_data:
        try:
            json_data = json.loads(args.json_data)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON input: {e}")
            sys.exit(1)
        json_mode = True
    
    # Determine feature directory and name
    if args.feature_dir:
        feature_dir, feature_name = resolve_feature_dir(args.feature_dir, repo_root)
        
        # Override derived paths
        feature_spec = os.path.join(feature_dir, 'spec.md')
        impl_plan = os.path.join(feature_dir, 'plan.md')
        tasks = os.path.join(feature_dir, 'tasks.md')
    else:
        feature_name = current_branch
        
        # Special handling for main/master branch - require feature dir or use repo root
        if feature_name in ('main', 'master'):
            if json_data:
                # Use .zo directory as FEATURE_DIR so roasts go to .zo/roasts/
                feature_dir = os.path.join(repo_root, '.zo')
                feature_spec = os.path.join(feature_dir, 'spec.md')
                impl_plan = os.path.join(feature_dir, 'plan.md')
                tasks = os.path.join(feature_dir, 'tasks.md')
                logger.warning("Not on a feature branch. Using repo root for roast report.")
            else:
                logger.error("Not on a feature branch. Please specify a feature directory or switch to a feature branch.")
                logger.error(f"Usage: {sys.argv[0]} [--json] <feature-directory>")
                sys.exit(1)
        else:
            feature_dir = paths['FEATURE_DIR']
            feature_spec = paths['FEATURE_SPEC']
            impl_plan = paths['IMPL_PLAN']
            tasks = paths['TASKS']
    
    # Ensure the roast directory exists INSIDE the feature spec folder
    roasts_dir = os.path.join(feature_dir, 'roasts')
    os.makedirs(roasts_dir, exist_ok=True)
    
    # Define report path with timestamp
    date_str = datetime.now().strftime('%Y-%m-%d-%H%M')
    report_file = os.path.join(roasts_dir, f'roast-report-{feature_name}-{date_str}.md')
    
    # Parse commits and design system from JSON
    commits = json_data.get('commits', [])
    commits_str = ','.join(commits) if commits else ''
    design_system = json_data.get('design_system', '')
    
    if not design_system:
        # Default design system if not provided in JSON
        design_system = os.path.join(repo_root, '.zo', 'design-system.md')
    
    # Create roast report
    template_path = os.path.join(repo_root, '.zo', 'templates', 'roast-template.md')
    create_roast_report(report_file, template_path, json_data)
    
    # Output results - use compact JSON to match bash
    if json_mode:
        result = {
            'REPORT_FILE': report_file,
            'TASKS': tasks,
            'IMPL_PLAN': impl_plan,
            'BRANCH': current_branch,
            'COMMITS': commits_str,
            'DESIGN_SYSTEM': design_system
        }
        print(json.dumps(result, separators=(',', ':')))
    else:
        print(f"REPORT_FILE: {report_file}")
        print(f"TASKS: {tasks}")
        print(f"IMPL_PLAN: {impl_plan}")
        print(f"BRANCH: {current_branch}")
        if commits_str:
            print(f"COMMITS: {commits_str}")
        if design_system:
            print(f"DESIGN_SYSTEM: {design_system}")


if __name__ == '__main__':
    main()
