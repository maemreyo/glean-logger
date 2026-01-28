#!/usr/bin/env python3
"""
setup-design.py
Initialize design documentation for a feature or global design system.

Usage:
    ./setup-design.py [--json] [--global] [feature-dir]

Options:
    --json    Output results in JSON format
    --global  Setup global design system (.zo/design-system.md)
    --help    Show this help message

Examples:
    ./setup-design.py                    # Auto-detect from current branch
    ./setup-design.py specs/001-feature  # Use specific feature directory
    ./setup-design.py --global           # Setup global design system

Output:
    JSON object with:
    - MODE: 'global' or 'feature'
    - DESIGN_FILE: Path to the design file
    - FEATURE_SPEC: Path to feature spec (empty in global mode)
    - FEATURE_DIR: Path to feature directory (repo root in global mode)
    - FEATURE_NAME: Feature name or 'global'
"""

import argparse
import json
import logging
import os
import re
import sys
from pathlib import Path

# Add parent directory to path to import common module
script_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(script_dir))

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)

from common import (
    get_repo_root,
    get_current_branch,
    find_feature_dir_by_prefix,
    check_file_exists,
    validate_execution_environment
)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Initialize design documentation for a feature or global design system',
        add_help=False  # We'll handle --help manually
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )
    
    parser.add_argument(
        '--global',
        '-g',
        action='store_true',
        dest='global_mode',
        help='Setup global design system (.zo/design-system.md)'
    )
    
    parser.add_argument(
        '--help',
        '-h',
        action='store_true',
        help='Show this help message'
    )
    
    parser.add_argument(
        'feature_dir',
        nargs='?',
        default='',
        help='Feature directory (optional)'
    )
    
    # Parse known args to handle unknown options gracefully (like bash)
    args, unknown = parser.parse_known_args()
    
    # If there are unknown args starting with -, bash exits with code 1
    for arg in unknown:
        if arg.startswith('-'):
            print(f"Error: Unknown option: {arg}", file=sys.stderr)
            sys.exit(1)
    
    return args


def setup_global_design(repo_root: str, json_mode: bool) -> dict:
    """
    Setup global design system.
    
    Args:
        repo_root: Repository root path
        json_mode: Whether to output JSON
        
    Returns:
        Dictionary with result information
    """
    design_file = os.path.join(repo_root, '.zo', 'design-system.md')
    feature_spec = ''
    feature_dir = repo_root
    feature_name = 'global'
    
    # Use global design system template if available
    template_path = os.path.join(repo_root, '.zo', 'templates', 'design-system-template.md')
    
    if not check_file_exists(design_file) and check_file_exists(template_path):
        # Read template
        with open(template_path, 'r') as f:
            content = f.read()
        
        # Write to design file
        with open(design_file, 'w') as f:
            f.write(content)
    
    return {
        'MODE': 'global',
        'DESIGN_FILE': design_file,
        'FEATURE_SPEC': feature_spec,
        'FEATURE_DIR': feature_dir,
        'FEATURE_NAME': feature_name
    }


def setup_feature_design(repo_root: str, feature_arg: str, json_mode: bool) -> dict:
    """
    Setup feature design.
    
    Args:
        repo_root: Repository root path
        feature_arg: Feature directory argument (if provided)
        json_mode: Whether to output JSON
        
    Returns:
        Dictionary with result information
    """
    current_branch = get_current_branch()
    
    # Handle optional feature directory argument
    if feature_arg:
        # User provided a feature directory
        if os.path.isdir(feature_arg):
            # Absolute or relative path provided
            feature_dir = os.path.abspath(feature_arg)
            feature_spec = os.path.join(feature_dir, 'spec.md')
            feature_name = os.path.basename(feature_dir)
        elif os.path.isdir(os.path.join(repo_root, feature_arg)):
            # Path relative to repo root
            feature_dir = os.path.abspath(os.path.join(repo_root, feature_arg))
            feature_spec = os.path.join(feature_dir, 'spec.md')
            feature_name = os.path.basename(feature_dir)
        else:
            logger.error(f"Directory '{feature_arg}' not found.")
            sys.exit(1)
    else:
        # Auto-detect context from current branch
        if re.match(r'^\d{3}-', current_branch):
            # Branch name is the feature name
            feature_dir = find_feature_dir_by_prefix(repo_root, current_branch)
            feature_spec = os.path.join(feature_dir, 'spec.md')
            feature_name = current_branch
        else:
            # Fallback to current directory if valid structure
            if check_file_exists('spec.md'):
                feature_dir = os.getcwd()
                feature_spec = os.path.join(feature_dir, 'spec.md')
                feature_name = os.path.basename(feature_dir)
            else:
                logger.error(
                    "Could not determine feature context. "
                    "Run inside a feature branch or specify directory."
                )
                sys.exit(1)
    
    # Define output file for feature design
    design_file = os.path.join(feature_dir, 'design.md')
    
    # Use feature design template if available
    template_path = os.path.join(repo_root, '.zo', 'templates', 'design-template.md')
    
    if not check_file_exists(design_file) and check_file_exists(template_path):
        # Read template
        with open(template_path, 'r') as f:
            content = f.read()
        
        # Replace basic placeholders
        content = content.replace('[FEATURE NAME]', feature_name)
        
        # Write to design file
        with open(design_file, 'w') as f:
            f.write(content)
    
    return {
        'MODE': 'feature',
        'DESIGN_FILE': design_file,
        'FEATURE_SPEC': feature_spec,
        'FEATURE_DIR': feature_dir,
        'FEATURE_NAME': feature_name
    }


def main():
    """Main entry point."""
    # Validate execution environment
    if not validate_execution_environment():
        logger.error("Execution environment validation failed.")
        sys.exit(1)
    
    args = parse_args()
    
    # Handle help
    if args.help:
        print(__doc__)
        sys.exit(0)
    
    # Get repository root
    repo_root = get_repo_root()
    
    # Handle global vs feature mode
    if args.global_mode:
        result = setup_global_design(repo_root, args.json)
    else:
        result = setup_feature_design(repo_root, args.feature_dir, args.json)
    
    # Output results - use compact JSON to match bash
    if args.json:
        print(json.dumps(result, separators=(',', ':')))
    else:
        if result['MODE'] == 'global':
            print(f"MODE: {result['MODE']}")
            print(f"DESIGN_FILE: {result['DESIGN_FILE']}")
        else:
            print(f"MODE: {result['MODE']}")
            print(f"DESIGN_FILE: {result['DESIGN_FILE']}")
            print(f"FEATURE_SPEC: {result['FEATURE_SPEC']}")
            print(f"FEATURE_DIR: {result['FEATURE_DIR']}")
            print(f"FEATURE_NAME: {result['FEATURE_NAME']}")


if __name__ == '__main__':
    main()
