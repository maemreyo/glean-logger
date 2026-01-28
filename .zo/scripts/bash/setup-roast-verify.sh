#!/usr/bin/env bash

set -e

# Parse command line arguments
JSON_MODE=false
REPORT_ARG=""
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --json) 
            JSON_MODE=true 
            ;;
        --report=*)
            REPORT_ARG="${arg#*=}"
            ;;
        --help|-h) 
            echo "Usage: $0 [--json] [--report=path/to/report.md]"
            echo "  --json      Output results in JSON format"
            echo "  --report    Specify a specific roast report file"
            echo "  --help      Show this help message"
            exit 0 
            ;;
        *) 
            ARGS+=("$arg") 
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
        TASKS="$FEATURE_DIR/tasks.md"
        FEATURE_NAME=$(basename "$FEATURE_DIR")
    elif [[ -d "$REPO_ROOT/$FEATURE_ARG" ]]; then
        FEATURE_DIR="$(cd "$REPO_ROOT/$FEATURE_ARG" && pwd)"
        echo "Using specified feature directory: $FEATURE_DIR"
        
        TASKS="$FEATURE_DIR/tasks.md"
        FEATURE_NAME=$(basename "$FEATURE_DIR")
    else
        echo "Error: Directory '$FEATURE_ARG' not found."
        exit 1
    fi
else
    FEATURE_NAME="$CURRENT_BRANCH"
fi

# Check if we're on a proper feature branch (only for git repos)
# DISABLED: Allow verifying roasts on any branch
# if [[ ${#ARGS[@]} -eq 0 ]]; then
#     check_feature_branch "$CURRENT_BRANCH" "$HAS_GIT" || exit 1
# fi

DOCS_DIR="$FEATURE_DIR/roasts"

# Determine Report File
if [[ -n "$REPORT_ARG" ]]; then
    if [[ -f "$REPORT_ARG" ]]; then
        REPORT_FILE="$REPORT_ARG"
    elif [[ -f "$REPO_ROOT/$REPORT_ARG" ]]; then
        REPORT_FILE="$REPO_ROOT/$REPORT_ARG"
    else
        echo "Error: Specified report file not found: $REPORT_ARG" >&2
        exit 1
    fi
else
    # Find the latest roast report for the current branch/feature
    # Assumes format: roast-report-[name]-YYYY-MM-DD-HHMM.md
    REPORT_FILE=$(find "$DOCS_DIR" -maxdepth 1 -name "roast-report-${FEATURE_NAME}-*.md" | sort -r | head -n 1)
    
    if [[ -z "$REPORT_FILE" ]]; then
        echo "Error: No roast report found for feature ${FEATURE_NAME} in $DOCS_DIR" >&2
        exit 1
    fi
fi

# Output results
if $JSON_MODE; then
    printf '{"REPORT_FILE":"%s","TASKS":"%s","BRANCH":"%s"}\n' \
        "$REPORT_FILE" "$TASKS" "$CURRENT_BRANCH"
else
    echo "REPORT_FILE: $REPORT_FILE"
    echo "TASKS: $TASKS"
    echo "BRANCH: $CURRENT_BRANCH"
fi
