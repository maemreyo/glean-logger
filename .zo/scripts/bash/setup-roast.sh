#!/usr/bin/env bash

set -e

# Parse command line arguments
JSON_MODE=false
JSON_INPUT=""
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --json)
            JSON_MODE=true
            # Next arg should be the JSON data
            ;;
        --json=*)
            # Handle --json='{"key":"value"}' format
            JSON_INPUT="${arg#--json=}"
            JSON_MODE=true
            ;;
        --help|-h)
            echo "Usage: $0 [--json] [--json=JSON_DATA] [feature_dir]"
            echo "  --json              Output results in JSON format"
            echo "  --json=JSON_DATA    Input JSON data with commits array"
            echo "                      Example: --json='{\"commits\":[\"abc123\",\"def456\"]}'"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            # If starts with { and JSON_MODE is true, treat as JSON input
            if [[ "$arg" =~ ^\{ ]] && $JSON_MODE; then
                JSON_INPUT="$arg"
            else
                ARGS+=("$arg")
            fi
            ;;
    esac
done

# Get script directory and load common functions
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get all paths and variables from common functions
eval $(get_feature_paths)

# Handle optional feature directory argument
if [[ ${#ARGS[@]} -gt 0 ]]; then
    FEATURE_ARG="${ARGS[0]}"
    if [[ -d "$FEATURE_ARG" ]]; then
        # Resolve absolute path
        FEATURE_DIR="$(cd "$FEATURE_ARG" && pwd)"
        echo "Using specified feature directory: $FEATURE_DIR"

        # Override derived paths
        FEATURE_SPEC="$FEATURE_DIR/spec.md"
        IMPL_PLAN="$FEATURE_DIR/plan.md"
        TASKS="$FEATURE_DIR/tasks.md"

        # We might not be on the branch matching this folder, so extract name from folder
        FEATURE_NAME=$(basename "$FEATURE_DIR")
    elif [[ -d "$REPO_ROOT/$FEATURE_ARG" ]]; then
        FEATURE_DIR="$(cd "$REPO_ROOT/$FEATURE_ARG" && pwd)"
        echo "Using specified feature directory: $FEATURE_DIR"

        FEATURE_SPEC="$FEATURE_DIR/spec.md"
        IMPL_PLAN="$FEATURE_DIR/plan.md"
        TASKS="$FEATURE_DIR/tasks.md"

        FEATURE_NAME=$(basename "$FEATURE_DIR")
    else
        echo "Error: Directory '$FEATURE_ARG' not found."
        exit 1
    fi
else
    FEATURE_NAME="$CURRENT_BRANCH"

    # Special handling for main/master branch - require feature dir or use repo root
    if [[ "$FEATURE_NAME" == "main" ]] || [[ "$FEATURE_NAME" == "master" ]]; then
        # If JSON input is provided (for roasting commits), use repo root for roast reports
        if [[ -n "$JSON_INPUT" ]]; then
            # Use .zo directory as FEATURE_DIR so roasts go to .zo/roasts/
            FEATURE_DIR="$REPO_ROOT/.zo"
            FEATURE_SPEC="$REPO_ROOT/.zo/spec.md"
            IMPL_PLAN="$REPO_ROOT/.zo/plan.md"
            TASKS="$REPO_ROOT/.zo/tasks.md"
            echo "Warning: Not on a feature branch. Using repo root for roast report."
        else
            echo "Error: Not on a feature branch. Please specify a feature directory or switch to a feature branch."
            echo "Usage: $0 [--json] <feature-directory>"
            exit 1
        fi
    fi
fi

# Check if we're on a proper feature branch (only for git repos)
# Skip branch check if JSON input provided or explicit feature dir specified
# DISABLED: Allow roasting any branch or commits
# if [[ ${#ARGS[@]} -eq 0 ]] && [[ -z "$JSON_INPUT" ]]; then
#     check_feature_branch "$CURRENT_BRANCH" "$HAS_GIT" || exit 1
# fi

# Ensure the roast directory exists INSIDE the feature spec folder
DOCS_DIR="$FEATURE_DIR/roasts"
mkdir -p "$DOCS_DIR"

# Define Report Path
DATE_STR=$(date +%Y-%m-%d-%H%M)
REPORT_FILE="$DOCS_DIR/roast-report-${FEATURE_NAME}-${DATE_STR}.md"

# Parse JSON input if provided
if [[ -n "$JSON_INPUT" ]]; then
    # Parse commits from JSON (requires jq)
    if command -v jq &> /dev/null; then
        COMMITS=$(echo "$JSON_INPUT" | jq -r '.commits[]? // empty' | tr '\n' ',' | sed 's/,$//')
        DESIGN_SYSTEM=$(echo "$JSON_INPUT" | jq -r '.design_system // empty')

        # Append metadata to report for reference
        if [[ -n "$COMMITS" ]] || [[ -n "$DESIGN_SYSTEM" ]]; then
            echo "" >> "$REPORT_FILE"
            echo "<!--" >> "$REPORT_FILE"
            [[ -n "$COMMITS" ]] && echo "Commits: $COMMITS" >> "$REPORT_FILE"
            [[ -n "$DESIGN_SYSTEM" ]] && echo "Design System: $DESIGN_SYSTEM" >> "$REPORT_FILE"
            echo "-->" >> "$REPORT_FILE"
        fi
    else
        echo "Warning: jq not found. Cannot parse JSON input properly." >&2
    fi
else
    # Default design system if not provided in JSON
    DESIGN_SYSTEM="$REPO_ROOT/.zo/design-system.md"
fi

# Copy template if it exists
TEMPLATE="$REPO_ROOT/.zo/templates/roast-template.md"
if [[ -f "$TEMPLATE" ]]; then
    # Start fresh for a new roast or append? 
    # User said "update a file report after each subtask review", implying we need a stable file during the run.
    # But usually a roast is a session. Let's create a fresh one if it doesn't exist, or overwrite if it's the same day?
    # User said "update a file report".
    
    # Let's overwrite to ensure a fresh session start, OR we rely on the agent to append.
    # But strictly following `setup-plan.sh`, we cp.
    cp "$TEMPLATE" "$REPORT_FILE"
    echo "Initialized Roast Report at $REPORT_FILE"
else
    echo "Warning: Roast template not found at $TEMPLATE"
    touch "$REPORT_FILE"
fi

# Output results
if $JSON_MODE; then
    printf '{"REPORT_FILE":"%s","TASKS":"%s","IMPL_PLAN":"%s","BRANCH":"%s","COMMITS":"%s","DESIGN_SYSTEM":"%s"}\n' \
        "$REPORT_FILE" "$TASKS" "$IMPL_PLAN" "$CURRENT_BRANCH" "${COMMITS:-}" "${DESIGN_SYSTEM:-}"
else
    echo "REPORT_FILE: $REPORT_FILE"
    echo "TASKS: $TASKS"
    echo "IMPL_PLAN: $IMPL_PLAN"
    echo "BRANCH: $CURRENT_BRANCH"
    [[ -n "$COMMITS" ]] && echo "COMMITS: $COMMITS"
    [[ -n "$DESIGN_SYSTEM" ]] && echo "DESIGN_SYSTEM: $DESIGN_SYSTEM"
fi
