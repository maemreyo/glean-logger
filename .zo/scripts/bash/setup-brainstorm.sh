#!/usr/bin/env bash

set -e

# Parse command line arguments
JSON_MODE=false
ARGS=()

for arg in "$@"; do
    case "$arg" in
        --json) 
            JSON_MODE=true 
            ;;
        --help|-h) 
            echo "Usage: $0 [--json] [brainstorm topic]"
            echo "  --json    Output results in JSON format"
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

# Helper function to slugify text
slugify() {
    # Convert to lowercase, replace non-alphanumeric with hyphens, collapse consecutive hyphens
    echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | tr -s '-' | sed 's/^-//' | sed 's/-$//'
}

# Determine Output Directory
# User requested: .zo/brainstorms/
BRAINSTORM_DIR="$REPO_ROOT/.zo/brainstorms"
mkdir -p "$BRAINSTORM_DIR"

# Determine Filename
TOPIC_INPUT="${ARGS[*]}"
DATE_STR=$(date +%Y-%m-%d-%H%M)

if [[ -n "$TOPIC_INPUT" ]]; then
    # Slugify the input topic
    TOPIC_SLUG=$(slugify "$TOPIC_INPUT")
    # Add date to avoid collisions if same topic is used again? 
    # User asked for "file-name-should-cover-the-goal", didn't explicitly ask for date.
    # But files need to be unique.
    # I'll stick to a clean name if possible, maybe appending short date if exists?
    # Let's try just the slug first, but if it exists, maybe append date?
    # Or just always append date for safety. "improve-login-flow-2026-01-06.md"
    FILENAME="${TOPIC_SLUG}-${DATE_STR}.md"
    NAME_TAG="$TOPIC_SLUG"
else
    # Fallback if no topic provided
    FILENAME="brainstorm-session-${DATE_STR}.md"
    NAME_TAG="General Session"
fi

OUTPUT_FILE="$BRAINSTORM_DIR/$FILENAME"

# Use Template if available
TEMPLATE="$REPO_ROOT/.zo/templates/brainstorm-template.md"
if [[ -f "$TEMPLATE" ]]; then
    cp "$TEMPLATE" "$OUTPUT_FILE"
    # Replace placeholders
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # MacOS sed
        sed -i '' "s/{{DATE}}/$DATE_STR/g" "$OUTPUT_FILE"
        sed -i '' "s/{{FEATURE}}/$NAME_TAG/g" "$OUTPUT_FILE"
    else
        # Linux sed
        sed -i "s/{{DATE}}/$DATE_STR/g" "$OUTPUT_FILE"
        sed -i "s/{{FEATURE}}/$NAME_TAG/g" "$OUTPUT_FILE"
    fi
else
    # Fallback to empty file if template missing
    touch "$OUTPUT_FILE"
fi

# Output results
if $JSON_MODE; then
    # We only output the file path now, as other context is less relevant for the pure brainstorm command
    # but we keep structure for compatibility if needed.
    printf '{"OUTPUT_FILE":"%s","BRAINSTORM_DIR":"%s","TOPIC":"%s"}\n' \
        "$OUTPUT_FILE" "$BRAINSTORM_DIR" "$NAME_TAG"
else
    echo "OUTPUT_FILE: $OUTPUT_FILE"
fi
