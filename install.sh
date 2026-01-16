#!/bin/bash

# =============================================================================
# Glean Logger - Dependency Installation Script
# =============================================================================
# Installs the required npm dependencies for the logger module.
#
# Usage:
#   ./install.sh                  # Install dependencies for local usage
#   ./install.sh --npm            # Install via npm package
#   ./install.sh --npm --save     # Install and save to package.json
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step() { echo -e "${BLUE}📦 $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_url() { echo -e "${CYAN}🔗 $1${NC}"; }

# Configuration
NPM_PACKAGE="glean-logger"
GITHUB_PACKAGE="glean-logger"

# Parse arguments
USE_NPM=false
SAVE_DEPS=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --npm)
            USE_NPM=true
            shift
            ;;
        --save|-S)
            SAVE_DEPS=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Detect script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Install local dependencies
install_local() {
    local project_dir="${1:-$(pwd)}"
    local package_json="$project_dir/package.json"

    print_step "Installing local dependencies..."

    # Check if package.json exists
    if [[ ! -f "$package_json" ]]; then
        print_error "package.json not found in $project_dir"
        exit 1
    fi

    # Check if dependencies are already in package.json
    if grep -q '"winston"' "$package_json"; then
        print_success "Dependencies already in package.json"
    else
        print_step "Adding dependencies to package.json..."
        cd "$project_dir"
        npm install --save winston winston-daily-rotate-file
    fi

    # Verify installation
    if npm list winston winston-daily-rotate-file > /dev/null 2>&1; then
        print_success "Dependencies installed successfully"
    else
        print_error "Verification failed"
        exit 1
    fi
}

# Install via npm package
install_npm() {
    local project_dir="${1:-$(pwd)}"
    
    print_step "Installing glean-logger via npm..."
    print_url "Package: $NPM_PACKAGE"

    cd "$project_dir"

    if [[ "$SAVE_DEPS" == "true" ]]; then
        npm install --save "$NPM_PACKAGE"
    else
        npm install "$NPM_PACKAGE"
    fi

    print_success "Installed glean-logger via npm"

    # Also install peer dependencies
    print_step "Installing peer dependencies..."
    npm install --save winston winston-daily-rotate-file
}

# Main installation function
install() {
    echo ""
    echo "============================================"
    echo "🚀 Glean Logger Installation"
    echo "============================================"
    echo ""

    if [[ "$USE_NPM" == "true" ]]; then
        # NPM package approach
        print_step "Mode: NPM Package Installation"
        echo ""
        print_url "Installing: $NPM_PACKAGE"
        echo ""
        install_npm "$(pwd)"

        echo ""
        echo "============================================"
        print_success "NPM Installation Complete!"
        echo "============================================"
        echo ""
        echo "📦 Installed packages:"
        echo "   - glean-logger"
        echo "   - winston"
        echo "   - winston-daily-rotate-file"
        echo ""
        echo "📖 Usage:"
        echo "   import { logger } from 'glean-logger'"
        echo ""
        echo "🔗 Documentation: https://github.com/maemreyo/glean-logger"
        echo ""

    else
        # Local approach (copy source)
        print_step "Mode: Local Dependencies"
        echo ""
        install_local "$(pwd)"

        echo ""
        echo "============================================"
        print_success "Local Installation Complete!"
        echo "============================================"
        echo ""
        echo "📦 Installed packages:"
        echo "   - winston"
        echo "   - winston-daily-rotate-file"
        echo ""
        echo "📖 Usage (local copy):"
        echo "   import { logger } from '@/lib/logger'"
        echo ""
        echo "🔧 Next: Run ./setup.sh to copy logger module"
        echo "🔗 Documentation: lib/logger/README.md"
        echo ""
    fi
}

# Run installation
install
