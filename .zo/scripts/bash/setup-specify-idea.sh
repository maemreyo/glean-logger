#!/usr/bin/env bash

set -e

# Parse arguments
JSON_MODE=false
ARGS=()
for arg in "$@"; do
    case "$arg" in
        --json) JSON_MODE=true ;;
        *) ARGS+=("$arg") ;;
    esac
done

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"
eval $(get_feature_paths)

# Find Brainstorm File
BRAINSTORM_FILE=""

if [[ ${#ARGS[@]} -gt 0 ]]; then
    # User provided a path
    INPUT_PATH="${ARGS[0]}"
    if [[ -f "$INPUT_PATH" ]]; then
        BRAINSTORM_FILE="$(cd "$(dirname "$INPUT_PATH")" && pwd)/$(basename "$INPUT_PATH")"
    else
        echo "Error: File '$INPUT_PATH' not found." >&2
        exit 1
    fi
else
    # Auto-detect latest brainstorm
    # Primary Location: .zo/brainstorms
    BRAINSTORM_DIR="$REPO_ROOT/.zo/brainstorms"
    
    if [[ -d "$BRAINSTORM_DIR" ]]; then
        BRAINSTORM_FILE=$(find "$BRAINSTORM_DIR" -name "*.md" -type f | sort -r | head -n 1)
    fi
    
    # Check legacy locations if not found
    if [[ -z "$BRAINSTORM_FILE" && -d "$FEATURE_DIR/brainstorms" ]]; then
        BRAINSTORM_FILE=$(find "$FEATURE_DIR/brainstorms" -name "brainstorm-*.md" -type f | sort -r | head -n 1)
    fi
    if [[ -z "$BRAINSTORM_FILE" && -d "$REPO_ROOT/docs/brainstorms" ]]; then
        BRAINSTORM_FILE=$(find "$REPO_ROOT/docs/brainstorms" -name "brainstorm-*.md" -type f | sort -r | head -n 1)
    fi
fi

if [[ -z "$BRAINSTORM_FILE" ]]; then
    echo "Error: No brainstorm file found. Run 'zo.brainstorm' first." >&2
    exit 1
fi

TEMPLATE="$REPO_ROOT/.zo/templates/spec-from-idea.md"

if $JSON_MODE; then
    printf '{"BRAINSTORM_FILE":"%s","SPEC_TEMPLATE":"%s","DESIGN_FILE":"%s"}\n' "$BRAINSTORM_FILE" "$TEMPLATE" "$DESIGN_FILE"
else
    echo "BRAINSTORM_FILE: $BRAINSTORM_FILE"
    echo "SPEC_TEMPLATE: $TEMPLATE"
    echo "DESIGN_FILE: $DESIGN_FILE"
fi
