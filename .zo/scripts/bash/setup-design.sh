#!/usr/bin/env bash

set -e

# Parse command line arguments
JSON_MODE=false
GLOBAL_MODE=false
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --json)
            JSON_MODE=true
            ;;
        --global|-g)
            GLOBAL_MODE=true
            ;;
        --help|-h)
            echo "Usage: $0 [--json] [--global] [feature-dir]"
            echo "  --json    Output results in JSON format"
            echo "  --global  Setup global design system (.zo/design-system.md)"
            echo "  --help    Show this help message"
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

# Handle Global Mode
if $GLOBAL_MODE; then
    DESIGN_FILE="$REPO_ROOT/.zo/design-system.md"
    FEATURE_SPEC=""
    FEATURE_DIR="$REPO_ROOT"
    FEATURE_NAME="global"

    # Use global design system template if available
    TEMPLATE="$REPO_ROOT/.zo/templates/design-system-template.md"
    if [[ ! -f "$DESIGN_FILE" ]] && [[ -f "$TEMPLATE" ]]; then
        cp "$TEMPLATE" "$DESIGN_FILE"
    fi
else
    # Handle Feature Mode
    # Handle optional feature directory argument
    if [[ ${#ARGS[@]} -gt 0 ]]; then
        FEATURE_ARG="${ARGS[0]}"
        if [[ -d "$FEATURE_ARG" ]]; then
            # Resolve absolute path
            FEATURE_DIR="$(cd "$FEATURE_ARG" && pwd)"
            FEATURE_SPEC="$FEATURE_DIR/spec.md"
            FEATURE_NAME=$(basename "$FEATURE_DIR")
        elif [[ -d "$REPO_ROOT/$FEATURE_ARG" ]]; then
            FEATURE_DIR="$(cd "$REPO_ROOT/$FEATURE_ARG" && pwd)"
            FEATURE_SPEC="$FEATURE_DIR/spec.md"
            FEATURE_NAME=$(basename "$FEATURE_DIR")
        else
            echo "Error: Directory '$FEATURE_ARG' not found."
            exit 1
        fi
    else
        # Auto-detect context from current branch
        if [[ "$CURRENT_BRANCH" =~ ^[0-9]{3}- ]]; then
             FEATURE_NAME="$CURRENT_BRANCH"
        else
             # Fallback to current directory if valid structure
             if [[ -f "spec.md" ]]; then
                 FEATURE_DIR="$(pwd)"
                 FEATURE_SPEC="$FEATURE_DIR/spec.md"
             else
                 echo "Error: Could not determine feature context. Run inside a feature branch or specify directory."
                 exit 1
             fi
        fi
    fi

    # Define Output File for feature design
    DESIGN_FILE="$FEATURE_DIR/design.md"

    # Use feature design template if available
    TEMPLATE="$REPO_ROOT/.zo/templates/design-template.md"
    if [[ ! -f "$DESIGN_FILE" ]] && [[ -f "$TEMPLATE" ]]; then
        cp "$TEMPLATE" "$DESIGN_FILE"
        # Replace basic placeholders
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/\[FEATURE NAME\]/$FEATURE_NAME/g" "$DESIGN_FILE"
        else
            sed -i "s/\[FEATURE NAME\]/$FEATURE_NAME/g" "$DESIGN_FILE"
        fi
    fi
fi

# Output results
if $JSON_MODE; then
    printf '{"MODE":"%s","DESIGN_FILE":"%s","FEATURE_SPEC":"%s","FEATURE_DIR":"%s","FEATURE_NAME":"%s"}\n' \
        "$(if $GLOBAL_MODE; then echo 'global'; else echo 'feature'; fi)" \
        "$DESIGN_FILE" "$FEATURE_SPEC" "$FEATURE_DIR" "$FEATURE_NAME"
else
    if $GLOBAL_MODE; then
        echo "MODE: global"
        echo "DESIGN_FILE: $DESIGN_FILE"
    else
        echo "MODE: feature"
        echo "DESIGN_FILE: $DESIGN_FILE"
        echo "FEATURE_SPEC: $FEATURE_SPEC"
        echo "FEATURE_DIR: $FEATURE_DIR"
        echo "FEATURE_NAME: $FEATURE_NAME"
    fi
fi
