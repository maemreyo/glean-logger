#!/usr/bin/env python3
"""
setup-brainstorm.py
Initialize a brainstorm session in .zo/brainstorms/ directory.

Usage:
    ./setup-brainstorm.py [--json] [brainstorm topic]

Options:
    --json    Output results in JSON format
    --help    Show this help message

Examples:
    ./setup-brainstorm.py "improve login flow"
    ./setup-brainstorm.py --json "add dark mode"

Output:
    JSON object with:
    - OUTPUT_FILE: Path to the brainstorm file created
    - BRAINSTORM_DIR: Path to the brainstorms directory
    - TOPIC: The topic slug used for the file
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import common module
script_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(script_dir))

from common import get_repo_root

# Configure logging with debug mode support
if os.environ.get('DEBUG') or os.environ.get('ZO_DEBUG'):
    logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')
else:
    logging.basicConfig(
        level=logging.INFO,
        format='%(levelname)s: %(message)s'
    )
logger = logging.getLogger(__name__)


def slugify(text: str) -> str:
    """
    Convert text to a slug-safe filename.
    
    Matches bash behavior on macOS where sed 's/-\+/-/g' doesn't work
    as expected (BSD sed doesn't support \+ properly).
    
    Bash: echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//' | sed 's/-$//'
    macOS produces: test-feature---------- (no collapse)
    
    Args:
        text: Text to slugify
        
    Returns:
        Slugified string
    """
    # Convert to lowercase
    text = text.lower()
    # Replace non-alphanumeric characters with hyphens (EACH char becomes a hyphen)
    # This matches bash behavior: sed 's/[^a-z0-9]/-/g' replaces each char with '-'
    text = ''.join('-' if not c.isalnum() else c for c in text)
    # Remove leading/trailing hyphens
    text = text.strip('-')
    return text


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Initialize a brainstorm session in .zo/brainstorms/ directory',
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
    
    parser.add_argument(
        'topic',
        nargs='?',
        default='',
        help='Brainstorm topic (optional)'
    )
    
    # Parse known args to handle unknown options gracefully (like bash)
    args, unknown = parser.parse_known_args()
    
    # If there are unknown args, bash treats them as positional arguments
    # and continues (adds them to the topic). We'll do the same.
    if unknown:
        # Append unknown args to topic (separated by spaces like bash would)
        if args.topic:
            args.topic = args.topic + ' ' + ' '.join(unknown)
        else:
            args.topic = ' '.join(unknown)
    
    return args


def main():
    """Main entry point."""
    logger.debug("Starting setup-brainstorm")
    
    args = parse_args()
    
    # Handle help
    if args.help:
        # Match bash help output exactly - bash uses $0 which expands to the script path
        script_name = sys.argv[0]
        logger.info(f"Usage: {script_name} [--json] [brainstorm topic]")
        logger.info("  --json    Output results in JSON format")
        logger.info("  --help    Show this help message")
        sys.exit(0)
    
    # Get repository root
    repo_root = get_repo_root()
    
    # Determine output directory
    brainstorm_dir = os.path.join(repo_root, '.zo', 'brainstorms')
    os.makedirs(brainstorm_dir, exist_ok=True)
    
    # Generate filename
    date_str = datetime.now().strftime('%Y-%m-%d-%H%M')
    topic_input = args.topic
    
    if topic_input:
        # Slugify the input topic
        topic_slug = slugify(topic_input)
        # Create filename with date for uniqueness
        filename = f"{topic_slug}-{date_str}.md"
        name_tag = topic_slug
    else:
        # Fallback if no topic provided
        filename = f"brainstorm-session-{date_str}.md"
        name_tag = "General Session"
    
    output_file = os.path.join(brainstorm_dir, filename)
    
    # Use template if available
    template_path = os.path.join(repo_root, '.zo', 'templates', 'brainstorm-template.md')
    
    if os.path.isfile(template_path):
        # Read template
        with open(template_path, 'r') as f:
            content = f.read()
        
        # Replace placeholders
        content = content.replace('{{DATE}}', date_str)
        content = content.replace('{{FEATURE}}', name_tag)
        
        # Write output file
        with open(output_file, 'w') as f:
            f.write(content)
    else:
        # Fallback to empty file if template missing
        Path(output_file).touch()
    
    # Output results
    if args.json:
        result = {
            'OUTPUT_FILE': output_file,
            'BRAINSTORM_DIR': brainstorm_dir,
            'TOPIC': name_tag
        }
        # Use compact JSON to match bash output
        print(json.dumps(result, separators=(',', ':')))
    else:
        print(f"OUTPUT_FILE: {output_file}")
    
    logger.debug("setup-brainstorm completed successfully")


if __name__ == '__main__':
    main()
