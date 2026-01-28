#!/usr/bin/env python3
"""
Create a new feature from an idea description.

This script creates a new feature branch and spec file from a feature idea.
It auto-detects the next branch number from existing git branches and spec
directories, generates a branch name from the description using stop word
filtering, and creates the spec file from the spec-from-idea template.

Usage:
    ZO_DEBUG=1 python3 create-feature-from-idea.py [--json] [--short-name <name>] [--number N] <feature_description>

Options:
    --json              Output in JSON format
    --short-name <name> Provide a custom short name (2-4 words) for the branch
    --number N          Specify branch number manually (overrides auto-detection)
    --help, -h          Show this help message

Examples:
    ZO_DEBUG=1 python3 create-feature-from-idea.py 'Add user authentication system' --short-name 'user-auth'
    ZO_DEBUG=1 python3 create-feature-from-idea.py 'Implement OAuth2 integration for API' --number 5

Output:
    BRANCH_NAME: The created branch name (e.g., 001-user-auth)
    SPEC_FILE: Path to the created spec file
    FEATURE_NUM: The feature number (e.g., 001)
    SPECIFY_FEATURE environment variable is set to the branch name
"""

import argparse
import json
import logging
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import feature_utils
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

import feature_utils

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Create a new feature from an idea description.',
        add_help=False
    )

    parser.add_argument(
        '--json',
        action='store_true',
        help='Output in JSON format'
    )
    parser.add_argument(
        '--short-name',
        metavar='<name>',
        type=str,
        default='',
        help='Provide a custom short name (2-4 words) for the branch'
    )
    parser.add_argument(
        '--number',
        metavar='N',
        type=str,
        default='',
        help='Specify branch number manually (overrides auto-detection)'
    )
    parser.add_argument(
        '-h', '--help',
        action='store_true',
        help='Show this help message'
    )
    parser.add_argument(
        'feature_description',
        nargs='*',
        help='Feature description (positional argument)'
    )

    # Parse known args to handle unknown options gracefully (like bash)
    args, unknown = parser.parse_known_args()

    # If there are unknown args starting with -, bash exits with code 1
    for arg in unknown:
        if arg.startswith('-'):
            logger.error(f"Unknown option: {arg}")
            sys.exit(1)

    # Handle --help flag
    if args.help:
        script_name = os.path.basename(sys.argv[0])
        logger.info(f"Usage: {script_name} [--json] [--short-name <name>] [--number N] <feature_description>")
        logger.info("")
        logger.info("Options:")
        logger.info("  --json              Output in JSON format")
        logger.info("  --short-name <name> Provide a custom short name (2-4 words) for the branch")
        logger.info("  --number N          Specify branch number manually (overrides auto-detection)")
        logger.info("  --help, -h          Show this help message")
        logger.info("")
        logger.info("Examples:")
        logger.info(f"  {script_name} 'Add user authentication system' --short-name 'user-auth'")
        logger.info(f"  {script_name} 'Implement OAuth2 integration for API' --number 5")
        sys.exit(0)

    # Validate feature description
    if not args.feature_description:
        script_name = os.path.basename(sys.argv[0])
        logger.error(f"Usage: {script_name} [--json] [--short-name <name>] [--number N] <feature_description>")
        sys.exit(1)

    return args


def determine_branch_number(args_number: str, specs_dir: str, has_git_repo: bool) -> int:
    """
    Determine the branch number.

    Args:
        args_number: User-provided number (empty string if not provided)
        specs_dir: Path to specs directory
        has_git_repo: Whether git repository is available

    Returns:
        Branch number as integer
    """
    if args_number:
        # User provided a number - force decimal interpretation
        # Use int() instead of int(..., 10) to strip leading zeros properly
        return int(args_number)

    if has_git_repo:
        # Check existing branches on remotes
        return feature_utils.check_existing_branches(specs_dir)
    else:
        # Fall back to local directory check
        highest = feature_utils.get_highest_from_specs(specs_dir)
        return highest + 1


def main():
    """Main entry point."""
    logger.debug("Starting create-feature-from-idea")

    args = parse_arguments()

    # Join feature description words
    feature_description = ' '.join(args.feature_description)

    # Get repository root
    repo_root = feature_utils.get_repo_root()

    # Check if git is available
    has_git_repo = feature_utils.has_git()

    # Set up specs directory
    specs_dir = os.path.join(repo_root, 'specs')
    os.makedirs(specs_dir, exist_ok=True)

    # Generate branch name suffix
    if args.short_name:
        # Use provided short name, just clean it up
        branch_suffix = feature_utils.clean_branch_name(args.short_name)
    else:
        # Generate from description with smart filtering
        branch_suffix = feature_utils.generate_branch_name(feature_description)

    # Determine branch number
    branch_number = determine_branch_number(args.number, specs_dir, has_git_repo)

    # Format feature number as 3-digit with leading zeros
    # Use base-10 interpretation (int() handles this automatically)
    feature_num = f"{branch_number:03d}"

    # Build branch name
    branch_name = f"{feature_num}-{branch_suffix}"

    # Truncate if exceeds GitHub limit
    branch_name = feature_utils.truncate_branch_name(branch_name)

    # Create git branch if available
    if has_git_repo:
        feature_utils.create_git_branch(branch_name, repo_root)

    # Create feature directory
    feature_dir = os.path.join(specs_dir, branch_name)
    os.makedirs(feature_dir, exist_ok=True)

    # Copy template to spec file
    template_path = os.path.join(repo_root, '.zo', 'templates', 'spec-from-idea.md')
    spec_file = os.path.join(feature_dir, 'spec.md')

    if os.path.exists(template_path):
        shutil.copy(template_path, spec_file)
    else:
        # Create empty file if template doesn't exist
        Path(spec_file).touch()

    # Set SPECIFY_FEATURE environment variable
    os.putenv('SPECIFY_FEATURE', branch_name)

    # Output results - use compact JSON to match bash
    if args.json:
        output = {
            'BRANCH_NAME': branch_name,
            'SPEC_FILE': spec_file,
            'FEATURE_NUM': feature_num
        }
        print(json.dumps(output, separators=(',', ':')))
    else:
        print(f"BRANCH_NAME: {branch_name}")
        print(f"SPEC_FILE: {spec_file}")
        print(f"FEATURE_NUM: {feature_num}")
        print(f"SPECIFY_FEATURE environment variable set to: {branch_name}")

    logger.debug("create-feature-from-idea completed successfully")


if __name__ == '__main__':
    main()
