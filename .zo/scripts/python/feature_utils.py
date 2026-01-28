#!/usr/bin/env python3
"""
Feature creation utility functions.

This module provides shared utility functions for creating new features,
including branch number detection, branch name generation, and validation.

Functions:
    find_repo_root() - Find repository root by searching for .git or .zo
    get_highest_from_specs() - Get highest numbered spec directory
    get_highest_from_branches() - Get highest numbered git branch
    check_existing_branches() - Get next available feature number
    clean_branch_name() - Clean and format a branch name
    generate_branch_name() - Generate branch name from description
    truncate_branch_name() - Truncate branch name to GitHub limit
"""

import logging
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)

# Stop words to filter out when generating branch names
STOP_WORDS = re.compile(
    r'^(i|a|an|the|to|for|of|in|on|at|by|with|from|is|are|was|were|be|been|'
    r'being|have|has|had|do|does|did|will|would|should|could|can|may|might|'
    r'must|shall|this|that|these|those|my|your|our|their|want|need|add|get|set)$',
    re.IGNORECASE
)

# GitHub branch name limit (bytes)
MAX_BRANCH_LENGTH = 244


def run_git_command(args: list, cwd: Optional[str] = None) -> Optional[str]:
    """
    Run a git command and return output.

    Args:
        args: List of git command arguments
        cwd: Working directory for command (defaults to current dir)

    Returns:
        Command output as string, or None if command fails
    """
    # Validate and normalize cwd before passing to subprocess
    if cwd is not None:
        # Ensure cwd is an absolute path with proper format
        if not os.path.isabs(cwd) and not cwd.startswith('.'):
            # If cwd looks like a relative path without './' prefix, skip it
            cwd = None
        elif not os.path.exists(cwd):
            # If cwd doesn't exist, skip it
            cwd = None

    try:
        result = subprocess.run(
            ['git'] + args,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=cwd
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None


def has_git(repo_root: Optional[str] = None) -> bool:
    """
    Check if git is available and this is a git repository.

    Args:
        repo_root: Repository root directory (optional, uses cwd if not provided)

    Returns:
        True if git is available, False otherwise
    """
    return run_git_command(['rev-parse', '--show-toplevel'], cwd=repo_root) is not None


def find_repo_root(start_dir: Optional[str] = None) -> Optional[str]:
    """
    Find the repository root by searching for .git or .zo directories.

    Walks up the directory tree from the starting directory until it finds
    a .git or .zo directory, or reaches the root.

    Args:
        start_dir: Directory to start searching from (defaults to current dir)

    Returns:
        Path to repository root, or None if not found
    """
    if start_dir is None:
        # Use abspath to ensure we get a valid absolute path
        start_dir = os.path.abspath(os.getcwd())

    current = Path(start_dir).resolve(strict=True)

    while current != current.parent:  # Not at root
        if (current / '.git').exists() or (current / '.zo').exists():
            return str(current)
        current = current.parent

    return None


def get_repo_root() -> str:
    """
    Get repository root, with fallback for non-git repositories.

    Returns:
        Path to repository root directory

    Raises:
        SystemExit: If repository root cannot be determined
    """
    # Find repo root by walking up from script location (matches bash behavior)
    script_dir = Path(__file__).parent.resolve()
    repo_root = find_repo_root(str(script_dir))
    
    if repo_root:
        return repo_root
    
    logger.error("Could not determine repository root. Please run this script from within the repository.")
    sys.exit(1)


def get_highest_from_specs(specs_dir: str) -> int:
    """
    Get the highest number from spec directories.

    Scans the specs directory for directories matching the pattern ###-*,
    extracts the numeric prefix, and returns the highest number found.

    Args:
        specs_dir: Path to specs directory

    Returns:
        Highest spec number found (0 if none)
    """
    highest = 0
    specs_path = Path(specs_dir)

    if not specs_path.exists():
        return highest

    try:
        for entry in specs_path.iterdir():
            if entry.is_dir():
                dirname = entry.name
                # Extract leading digits (force base-10 to avoid octal)
                match = re.match(r'^0*(\d+)', dirname)
                if match:
                    # Use int() to force decimal interpretation
                    number = int(match.group(1))
                    if number > highest:
                        highest = number
    except OSError as e:
        logger.warning(f"Error reading specs directory: {e}")

    return highest


def get_highest_from_branches() -> int:
    """
    Get the highest number from git branches.

    Lists all local and remote branches, extracts the numeric prefix
    from branches matching ###-*, and returns the highest number.

    Returns:
        Highest branch number found (0 if none)
    """
    highest = 0

    # Get all branches (local and remote)
    branches_output = run_git_command(['branch', '-a'])

    if not branches_output:
        return highest

    for line in branches_output.split('\n'):
        # Clean branch name: remove leading markers and remote prefixes
        clean_branch = line.strip()
        clean_branch = re.sub(r'^[\* ]+', '', clean_branch)
        clean_branch = re.sub(r'^remotes/[^/]+/', '', clean_branch)

        # Extract feature number if branch matches pattern ###-*
        if re.match(r'^\d{3}-', clean_branch):
            match = re.match(r'^0*(\d+)', clean_branch)
            if match:
                number = int(match.group(1))  # Force decimal interpretation
                if number > highest:
                    highest = number

    return highest


def check_existing_branches(specs_dir: str) -> int:
    """
    Check existing branches and specs to return next available number.

    Fetches all remotes, then checks both git branches and spec directories
    to find the highest numbered feature, and returns the next available number.

    Args:
        specs_dir: Path to specs directory (can be relative or absolute)

    Returns:
        Next available feature number
    """
    # Fetch all remotes to get latest branch info (suppress errors)
    run_git_command(['fetch', '--all', '--prune'])

    # Get highest number from all branches
    highest_branch = get_highest_from_branches()

    # Get highest number from all specs (resolve to absolute path if relative)
    specs_path = Path(specs_dir)
    if not specs_path.is_absolute():
        # Resolve relative path against current working directory
        specs_path = Path.cwd() / specs_dir
    highest_spec = get_highest_from_specs(str(specs_path))

    # Take the maximum of both
    max_num = max(highest_branch, highest_spec)

    # Return next number
    return max_num + 1


def clean_branch_name(name: str) -> str:
    """
    Clean and format a branch name.

    Converts to lowercase, replaces EACH non-alphanumeric character with a hyphen,
    and trims leading/trailing hyphens.

    Matches bash behavior: sed 's/[^a-z0-9]/-/g' replaces each char with '-'

    Args:
        name: Raw branch name

    Returns:
        Cleaned branch name
    """
    # Convert to lowercase
    name = name.lower()

    # Replace EACH non-alphanumeric character with a hyphen (matches bash)
    name = ''.join('-' if not c.isalnum() else c for c in name)

    # Trim leading/trailing hyphens
    name = name.strip('-')

    return name


def generate_branch_name(description: str) -> str:
    """
    Generate a branch name from a description.

    Filters out stop words and short words (unless they're acronyms),
    then uses the first 3-4 meaningful words to create the branch name.

    Args:
        description: Feature description

    Returns:
        Generated branch name suffix
    """
    # Convert to lowercase and split into words
    clean_name = description.lower()
    clean_name = re.sub(r'[^a-z0-9]+', ' ', clean_name)
    words = clean_name.split()

    # Filter words: remove stop words and short words (unless acronyms)
    meaningful_words = []
    for word in words:
        if not word:
            continue

        # Check if word is a stop word
        if STOP_WORDS.match(word):
            continue

        # Keep words >= 3 chars, or short words that appear as uppercase in original
        if len(word) >= 3:
            meaningful_words.append(word)
        else:
            # Check if it appears as uppercase in original (likely acronym)
            if re.search(r'\b' + re.escape(word) + r'\b', description, re.IGNORECASE):
                # Check if the original version was all uppercase
                for orig_word in description.split():
                    if orig_word.lower() == word and orig_word.isupper() and len(orig_word) <= 3:
                        meaningful_words.append(word)
                        break

    # If we have meaningful words, use first 3-4 of them
    if meaningful_words:
        # Use 3 words, or 4 if exactly 4 available
        max_words = 3
        if len(meaningful_words) == 4:
            max_words = 4

        result = '-'.join(meaningful_words[:max_words])
        return result
    else:
        # Fallback: use cleaned description, take first 3 words
        cleaned = clean_branch_name(description)
        parts = [p for p in cleaned.split('-') if p]
        return '-'.join(parts[:3])


def truncate_branch_name(branch_name: str) -> str:
    """
    Truncate branch name if it exceeds GitHub's 244-byte limit.

    Args:
        branch_name: Full branch name

    Returns:
        Truncated branch name if needed, original otherwise
    """
    # Check byte length (not character length)
    byte_length = len(branch_name.encode('utf-8'))

    if byte_length <= MAX_BRANCH_LENGTH:
        return branch_name

    # Need to truncate
    # Account for: feature number (3) + hyphen (1) = 4 bytes/chars
    # But we need to be careful about UTF-8 multi-byte characters
    prefix = branch_name.split('-')[0] + '-'  # e.g., "001-"
    prefix_bytes = len(prefix.encode('utf-8'))

    max_suffix_bytes = MAX_BRANCH_LENGTH - prefix_bytes
    suffix = '-'.join(branch_name.split('-')[1:])

    # Truncate suffix byte by byte
    truncated_suffix = suffix.encode('utf-8')[:max_suffix_bytes].decode('utf-8', errors='ignore')

    # Remove trailing hyphen if truncation created one
    truncated_suffix = truncated_suffix.rstrip('-')

    new_branch_name = prefix + truncated_suffix

    # Log warning
    logger.warning(f"Branch name exceeded GitHub's 244-byte limit")
    logger.warning(f"Original: {branch_name} ({byte_length} bytes)")
    logger.warning(f"Truncated to: {new_branch_name} ({len(new_branch_name.encode('utf-8'))} bytes)")

    return new_branch_name


def create_git_branch(branch_name: str, repo_root: str) -> bool:
    """
    Create a new git branch.

    Args:
        branch_name: Name of branch to create
        repo_root: Repository root directory

    Returns:
        True if successful, False otherwise
    """
    if not has_git():
        logger.warning(f"Git repository not detected; skipped branch creation for {branch_name}")
        return False

    result = run_git_command(['checkout', '-b', branch_name], cwd=repo_root)
    return result is not None
