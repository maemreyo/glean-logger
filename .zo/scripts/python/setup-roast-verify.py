#!/usr/bin/env python3
"""
setup-roast-verify.py
Verify and locate the latest roast report for a feature.

Usage:
    ./setup-roast-verify.py [--json] [--report=path/to/report.md] [feature_dir]

Options:
    --json              Output results in JSON format
    --report            Specify a specific roast report file (absolute or relative path)
    feature_dir         Optional feature directory path (defaults to current branch)
    --help, -h          Show this help message

Output:
    JSON object with:
    - REPORT_FILE: Path to roast report
    - TASKS: Path to tasks file
    - BRANCH: Current git branch

The script finds the latest roast report matching pattern: roast-report-FEATURE_NAME-*.md
If --report is specified, it uses that exact report file instead of searching.
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

from common import get_feature_paths, validate_execution_environment

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)


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
        print(f"Using specified feature directory: {feature_dir}")
        return feature_dir, feature_name
    
    # Try as relative path from current directory
    if feature_path.is_dir():
        feature_dir = str(feature_path.resolve())
        feature_name = feature_path.name
        print(f"Using specified feature directory: {feature_dir}")
        return feature_dir, feature_name
    
    # Try as relative path from repo root
    repo_relative = Path(repo_root) / feature_arg
    if repo_relative.is_dir():
        feature_dir = str(repo_relative.resolve())
        feature_name = repo_relative.name
        print(f"Using specified feature directory: {feature_dir}")
        return feature_dir, feature_name
    
    print(f"Error: Directory '{feature_arg}' not found.", file=sys.stderr)
    sys.exit(1)


def find_latest_roast_report(roasts_dir: str, feature_name: str) -> str:
    """
    Find the latest roast report for a feature.
    
    Args:
        roasts_dir: Path to roasts directory
        feature_name: Feature name to search for
        
    Returns:
        Path to latest roast report
        
    Raises:
        SystemExit if no report found
    """
    roasts_path = Path(roasts_dir)
    
    if not roasts_path.exists():
        print(f"Error: No roast report found for feature {feature_name} in {roasts_dir}", file=sys.stderr)
        sys.exit(1)
    
    # Pattern: roast-report-FEATURE_NAME-*.md
    pattern = f"roast-report-{feature_name}-*.md"
    
    # Find all matching files
    matching_files = sorted(roasts_path.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    
    if not matching_files:
        print(f"Error: No roast report found for feature {feature_name} in {roasts_dir}", file=sys.stderr)
        sys.exit(1)
    
    # Return the most recently modified file
    return str(matching_files[0])


def resolve_report_path(report_arg: str, repo_root: str) -> str:
    """
    Resolve report path from --report argument.
    
    Args:
        report_arg: Report path argument (absolute or relative)
        repo_root: Repository root path
        
    Returns:
        Resolved absolute path to report file
        
    Raises:
        SystemExit if report not found
    """
    report_path = Path(report_arg)
    
    # Try as absolute path first
    if report_path.is_absolute() and report_path.is_file():
        return str(report_path)
    
    # Try as relative path from current directory
    if report_path.is_file():
        return str(report_path.resolve())
    
    # Try as relative path from repo root
    repo_relative = Path(repo_root) / report_arg
    if repo_relative.is_file():
        return str(repo_relative.resolve())
    
    print(f"Error: Specified report file not found: {report_arg}", file=sys.stderr)
    sys.exit(1)


def main():
    """Main entry point."""
    # Validate execution environment
    if not validate_execution_environment():
        print("ERROR: Execution environment validation failed.", file=sys.stderr)
        sys.exit(1)
    
    parser = argparse.ArgumentParser(
        description='Verify and locate the latest roast report for a feature',
        add_help=False
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output results in JSON format'
    )
    
    parser.add_argument(
        '--report',
        help='Specify a specific roast report file'
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
    
    args = parser.parse_args()
    
    # Handle help
    if args.help:
        print(__doc__)
        sys.exit(0)
    
    # Get all feature paths from common module
    paths = get_feature_paths()
    repo_root = paths['REPO_ROOT']
    current_branch = paths['CURRENT_BRANCH']
    
    # Determine feature directory and name
    if args.feature_dir:
        feature_dir, feature_name = resolve_feature_dir(args.feature_dir, repo_root)
        
        # Override derived paths
        tasks = os.path.join(feature_dir, 'tasks.md')
    else:
        feature_name = current_branch
        feature_dir = paths['FEATURE_DIR']
        tasks = paths['TASKS']
    
    # Determine report file
    roasts_dir = os.path.join(feature_dir, 'roasts')
    
    if args.report:
        # Use specified report file
        report_file = resolve_report_path(args.report, repo_root)
    else:
        # Find the latest roast report for the current branch/feature
        # Assumes format: roast-report-[name]-YYYY-MM-DD-HHMM.md
        report_file = find_latest_roast_report(roasts_dir, feature_name)
    
    # Output results - use compact JSON to match bash
    if args.json:
        result = {
            'REPORT_FILE': report_file,
            'TASKS': tasks,
            'BRANCH': current_branch
        }
        print(json.dumps(result, separators=(',', ':')))
    else:
        print(f"REPORT_FILE: {report_file}")
        print(f"TASKS: {tasks}")
        print(f"BRANCH: {current_branch}")


if __name__ == '__main__':
    main()
