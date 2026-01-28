#!/bin/bash
#
# setup-brainstorm-crazy.sh
# Initialize context for a "crazy" brainstorm session with enhanced template support.
# Uses brainstorm-template-crazy.md for output formatting.
#
# Usage:
#   ./setup-brainstorm-crazy.sh [OPTIONS] "brainstorm request"
#
# Options:
#   --json       Output JSON (default)
#   --help       Show usage
#   --dry-run    Show what would be found without creating files
#   -v, --verbose  Verbose output
#
# Examples:
#   ./setup-brainstorm-crazy.sh "improve login flow"
#   ./setup-brainstorm-crazy.sh -v "add offline support"
#   ./setup-brainstorm-crazy.sh --dry-run "story creator"
#

set -euo pipefail

# Constants
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$(dirname "$(dirname "$(dirname "${SCRIPT_DIR}")")")" && pwd)"
SPECS_DIR="${PROJECT_ROOT}/specs"
BRAINSTORMS_DIR="${PROJECT_ROOT}/.zo/brainstorms"
TEMPLATES_DIR="${PROJECT_ROOT}/.zo/templates"

# Common words to remove when extracting research focus
COMMON_WORDS="a an the and or but if then else when at of for to in on with by from as is are was were be been being have has had do does did will would could should might must may might about above after again against all also any are around as at because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just like me more most my myself no nor not now of off on once only or other ought our ours ourselves out over own same she should since so some such than that the their theirs them themselves then there these they this those through to too under until up very was we were what when where which while who whom why with would you your yours yourself yourselves"

# Flags
OUTPUT_JSON=true
DRY_RUN=false
VERBOSE=false

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --json)
                OUTPUT_JSON=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -*)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
            *)
                ARGUMENTS="${ARGUMENTS:-}$1 "
                shift
                ;;
        esac
    done

    # Trim trailing space and quotes
    ARGUMENTS=$(echo "$ARGUMENTS" | sed 's/[[:space:]]*$//' | sed "s/^['\"]*//;s/['\"]*$//")
}

# Show help message
show_help() {
    cat << 'EOF'
setup-brainstorm-crazy.sh - Initialize context for a "crazy" brainstorm session

USAGE:
    ./setup-brainstorm-crazy.sh [OPTIONS] "brainstorm request"

OPTIONS:
    --json       Output JSON (default behavior)
    --help       Show this help message
    --dry-run    Show what would be found without creating files
    -v, --verbose  Verbose output

EXAMPLES:
    # Basic usage
    ./setup-brainstorm-crazy.sh "improve login flow"

    # With verbose output
    ./setup-brainstorm-crazy.sh -v "add offline support"

    # Dry run to see what would be found
    ./setup-brainstorm-crazy.sh --dry-run "story creator"

OUTPUT:
    JSON object with paths and information for the brainstorm session:
    - OUTPUT_FILE: Path to the brainstorm output file (created from template if available)
    - FEATURE_SPEC: Path to the feature specification document
    - IMPL_PLAN: Path to the implementation plan document
    - TASKS: Path to the tasks document
    - RESEARCH_FOCUS: Extracted keywords from user input
    - SPEC_DIR: Path to the specification directory
EOF
}

# Log verbose messages
log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[VERBOSE] $1" >&2
    fi
}

# Error handler
error() {
    echo "Error: $1" >&2
    exit 1
}

# Extract research focus from user input
extract_research_focus() {
    local input="$1"
    local focus=""

    # Convert to lowercase
    input=$(echo "$input" | tr '[:upper:]' '[:lower:]')

    # Remove common words and punctuation
    for word in $COMMON_WORDS; do
        input=$(echo "$input" | sed "s/\\b${word}\\b//g")
    done

    # Remove extra whitespace, punctuation, and convert spaces to hyphens
    focus=$(echo "$input" | tr -s '[:space:]' ' ' | tr ' ' '-' | tr -d '.,!?:;()[]{}' | sed 's/-\+/-/g' | sed 's/^-\+//;s/-\+$//')

    echo "$focus"
}

# Find matching spec folder
find_spec_folder() {
    local focus="$1"
    local best_match=""
    local best_score=0

    if [[ ! -d "$SPECS_DIR" ]]; then
        log_verbose "Specs directory not found: $SPECS_DIR"
        return 1
    fi

    # List spec folders
    local folders=($(ls -d "$SPECS_DIR"/*/ 2>/dev/null | xargs -n1 basename | sort -r))

    for folder in "${folders[@]}"; do
        local folder_name=$(echo "$folder" | tr '[:upper:]' '[:lower:]')
        local score=0

        # Split focus into keywords
        IFS='-' read -ra KEYWORDS <<< "$focus"

        for keyword in "${KEYWORDS[@]}"; do
            if [[ -n "$keyword" && "$folder_name" == *"$keyword"* ]]; then
                ((score++))
            fi
        done

        # Bonus for numbered folders (higher number = more recent)
        if [[ "$folder" =~ ^([0-9]+)- ]]; then
            local num="${BASH_REMATCH[1]}"
            # Add score based on recency (normalized)
            score=$((score * 100 + num))
        fi

        if [[ $score -gt $best_score ]]; then
            best_score=$score
            best_match=$folder
        fi
    done

    if [[ -n "$best_match" ]]; then
        echo "$best_match"
        return 0
    fi

    return 1
}

# Check if file exists
file_exists() {
    [[ -f "$1" ]]
}

# Generate JSON output
generate_json() {
    local output_file="$1"
    local feature_spec="$2"
    local impl_plan="$3"
    local tasks="$4"
    local research_focus="$5"
    local spec_dir="$6"

    # Build JSON using bash string manipulation
    cat << EOF
{
  "OUTPUT_FILE": "$output_file",
  "FEATURE_SPEC": $([ -n "$feature_spec" ] && echo "\"$feature_spec\"" || echo "null"),
  "IMPL_PLAN": $([ -n "$impl_plan" ] && echo "\"$impl_plan\"" || echo "null"),
  "TASKS": $([ -n "$tasks" ] && echo "\"$tasks\"" || echo "null"),
  "RESEARCH_FOCUS": "$research_focus",
  "SPEC_DIR": "$spec_dir"
}
EOF
}

# Main function
main() {
    parse_args "$@"

    # Check if arguments provided
    if [[ -z "${ARGUMENTS:-}" ]]; then
        error "No brainstorm request provided. Use --help for usage."
    fi

    log_verbose "Input: $ARGUMENTS"

    # Extract research focus
    RESEARCH_FOCUS=$(extract_research_focus "$ARGUMENTS")

    if [[ -z "$RESEARCH_FOCUS" ]]; then
        error "Could not extract research focus from input"
    fi

    log_verbose "Research focus: $RESEARCH_FOCUS"

    # Find matching spec folder
    SPEC_FOLDER=$(find_spec_folder "$RESEARCH_FOCUS") || true

    if [[ -n "$SPEC_FOLDER" ]]; then
        SPEC_DIR="${SPECS_DIR}/${SPEC_FOLDER}"
        log_verbose "Found spec folder: $SPEC_FOLDER"

        # Look for related files
        FEATURE_SPEC=""
        IMPL_PLAN=""
        TASKS=""

        # Check for spec.md (also check spec.md in various forms)
        if file_exists "${SPEC_DIR}/spec.md"; then
            FEATURE_SPEC="${SPEC_DIR}/spec.md"
        elif file_exists "${SPEC_DIR}/SPEC.md"; then
            FEATURE_SPEC="${SPEC_DIR}/SPEC.md"
        fi

        # Check for plan.md
        if file_exists "${SPEC_DIR}/plan.md"; then
            IMPL_PLAN="${SPEC_DIR}/plan.md"
        elif file_exists "${SPEC_DIR}/PLAN.md"; then
            IMPL_PLAN="${SPEC_DIR}/PLAN.md"
        fi

        # Check for tasks.md
        if file_exists "${SPEC_DIR}/tasks.md"; then
            TASKS="${SPEC_DIR}/tasks.md"
        elif file_exists "${SPEC_DIR}/TASKS.md"; then
            TASKS="${SPEC_DIR}/TASKS.md"
        fi

        log_verbose "Feature spec: ${FEATURE_SPEC:-none}"
        log_verbose "Implementation plan: ${IMPL_PLAN:-none}"
        log_verbose "Tasks: ${TASKS:-none}"
    else
        SPEC_DIR=""
        FEATURE_SPEC=""
        IMPL_PLAN=""
        TASKS=""
        log_verbose "No matching spec folder found"
    fi

    # Generate date for output file
    DATE=$(date +%Y-%m-%d)

    # Generate OUTPUT_FILE path
    OUTPUT_FILE="${BRAINSTORMS_DIR}/${RESEARCH_FOCUS}-${DATE}.md"

    # Create directory if needed (only if not dry-run)
    if [[ "$DRY_RUN" == "false" ]]; then
        mkdir -p "$BRAINSTORMS_DIR"
    else
        log_verbose "Dry run - not creating directory"
    fi

    log_verbose "Output file: $OUTPUT_FILE"

    # Use Template if available (only if not dry-run)
    TEMPLATE="${TEMPLATES_DIR}/brainstorm-template-crazy.md"
    if [[ -f "$TEMPLATE" && "$DRY_RUN" == "false" ]]; then
        log_verbose "Using template: $TEMPLATE"
        cp "$TEMPLATE" "$OUTPUT_FILE"
        # Replace placeholders
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # MacOS sed
            sed -i '' "s/{{DATE}}/$DATE/g" "$OUTPUT_FILE"
            sed -i '' "s/{{FEATURE}}/$RESEARCH_FOCUS/g" "$OUTPUT_FILE"
        else
            # Linux sed
            sed -i "s/{{DATE}}/$DATE/g" "$OUTPUT_FILE"
            sed -i "s/{{FEATURE}}/$RESEARCH_FOCUS/g" "$OUTPUT_FILE"
        fi
    elif [[ "$DRY_RUN" == "false" ]]; then
        # Fallback to empty file if template missing
        touch "$OUTPUT_FILE"
    fi

    # Output JSON
    if [[ "$OUTPUT_JSON" == "true" ]]; then
        generate_json "$OUTPUT_FILE" "$FEATURE_SPEC" "$IMPL_PLAN" "$TASKS" "$RESEARCH_FOCUS" "$SPEC_DIR"
    fi
}

# Run main
main "$@"
