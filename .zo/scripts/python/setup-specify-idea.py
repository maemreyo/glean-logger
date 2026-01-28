#!/usr/bin/env python3
"""
Setup for Spec-Driven Development - Find brainstorm file and spec template.

This script locates the appropriate brainstorm file and outputs paths needed
for creating a spec from an idea. It supports both JSON and plain text output.

Usage:
    ZO_DEBUG=1 python3 setup-specify-idea.py [--json] [brainstorm_file]
    
Arguments:
    --json, -h    Output results in JSON format
    brainstorm_file  Optional path to brainstorm file (absolute or relative)

The script searches for brainstorm files in the following order:
1. User-provided path (if specified)
2. .zo/brainstorms/ (primary location)
3. FEATURE_DIR/brainstorms/ (legacy)
4. docs/brainstorms/ (legacy)

Example:
    ZO_DEBUG=1 python3 setup-specify-idea.py
    ZO_DEBUG=1 python3 setup-specify-idea.py --json
    ZO_DEBUG=1 python3 setup-specify-idea.py path/to/brainstorm.md
"""

import argparse
import json
import logging
import os
import sys
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

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from python.common import (
    get_repo_root,
    get_feature_dir,
    validate_execution_environment,
)


def find_brainstorm_file(repo_root: str, feature_dir: str, user_path: str = None) -> Path:
    """
    Find the brainstorm file from various possible locations.
    
    Args:
        repo_root: Repository root directory
        feature_dir: Current feature directory
        user_path: Optional user-provided path
        
    Returns:
        Path to the brainstorm file
        
    Raises:
        FileNotFoundError: If no brainstorm file is found
    """
    if user_path:
        # User provided a path - check if it exists
        user_path_obj = Path(user_path)
        if not user_path_obj.is_absolute():
            # Relative path - resolve from current working directory
            user_path_obj = Path.cwd() / user_path_obj
        
        if user_path_obj.exists() and user_path_obj.is_file():
            return user_path_obj.resolve()
        else:
            raise FileNotFoundError(f"File '{user_path}' not found")
    
    # Auto-detect latest brainstorm file
    
    # Primary Location: .zo/brainstorms
    primary_dir = Path(repo_root) / '.zo' / 'brainstorms'
    if primary_dir.exists():
        # Find all .md files and sort by modification time (most recent first)
        md_files = list(primary_dir.glob('*.md'))
        if md_files:
            latest_file = max(md_files, key=lambda p: p.stat().st_mtime)
            return latest_file
    
    # Legacy location 1: FEATURE_DIR/brainstorms
    legacy_dir_1 = Path(feature_dir) / 'brainstorms'
    if legacy_dir_1.exists():
        md_files = list(legacy_dir_1.glob('brainstorm-*.md'))
        if md_files:
            latest_file = max(md_files, key=lambda p: p.stat().st_mtime)
            return latest_file
    
    # Legacy location 2: docs/brainstorms
    legacy_dir_2 = Path(repo_root) / 'docs' / 'brainstorms'
    if legacy_dir_2.exists():
        md_files = list(legacy_dir_2.glob('brainstorm-*.md'))
        if md_files:
            latest_file = max(md_files, key=lambda p: p.stat().st_mtime)
            return latest_file
    
    raise FileNotFoundError(
        "No brainstorm file found. Run 'zo.brainstorm' first."
    )


def main():
    """Main entry point."""
    # Validate execution environment
    if not validate_execution_environment():
        logger.error("Execution environment validation failed.")
        print("ERROR: Execution environment validation failed.", file=sys.stderr)
        return 1
    
    parser = argparse.ArgumentParser(
        description='Find brainstorm file and spec template for spec creation',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )
    parser.add_argument(
        'brainstorm_file',
        nargs='?',
        help='Optional path to brainstorm file (absolute or relative)'
    )
    
    args = parser.parse_args()
    
    try:
        # Get repository paths
        repo_root = get_repo_root()
        current_branch = Path(get_feature_dir(repo_root, get_repo_root())).name
        feature_dir = get_feature_dir(repo_root, current_branch)
        
        # Find brainstorm file
        brainstorm_file = find_brainstorm_file(
            repo_root,
            feature_dir,
            args.brainstorm_file
        )
        
        # Define other paths
        spec_template = Path(repo_root) / '.zo' / 'templates' / 'spec-from-idea.md'
        design_file = Path(feature_dir) / 'design.md'
        
        # Output results - use compact JSON to match bash
        if args.json:
            result = {
                'BRAINSTORM_FILE': str(brainstorm_file),
                'SPEC_TEMPLATE': str(spec_template),
                'DESIGN_FILE': str(design_file)
            }
            print(json.dumps(result, separators=(',', ':')))
        else:
            print(f"BRAINSTORM_FILE: {brainstorm_file}")
            print(f"SPEC_TEMPLATE: {spec_template}")
            print(f"DESIGN_FILE: {design_file}")
        
        return 0
        
    except FileNotFoundError as e:
        logger.error(str(e))
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        logger.error(str(e))
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
