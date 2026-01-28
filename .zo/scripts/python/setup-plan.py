#!/usr/bin/env python3
"""
setup-plan.py
Initialize implementation plan for a feature.

Usage:
    ./setup-plan.py [--json]

Options:
    --json    Output results in JSON format
    --help    Show this help message

Output:
    JSON object with:
    - FEATURE_SPEC: Path to feature specification
    - IMPL_PLAN: Path to implementation plan
    - DESIGN_FILE: Path to design file
    - SPECS_DIR: Path to feature directory
    - BRANCH: Current git branch
    - HAS_GIT: Whether git repository is available
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path

# Add parent directory to path to import common module
script_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(script_dir))

from common import get_feature_paths, check_file_exists, validate_execution_environment

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
        description='Initialize implementation plan for a feature',
        add_help=False  # We'll handle --help manually
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )
    
    parser.add_argument(
        '--help',
        '-h',
        action='store_true',
        help='Show this help message'
    )
    
    # Parse known args to handle unknown options gracefully (like bash)
    args, unknown = parser.parse_known_args()
    
    # If there are unknown args starting with -, bash exits with code 1
    for arg in unknown:
        if arg.startswith('-'):
            print(f"Error: Unknown option: {arg}", file=sys.stderr)
            sys.exit(1)
    
    return args


def main():
    """Main entry point."""
    # Validate execution environment
    if not validate_execution_environment():
        logger.error("Execution environment validation failed")
        sys.exit(1)
    
    args = parse_args()
    
    # Handle help - match bash help format
    if args.help:
        script_name = os.path.basename(sys.argv[0])
        print(f"Usage: {script_name} [--json]")
        print("  --json    Output results in JSON format")
        print("  --help    Show this help message")
        sys.exit(0)
    
    # Get all feature paths from common module
    paths = get_feature_paths()
    
    repo_root = paths['REPO_ROOT']
    feature_dir = paths['FEATURE_DIR']
    impl_plan = paths['IMPL_PLAN']
    feature_spec = paths['FEATURE_SPEC']
    design_file = paths['DESIGN_FILE']
    current_branch = paths['CURRENT_BRANCH']
    has_git = paths['HAS_GIT']
    
    # Ensure the feature directory exists
    os.makedirs(feature_dir, exist_ok=True)
    
    # Copy plan template if it exists
    template_path = os.path.join(repo_root, '.zo', 'templates', 'plan-template.md')
    
    if check_file_exists(template_path):
        # Read template
        with open(template_path, 'r') as f:
            content = f.read()
        
        # Write to implementation plan
        with open(impl_plan, 'w') as f:
            f.write(content)
        
        print(f"Copied plan template to {impl_plan}")
    else:
        print(f"Warning: Plan template not found at {template_path}", file=sys.stderr)
        # Create a basic plan file if template doesn't exist
        Path(impl_plan).touch()
    
    # Output results - use compact JSON to match bash
    if args.json:
        result = {
            'FEATURE_SPEC': feature_spec,
            'IMPL_PLAN': impl_plan,
            'DESIGN_FILE': design_file,
            'SPECS_DIR': feature_dir,
            'BRANCH': current_branch,
            'HAS_GIT': has_git
        }
        print(json.dumps(result, separators=(',', ':')))
    else:
        print(f"FEATURE_SPEC: {feature_spec}")
        print(f"IMPL_PLAN: {impl_plan}")
        print(f"DESIGN_FILE: {design_file}")
        print(f"SPECS_DIR: {feature_dir}")
        print(f"BRANCH: {current_branch}")
        print(f"HAS_GIT: {has_git}")


if __name__ == '__main__':
    main()
