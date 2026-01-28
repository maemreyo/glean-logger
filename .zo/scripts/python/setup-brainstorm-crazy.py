#!/usr/bin/env python3
"""
setup-brainstorm-crazy.py
Initialize context for a "crazy" brainstorm session with enhanced template support.
Uses brainstorm-template-crazy.md for output formatting.

Usage:
    ./setup-brainstorm-crazy.py [OPTIONS] "brainstorm request"

Options:
    --json       Output JSON (default)
    --help       Show usage
    --dry-run    Show what would be found without creating files
    -v, --verbose  Verbose output

Examples:
    ./setup-brainstorm-crazy.py "improve login flow"
    ./setup-brainstorm-crazy.py -v "add offline support"
    ./setup-brainstorm-crazy.py --dry-run "story creator"

Output:
    JSON object with paths and information for the brainstorm session:
    - OUTPUT_FILE: Path to the brainstorm output file
    - FEATURE_SPEC: Path to the feature specification document
    - IMPL_PLAN: Path to the implementation plan document
    - TASKS: Path to the tasks document
    - RESEARCH_FOCUS: Extracted keywords from user input
    - SPEC_DIR: Path to the specification directory
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

# Configure logging with debug mode support
DEBUG = os.getenv('DEBUG', '').lower() in ('1', 'true', 'yes')
ZO_DEBUG = os.getenv('ZO_DEBUG', '').lower() in ('1', 'true', 'yes')
VERBOSE = DEBUG or ZO_DEBUG

logging.basicConfig(
    level=logging.DEBUG if VERBOSE else logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Add parent directory to path to import common module
script_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(script_dir))

from common import get_repo_root, check_file_exists, validate_execution_environment


# Common words to remove when extracting research focus
COMMON_WORDS = set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'at',
    'of', 'for', 'to', 'in', 'on', 'with', 'by', 'from', 'as', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
    'did', 'will', 'would', 'could', 'should', 'might', 'must', 'may', 'might',
    'about', 'above', 'after', 'again', 'against', 'all', 'also', 'any',
    'around', 'as', 'at', 'because', 'been', 'before', 'being', 'below',
    'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
    'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself',
    'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
    'its', 'itself', 'just', 'like', 'me', 'more', 'most', 'my', 'myself',
    'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or',
    'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'she', 'should', 'since', 'so', 'some', 'such', 'than', 'that',
    'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
    'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while',
    'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself',
    'yourselves'
])


def extract_research_focus(input_text: str) -> str:
    """
    Extract research focus from user input by removing common words.
    
    Matches bash behavior:
    input=$(echo "$input" | tr '[:upper:]' '[:lower:]')
    for word in $COMMON_WORDS; do input=$(echo "$input" | sed "s/\\b${word}\\b//g"); done
    focus=$(echo "$input" | tr -s '[:space:]' ' ' | tr ' ' '-' | tr -d '.,!?:;()[]{}' | sed 's/-\+/-/g' | sed 's/^-\+//;s/-\+$//')
    
    Args:
        input_text: User input text
        
    Returns:
        Extracted research focus as hyphenated keywords
    """
    # Convert to lowercase
    input_text = input_text.lower()
    
    # Remove common words using word boundaries
    for word in COMMON_WORDS:
        input_text = re.sub(rf'\b{word}\b', '', input_text)
    
    # Normalize whitespace (tr -s '[:space:]' ' ')
    focus = re.sub(r'\s+', ' ', input_text)
    focus = focus.strip()
    # Remove punctuation (tr -d '.,!?:;()[]{}')
    focus = re.sub(r'[.,!?:;()\[\]{}]', '', focus)
    # Convert spaces to hyphens (tr ' ' '-')
    focus = focus.replace(' ', '-')
    # Remove duplicate hyphens (sed 's/-\+/-/g')
    focus = re.sub(r'-+', '-', focus)
    # Remove leading/trailing hyphens (sed 's/^-\+//;s/-\+$//')
    focus = focus.strip('-')
    
    return focus


def find_spec_folder(focus: str, specs_dir: str) -> Optional[str]:
    """
    Find matching spec folder based on research focus keywords.
    
    Args:
        focus: Research focus (hyphenated keywords)
        specs_dir: Path to specs directory
        
    Returns:
        Best matching folder name, or None if no match found
    """
    if not os.path.isdir(specs_dir):
        logger.debug(f"Specs directory not found: {specs_dir}")
        return None
    
    # Get list of spec folders, sorted in reverse (newest first)
    try:
        folders = sorted(
            [d.name for d in os.scandir(specs_dir) if d.is_dir()],
            reverse=True
        )
    except OSError:
        logger.debug(f"Error reading specs directory: {specs_dir}")
        return None
    
    best_match = None
    best_score = 0
    
    # Split focus into keywords
    keywords = focus.split('-')
    
    for folder in folders:
        folder_name = folder.lower()
        score = 0
        
        # Score based on keyword matches
        for keyword in keywords:
            if keyword and keyword in folder_name:
                score += 1
        
        # Bonus for numbered folders (higher number = more recent)
        match = re.match(r'^(\d+)-', folder)
        if match:
            num = int(match.group(1))
            # Add score based on recency (normalized)
            score = score * 100 + num
        
        if score > best_score:
            best_score = score
            best_match = folder
    
    return best_match


def find_related_files(spec_dir: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Find related files (spec.md, plan.md, tasks.md) in spec directory.
    
    Args:
        spec_dir: Path to spec directory
        
    Returns:
        Tuple of (feature_spec_path, impl_plan_path, tasks_path)
    """
    feature_spec = None
    impl_plan = None
    tasks = None
    
    # Check for spec.md
    if check_file_exists(os.path.join(spec_dir, 'spec.md')):
        feature_spec = os.path.join(spec_dir, 'spec.md')
    elif check_file_exists(os.path.join(spec_dir, 'SPEC.md')):
        feature_spec = os.path.join(spec_dir, 'SPEC.md')
    
    # Check for plan.md
    if check_file_exists(os.path.join(spec_dir, 'plan.md')):
        impl_plan = os.path.join(spec_dir, 'plan.md')
    elif check_file_exists(os.path.join(spec_dir, 'PLAN.md')):
        impl_plan = os.path.join(spec_dir, 'PLAN.md')
    
    # Check for tasks.md
    if check_file_exists(os.path.join(spec_dir, 'tasks.md')):
        tasks = os.path.join(spec_dir, 'tasks.md')
    elif check_file_exists(os.path.join(spec_dir, 'TASKS.md')):
        tasks = os.path.join(spec_dir, 'TASKS.md')
    
    logger.debug(f"Feature spec: {feature_spec or 'none'}")
    logger.debug(f"Implementation plan: {impl_plan or 'none'}")
    logger.debug(f"Tasks: {tasks or 'none'}")
    
    return feature_spec, impl_plan, tasks


def generate_json(
    output_file: str,
    feature_spec: Optional[str],
    impl_plan: Optional[str],
    tasks: Optional[str],
    research_focus: str,
    spec_dir: Optional[str]
) -> str:
    """
    Generate JSON output.
    
    Args:
        output_file: Path to output file
        feature_spec: Path to feature spec (or None)
        impl_plan: Path to implementation plan (or None)
        tasks: Path to tasks file (or None)
        research_focus: Research focus keywords
        spec_dir: Path to spec directory (or None)
        
    Returns:
        JSON string
    """
    result = {
        'OUTPUT_FILE': output_file,
        'FEATURE_SPEC': feature_spec,
        'IMPL_PLAN': impl_plan,
        'TASKS': tasks,
        'RESEARCH_FOCUS': research_focus,
        'SPEC_DIR': spec_dir or ''
    }
    return json.dumps(result, separators=(',', ':'))


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Initialize context for a "crazy" brainstorm session',
        add_help=False  # We'll handle --help manually
    )
    
    parser.add_argument(
        '--json',
        action='store_true',
        default=True,  # JSON is default in bash script
        help='Output JSON (default behavior)'
    )
    
    parser.add_argument(
        '--help',
        '-h',
        action='store_true',
        help='Show this help message'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be found without creating files'
    )
    
    parser.add_argument(
        '-v',
        '--verbose',
        action='store_true',
        help='Verbose output'
    )
    
    parser.add_argument(
        'request',
        nargs='?',
        help='Brainstorm request text'
    )
    
    # Parse known args to handle unknown options gracefully (like bash)
    args, unknown = parser.parse_known_args()
    
    # If there are unknown args starting with -, bash exits with code 1
    for arg in unknown:
        if arg.startswith('-'):
            logger.error(f"Unknown option: {arg}")
            sys.exit(1)
    
    return args


def main():
    """Main entry point."""
    args = parse_args()
    
    # Handle help
    if args.help:
        print(__doc__)
        sys.exit(0)
    
    # Validate execution environment
    if not validate_execution_environment():
        logger.error("Execution environment validation failed")
        sys.exit(1)
    
    # Get paths
    repo_root = get_repo_root()
    specs_dir = os.path.join(repo_root, 'specs')
    brainstorms_dir = os.path.join(repo_root, '.zo', 'brainstorms')
    templates_dir = os.path.join(repo_root, '.zo', 'templates')
    
    # Validate arguments
    if not args.request:
        logger.error("No brainstorm request provided. Use --help for usage.")
        sys.exit(1)
    
    logger.debug(f"Input: {args.request}")
    
    # Extract research focus
    research_focus = extract_research_focus(args.request)
    
    if not research_focus:
        logger.error("Could not extract research focus from input")
        sys.exit(1)
    
    logger.debug(f"Research focus: {research_focus}")
    
    # Find matching spec folder
    spec_folder = find_spec_folder(research_focus, specs_dir)
    
    spec_dir = None
    feature_spec = None
    impl_plan = None
    tasks = None
    
    if spec_folder:
        spec_dir = os.path.join(specs_dir, spec_folder)
        logger.debug(f"Found spec folder: {spec_folder}")
        feature_spec, impl_plan, tasks = find_related_files(spec_dir)
    else:
        logger.debug("No matching spec folder found")
    
    # Generate output file path
    date_str = datetime.now().strftime('%Y-%m-%d')
    output_file = os.path.join(brainstorms_dir, f"{research_focus}-{date_str}.md")
    
    # Create directory if needed (only if not dry-run)
    if not args.dry_run:
        os.makedirs(brainstorms_dir, exist_ok=True)
    else:
        logger.debug("Dry run - not creating directory")
    
    logger.debug(f"Output file: {output_file}")
    
    # Use template if available (only if not dry-run)
    template_path = os.path.join(templates_dir, 'brainstorm-template-crazy.md')
    
    if not args.dry_run and os.path.isfile(template_path):
        logger.debug(f"Using template: {template_path}")
        
        # Read template
        with open(template_path, 'r') as f:
            content = f.read()
        
        # Replace placeholders
        content = content.replace('{{DATE}}', date_str)
        content = content.replace('{{FEATURE}}', research_focus)
        
        # Write output file
        with open(output_file, 'w') as f:
            f.write(content)
    elif not args.dry_run:
        # Fallback to empty file if template missing
        Path(output_file).touch()
    
    # Output JSON
    if args.json:
        print(generate_json(
            output_file,
            feature_spec,
            impl_plan,
            tasks,
            research_focus,
            spec_dir
        ))


if __name__ == '__main__':
    main()
