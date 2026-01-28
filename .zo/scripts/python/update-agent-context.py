#!/usr/bin/env python3
"""
Update agent context files with information from plan.md

This script maintains AI agent context files by parsing feature specifications 
and updating agent-specific configuration files with project information.

MAIN FUNCTIONS:
1. Environment Validation
   - Verifies git repository structure and branch information
   - Checks for required plan.md files and templates
   - Validates file permissions and accessibility

2. Plan Data Extraction
   - Parses plan.md files to extract project metadata
   - Identifies language/version, frameworks, databases, and project types
   - Handles missing or incomplete specification data gracefully

3. Agent File Management
   - Creates new agent context files from templates when needed
   - Updates existing agent files with new project information
   - Preserves manual additions and custom configurations
   - Supports multiple AI agent formats and directory structures

4. Content Generation
   - Generates language-specific build/test commands
   - Creates appropriate project directory structures
   - Updates technology stacks and recent changes sections
   - Maintains consistent formatting and timestamps

5. Multi-Agent Support
   - Handles agent-specific file paths and naming conventions
   - Supports: Claude, Gemini, Copilot, Cursor, Qwen, opencode, Codex, 
     Windsurf, Kilo Code, Auggie CLI, Roo Code, CodeBuddy CLI, Qoder CLI, 
     Amp, SHAI, or Amazon Q Developer CLI
   - Can update single agents or all existing agent files
   - Creates default Claude file if no agent files exist

Usage:
    python3 update-agent-context.py [agent_type]
    
Agent types:
    claude|gemini|copilot|cursor-agent|qwen|opencode|codex|windsurf|kilocode|auggie|codebuddy|shai|q|bob|qoder
    
Leave empty to update all existing agent files.
"""

import argparse
import logging
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from python.common import (
    get_repo_root, 
    get_current_branch, 
    get_feature_dir,
    get_workspace_path,
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


# =============================================================================
# Configuration and Global Variables
# =============================================================================

# Agent-specific file paths
AGENT_FILES = {
    'claude': 'CLAUDE.md',
    'gemini': 'GEMINI.md',
    'copilot': '.github/agents/copilot-instructions.md',
    'cursor-agent': '.cursor/rules/specify-rules.mdc',
    'qwen': 'QWEN.md',
    'opencode': 'AGENTS.md',
    'codex': 'AGENTS.md',
    'windsurf': '.windsurf/rules/specify-rules.md',
    'kilocode': '.kilocode/rules/specify-rules.md',
    'auggie': '.augment/rules/specify-rules.md',
    'roo': '.roo/rules/specify-rules.md',
    'codebuddy': 'CODEBUDDY.md',
    'qoder': 'QODER.md',
    'amp': 'AGENTS.md',
    'shai': 'SHAI.md',
    'q': 'AGENTS.md',
    'bob': 'AGENTS.md',
}

AGENT_NAMES = {
    'claude': 'Claude Code',
    'gemini': 'Gemini CLI',
    'copilot': 'GitHub Copilot',
    'cursor-agent': 'Cursor IDE',
    'qwen': 'Qwen Code',
    'opencode': 'opencode',
    'codex': 'Codex CLI',
    'windsurf': 'Windsurf',
    'kilocode': 'Kilo Code',
    'auggie': 'Auggie CLI',
    'roo': 'Roo Code',
    'codebuddy': 'CodeBuddy CLI',
    'qoder': 'Qoder CLI',
    'amp': 'Amp',
    'shai': 'SHAI',
    'q': 'Amazon Q Developer CLI',
    'bob': 'IBM Bob',
}

# Global variables for parsed plan data
NEW_LANG = ""
NEW_FRAMEWORK = ""
NEW_DB = ""
NEW_PROJECT_TYPE = ""


# =============================================================================
# Logging Functions
# =============================================================================

def log_info(message: str):
    """Log info message."""
    logger.info(message)


def log_success(message: str):
    """Log success message with checkmark."""
    logger.info(f"✓ {message}")


def log_error(message: str):
    """Log error message."""
    logger.error(message)


def log_warning(message: str):
    """Log warning message."""
    logger.warning(message)


# =============================================================================
# Validation Functions
# =============================================================================

def validate_environment(repo_root: str, current_branch: str, plan_file: str, template_file: str):
    """
    Validate environment before proceeding.
    
    Args:
        repo_root: Repository root path
        current_branch: Current branch name
        plan_file: Path to plan.md file
        template_file: Path to template file
        
    Raises:
        SystemExit: If validation fails
    """
    # Check if we have a current branch/feature
    if not current_branch or current_branch == 'main':
        log_error("Unable to determine current feature")
        log_info("Make sure you're on a feature branch")
        sys.exit(1)
    
    # Check if plan.md exists
    if not os.path.isfile(plan_file):
        log_error(f"No plan.md found at {plan_file}")
        log_info("Make sure you're working on a feature with a corresponding spec directory")
        sys.exit(1)
    
    # Check if template exists (needed for new files)
    if not os.path.isfile(template_file):
        log_warning(f"Template file not found at {template_file}")
        log_warning("Creating new agent files will fail")


# =============================================================================
# Plan Parsing Functions
# =============================================================================

def extract_plan_field(plan_file: str, field_pattern: str) -> str:
    """
    Extract a field value from plan.md.
    
    Args:
        plan_file: Path to plan.md file
        field_pattern: Field name to extract (e.g., "Language/Version")
        
    Returns:
        Extracted field value, or empty string if not found
    """
    try:
        with open(plan_file, 'r') as f:
            for line in f:
                # Match pattern: **Field**: value
                match = re.match(rf'^\*\*{re.escape(field_pattern)}\*\*:\s*(.+)$', line)
                if match:
                    value = match.group(1).strip()
                    # Filter out "NEEDS CLARIFICATION" and "N/A" values
                    if value != "NEEDS CLARIFICATION" and value != "N/A":
                        return value
        return ""
    except (IOError, OSError) as e:
        log_error(f"Error reading plan file: {e}")
        return ""


def parse_plan_data(plan_file: str):
    """
    Parse all fields from plan.md file.
    
    Args:
        plan_file: Path to plan.md file
        
    Raises:
        SystemExit: If plan file cannot be read
    """
    global NEW_LANG, NEW_FRAMEWORK, NEW_DB, NEW_PROJECT_TYPE
    
    if not os.path.isfile(plan_file):
        log_error(f"Plan file not found: {plan_file}")
        sys.exit(1)
    
    if not os.access(plan_file, os.R_OK):
        log_error(f"Plan file is not readable: {plan_file}")
        sys.exit(1)
    
    log_info(f"Parsing plan data from {plan_file}")
    
    NEW_LANG = extract_plan_field(plan_file, "Language/Version")
    NEW_FRAMEWORK = extract_plan_field(plan_file, "Primary Dependencies")
    NEW_DB = extract_plan_field(plan_file, "Storage")
    NEW_PROJECT_TYPE = extract_plan_field(plan_file, "Project Type")
    
    # Log what we found
    if NEW_LANG:
        log_info(f"Found language: {NEW_LANG}")
    else:
        log_warning("No language information found in plan")
    
    if NEW_FRAMEWORK:
        log_info(f"Found framework: {NEW_FRAMEWORK}")
    
    if NEW_DB and NEW_DB != "N/A":
        log_info(f"Found database: {NEW_DB}")
    
    if NEW_PROJECT_TYPE:
        log_info(f"Found project type: {NEW_PROJECT_TYPE}")


def format_technology_stack(lang: str, framework: str) -> str:
    """
    Format language and framework as a technology stack string.
    
    Args:
        lang: Language string
        framework: Framework string
        
    Returns:
        Formatted technology stack string
    """
    parts = []
    
    # Add non-empty parts
    if lang and lang != "NEEDS CLARIFICATION":
        parts.append(lang)
    if framework and framework != "NEEDS CLARIFICATION" and framework != "N/A":
        parts.append(framework)
    
    # Join with proper formatting
    if len(parts) == 0:
        return ""
    elif len(parts) == 1:
        return parts[0]
    else:
        # Join multiple parts with " + "
        return " + ".join(parts)


# =============================================================================
# Template and Content Generation Functions
# =============================================================================

def get_project_structure(project_type: str) -> str:
    """
    Get project directory structure based on project type.
    
    Args:
        project_type: Project type string
        
    Returns:
        Directory structure as string
    """
    if project_type and "web" in project_type.lower():
        return "backend/\nfrontend/\ntests/"
    else:
        return "src/\ntests/"


def get_commands_for_language(lang: str) -> str:
    """
    Get appropriate test/lint commands for a language.
    
    Args:
        lang: Language string
        
    Returns:
        Command string for testing and linting
    """
    if "Python" in lang:
        return "cd src && pytest && ruff check ."
    elif "Rust" in lang:
        return "cargo test && cargo clippy"
    elif "JavaScript" in lang or "TypeScript" in lang:
        return "npm test && npm run lint"
    else:
        return f"# Add commands for {lang}"


def get_language_conventions(lang: str) -> str:
    """
    Get language-specific code style conventions.
    
    Args:
        lang: Language string
        
    Returns:
        Code style string
    """
    return f"{lang}: Follow standard conventions"


def create_new_agent_file(target_file: str, temp_file: str, project_name: str, 
                          current_date: str, repo_root: str) -> bool:
    """
    Create a new agent file from template.
    
    Args:
        target_file: Path where the file will be created
        temp_file: Path to temporary file for writing
        project_name: Name of the project
        current_date: Current date in YYYY-MM-DD format
        repo_root: Repository root path
        
    Returns:
        True if successful, False otherwise
    """
    template_file = os.path.join(repo_root, '.zo', 'templates', 'agent-file-template.md')
    
    if not os.path.isfile(template_file):
        log_error(f"Template not found at {template_file}")
        return False
    
    if not os.access(template_file, os.R_OK):
        log_error(f"Template file is not readable: {template_file}")
        return False
    
    log_info("Creating new agent context file from template...")
    
    try:
        # Read template
        with open(template_file, 'r') as f:
            content = f.read()
        
        # Get values for substitution
        current_branch = get_current_branch()
        project_structure = get_project_structure(NEW_PROJECT_TYPE)
        commands = get_commands_for_language(NEW_LANG)
        language_conventions = get_language_conventions(NEW_LANG)
        
        # Build technology stack and recent change strings
        tech_stack = format_technology_stack(NEW_LANG, NEW_FRAMEWORK)
        
        if tech_stack:
            tech_stack_entry = f"- {tech_stack} ({current_branch})"
            recent_change_entry = f"- {current_branch}: Added {tech_stack}"
        elif NEW_LANG:
            tech_stack_entry = f"- {NEW_LANG} ({current_branch})"
            recent_change_entry = f"- {current_branch}: Added {NEW_LANG}"
        elif NEW_FRAMEWORK:
            tech_stack_entry = f"- {NEW_FRAMEWORK} ({current_branch})"
            recent_change_entry = f"- {current_branch}: Added {NEW_FRAMEWORK}"
        else:
            tech_stack_entry = f"- ({current_branch})"
            recent_change_entry = f"- {current_branch}: Added"
        
        # Perform substitutions
        content = content.replace('[PROJECT NAME]', project_name)
        content = content.replace('[DATE]', current_date)
        content = content.replace('[EXTRACTED FROM ALL PLAN.MD FILES]', tech_stack_entry)
        content = content.replace('[ACTUAL STRUCTURE FROM PLANS]', project_structure)
        content = content.replace('[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES]', commands)
        content = content.replace('[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE]', language_conventions)
        content = content.replace('[LAST 3 FEATURES AND WHAT THEY ADDED]', recent_change_entry)
        
        # Write to temp file
        with open(temp_file, 'w') as f:
            f.write(content)
        
        return True
        
    except (IOError, OSError) as e:
        log_error(f"Error creating agent file: {e}")
        return False


def update_existing_agent_file(target_file: str, current_date: str):
    """
    Update an existing agent file with new technology information.
    
    Args:
        target_file: Path to the agent file to update
        current_date: Current date in YYYY-MM-DD format
        
    Raises:
        SystemExit: If update fails
    """
    log_info("Updating existing agent context file...")
    
    current_branch = get_current_branch()
    
    # Use a single temporary file for atomic update
    try:
        fd, temp_file = tempfile.mkstemp(prefix='agent_update_')
        os.close(fd)
    except OSError as e:
        log_error("Failed to create temporary file")
        sys.exit(1)
    
    try:
        # Prepare new technology entries
        tech_stack = format_technology_stack(NEW_LANG, NEW_FRAMEWORK)
        new_tech_entries = []
        new_change_entry = ""
        
        # Prepare new technology entries
        if tech_stack:
            # Check if this tech stack is already in the file
            with open(target_file, 'r') as f:
                file_content = f.read()
            
            tech_entry = f"- {tech_stack} ({current_branch})"
            if tech_entry not in file_content:
                new_tech_entries.append(tech_entry)
        
        # Add database entry if applicable
        if NEW_DB and NEW_DB != "N/A" and NEW_DB != "NEEDS CLARIFICATION":
            db_entry = f"- {NEW_DB} ({current_branch})"
            with open(target_file, 'r') as f:
                file_content = f.read()
            if db_entry not in file_content:
                new_tech_entries.append(db_entry)
        
        # Prepare new change entry
        if tech_stack:
            new_change_entry = f"- {current_branch}: Added {tech_stack}"
        elif NEW_DB and NEW_DB != "N/A" and NEW_DB != "NEEDS CLARIFICATION":
            new_change_entry = f"- {current_branch}: Added {NEW_DB}"
        
        # Check if sections exist in the file
        has_active_technologies = False
        has_recent_changes = False
        
        with open(target_file, 'r') as f:
            content = f.read()
            if "## Active Technologies" in content:
                has_active_technologies = True
            if "## Recent Changes" in content:
                has_recent_changes = True
        
        # Process file line by line
        in_tech_section = False
        in_changes_section = False
        tech_entries_added = False
        changes_entries_added = False
        existing_changes_count = 0
        
        with open(target_file, 'r') as f_in:
            with open(temp_file, 'w') as f_out:
                for line in f_in:
                    # Handle Active Technologies section
                    if line.strip() == "## Active Technologies":
                        f_out.write(line)
                        in_tech_section = True
                        continue
                    elif in_tech_section and line.startswith("## "):
                        # Add new tech entries before closing the section
                        if not tech_entries_added and new_tech_entries:
                            for entry in new_tech_entries:
                                f_out.write(entry + '\n')
                            tech_entries_added = True
                        f_out.write(line)
                        in_tech_section = False
                        continue
                    elif in_tech_section and line.strip() == "":
                        # Add new tech entries before empty line in tech section
                        if not tech_entries_added and new_tech_entries:
                            for entry in new_tech_entries:
                                f_out.write(entry + '\n')
                            tech_entries_added = True
                        f_out.write(line)
                        continue
                    
                    # Handle Recent Changes section
                    if line.strip() == "## Recent Changes":
                        f_out.write(line)
                        # Add new change entry right after the heading
                        if new_change_entry:
                            f_out.write(new_change_entry + '\n')
                        in_changes_section = True
                        changes_entries_added = True
                        continue
                    elif in_changes_section and line.startswith("## "):
                        f_out.write(line)
                        in_changes_section = False
                        continue
                    elif in_changes_section and line.strip().startswith("- "):
                        # Keep only first 2 existing changes
                        if existing_changes_count < 2:
                            f_out.write(line)
                            existing_changes_count += 1
                        continue
                    
                    # Update timestamp
                    if re.search(r'\*\*Last updated\*\*.*\d{4}-\d{2}-\d{2}', line):
                        line = re.sub(r'\d{4}-\d{2}-\d{2}', current_date, line)
                    
                    f_out.write(line)
                
                # Post-loop check: if we're still in the Active Technologies section
                if in_tech_section and not tech_entries_added and new_tech_entries:
                    for entry in new_tech_entries:
                        f_out.write(entry + '\n')
                    tech_entries_added = True
        
        # If sections don't exist, add them at the end
        if not has_active_technologies and new_tech_entries:
            with open(temp_file, 'a') as f_out:
                f_out.write('\n## Active Technologies\n')
                for entry in new_tech_entries:
                    f_out.write(entry + '\n')
            tech_entries_added = True
        
        if not has_recent_changes and new_change_entry:
            with open(temp_file, 'a') as f_out:
                f_out.write('\n## Recent Changes\n')
                f_out.write(new_change_entry + '\n')
            changes_entries_added = True
        
        # Move temp file to target atomically
        shutil.move(temp_file, target_file)
        
    except (IOError, OSError) as e:
        log_error(f"Failed to update target file: {e}")
        # Clean up temp file
        if os.path.exists(temp_file):
            os.unlink(temp_file)
        sys.exit(1)


# =============================================================================
# Main Agent File Update Function
# =============================================================================

def update_agent_file(target_file: str, agent_name: str, repo_root: str):
    """
    Update or create an agent context file.
    
    Args:
        target_file: Path to the agent file
        agent_name: Display name of the agent
        repo_root: Repository root path
        
    Raises:
        SystemExit: If update fails
    """
    if not target_file or not agent_name:
        log_error("update_agent_file requires target_file and agent_name parameters")
        sys.exit(1)
    
    log_info(f"Updating {agent_name} context file: {target_file}")
    
    project_name = os.path.basename(repo_root)
    current_date = datetime.now().strftime('%Y-%m-%d')
    
    # Create directory if it doesn't exist
    target_dir = os.path.dirname(target_file)
    if target_dir and not os.path.isdir(target_dir):
        try:
            os.makedirs(target_dir, exist_ok=True)
        except OSError as e:
            log_error(f"Failed to create directory: {target_dir}")
            sys.exit(1)
    
    if not os.path.isfile(target_file):
        # Create new file from template
        fd, temp_file = tempfile.mkstemp(prefix='agent_update_')
        os.close(fd)
        
        try:
            if create_new_agent_file(target_file, temp_file, project_name, current_date, repo_root):
                shutil.move(temp_file, target_file)
                log_success(f"Created new {agent_name} context file")
            else:
                os.unlink(temp_file)
                log_error("Failed to create new agent file")
                sys.exit(1)
        except OSError as e:
            log_error(f"Failed to move temporary file to {target_file}: {e}")
            if os.path.exists(temp_file):
                os.unlink(temp_file)
            sys.exit(1)
    else:
        # Update existing file
        if not os.access(target_file, os.R_OK):
            log_error(f"Cannot read existing file: {target_file}")
            sys.exit(1)
        
        if not os.access(target_file, os.W_OK):
            log_error(f"Cannot write to existing file: {target_file}")
            sys.exit(1)
        
        try:
            update_existing_agent_file(target_file, current_date)
            log_success(f"Updated existing {agent_name} context file")
        except SystemExit:
            raise
        except Exception as e:
            log_error(f"Failed to update existing agent file: {e}")
            sys.exit(1)


# =============================================================================
# Agent Selection and Processing
# =============================================================================

def update_specific_agent(agent_type: str, repo_root: str):
    """
    Update a specific agent type.
    
    Args:
        agent_type: Type of agent to update
        repo_root: Repository root path
        
    Raises:
        SystemExit: If agent type is unknown
    """
    if agent_type not in AGENT_FILES:
        log_error(f"Unknown agent type '{agent_type}'")
        log_error(f"Expected: {'|'.join(AGENT_FILES.keys())}")
        sys.exit(1)
    
    target_file = os.path.join(repo_root, AGENT_FILES[agent_type])
    agent_name = AGENT_NAMES.get(agent_type, agent_type)
    
    update_agent_file(target_file, agent_name, repo_root)


def update_all_existing_agents(repo_root: str):
    """
    Update all existing agent files, or create default Claude file if none exist.
    
    Args:
        repo_root: Repository root path
    """
    found_agent = False
    
    # Check each possible agent file and update if it exists
    for agent_type, rel_path in AGENT_FILES.items():
        target_file = os.path.join(repo_root, rel_path)
        
        # Special handling: AGENTS.md is shared by multiple agents
        # Only process it once for the first agent that uses it
        if rel_path == 'AGENTS.md' and agent_type not in ['opencode', 'amp', 'q', 'bob']:
            continue
        
        if os.path.isfile(target_file):
            agent_name = AGENT_NAMES.get(agent_type, agent_type)
            update_agent_file(target_file, agent_name, repo_root)
            found_agent = True
    
    # If no agent files exist, create a default Claude file
    if not found_agent:
        log_info("No existing agent files found, creating default Claude file...")
        target_file = os.path.join(repo_root, 'CLAUDE.md')
        update_agent_file(target_file, "Claude Code", repo_root)


def print_summary():
    """Print summary of changes made."""
    print()
    log_info("Summary of changes:")
    
    if NEW_LANG:
        print(f"  - Added language: {NEW_LANG}")
    
    if NEW_FRAMEWORK:
        print(f"  - Added framework: {NEW_FRAMEWORK}")
    
    if NEW_DB and NEW_DB != "N/A":
        print(f"  - Added database: {NEW_DB}")
    
    print()


# =============================================================================
# Main Execution
# =============================================================================

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Update agent context files with information from plan.md',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Agent types:
  claude       Claude Code (CLAUDE.md)
  gemini       Gemini CLI (GEMINI.md)
  copilot      GitHub Copilot (.github/agents/copilot-instructions.md)
  cursor-agent Cursor IDE (.cursor/rules/specify-rules.mdc)
  qwen         Qwen Code (QWEN.md)
  opencode     opencode (AGENTS.md)
  codex        Codex CLI (AGENTS.md)
  windsurf     Windsurf (.windsurf/rules/specify-rules.md)
  kilocode     Kilo Code (.kilocode/rules/specify-rules.md)
  auggie       Auggie CLI (.augment/rules/specify-rules.md)
  roo          Roo Code (.roo/rules/specify-rules.md)
  codebuddy    CodeBuddy CLI (CODEBUDDY.md)
  qoder        Qoder CLI (QODER.md)
  amp          Amp (AGENTS.md)
  shai         SHAI (SHAI.md)
  q            Amazon Q Developer CLI (AGENTS.md)
  bob          IBM Bob (AGENTS.md)

Leave agent_type empty to update all existing agent files.
        """
    )
    parser.add_argument(
        'agent_type',
        nargs='?',
        help='Optional agent type to update (leave empty to update all)'
    )
    
    args = parser.parse_args()
    
    try:
        # Validate execution environment first
        if not validate_execution_environment():
            logger.error("Execution environment validation failed")
            sys.exit(1)
        
        # Get repository paths
        repo_root = get_repo_root()
        current_branch = get_current_branch()
        current_branch = get_feature_dir(repo_root, current_branch)
        feature_dir = get_feature_dir(repo_root, Path(current_branch).name)
        
        # Define file paths
        plan_file = os.path.join(feature_dir, 'plan.md')
        template_file = os.path.join(repo_root, '.zo', 'templates', 'agent-file-template.md')
        
        # Validate environment
        validate_environment(repo_root, current_branch, plan_file, template_file)
        
        log_info(f"=== Updating agent context files for feature {Path(current_branch).name} ===")
        
        # Parse the plan file to extract project information
        parse_plan_data(plan_file)
        
        # Process based on agent type argument
        if args.agent_type:
            # Specific agent provided - update only that agent
            log_info(f"Updating specific agent: {args.agent_type}")
            update_specific_agent(args.agent_type, repo_root)
        else:
            # No specific agent provided - update all existing agent files
            log_info("No agent specified, updating all existing agent files...")
            update_all_existing_agents(repo_root)
        
        # Print summary
        print_summary()
        
        log_success("Agent context update completed successfully")
        return 0
        
    except SystemExit as e:
        # Re-raise SystemExit with its code
        return e.code
    except Exception as e:
        log_error(f"Agent context update completed with errors: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
