#!/bin/bash

# =============================================================================
# Glean Logger - Setup Script
# =============================================================================
# This script sets up the logger module in your project.
#
# Usage (Local - Copy Source):
#   ./setup.sh                          # Setup in current directory
#   ./setup.sh /path/to/project         # Setup in specific directory
#
# Usage (NPM Package):
#   ./setup.sh --npm                    # Setup via npm package
#   ./setup.sh --npm /path/to/project   # Setup in specific directory
#
# Remote Installation:
#   curl -sSL https://raw.githubusercontent.com/maemreyo/glean-logger/main/setup.sh | bash -s -- --npm
# =============================================================================

set -e

# Configuration
GITHUB_RAW_URL="${GITHUB_RAW_URL:-https://raw.githubusercontent.com/maemreyo/glean-logger/main}"
GITHUB_REPO_URL="${GITHUB_REPO_URL:-https://github.com/maemreyo/glean-logger}"
NPM_PACKAGE="glean-logger"

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

# Parse arguments
USE_NPM=false
PROJECT_DIR=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --npm)
            USE_NPM=true
            shift
            ;;
        -n|--name)
            NPM_PACKAGE="$2"
            shift 2
            ;;
        *)
            if [[ -z "$PROJECT_DIR" ]]; then
                PROJECT_DIR="$1"
            fi
            shift
            ;;
    esac
done

# Set default project directory
if [[ -z "$PROJECT_DIR" ]]; then
    PROJECT_DIR="$(pwd)"
fi

# Detect script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

download_file() {
    local url="$1"
    local output="$2"
    if command -v curl &> /dev/null; then
        curl -sSL "$url" -o "$output"
    elif command -v wget &> /dev/null; then
        wget -q "$url" -O "$output"
    else
        print_error "curl or wget required"
        exit 1
    fi
}

# Setup via npm package
setup_npm() {
    print_step "Setting up glean-logger via npm..."
    echo ""

    # Install npm package
    print_step "Installing $NPM_PACKAGE..."
    cd "$PROJECT_DIR"
    npm install --save "$NPM_PACKAGE"
    print_success "Installed $NPM_PACKAGE"

    # Install peer dependencies
    print_step "Installing peer dependencies..."
    npm install --save winston winston-daily-rotate-file
    print_success "Installed peer dependencies"

    echo ""
    echo "============================================"
    print_success "NPM Setup Complete!"
    echo "============================================"
    echo ""
    echo "📦 Installed packages:"
    echo "   - $NPM_PACKAGE"
    echo "   - winston"
    echo "   - winston-daily-rotate-file"
    echo ""
    echo "📖 Usage:"
    echo "   import { logger, child, measure } from '$NPM_PACKAGE'"
    echo ""
    echo "   const log = logger({ name: 'my-app' })"
    echo "   log.info('Hello!', { userId: 123 })"
    echo ""
    echo "🔗 Documentation: $GITHUB_REPO_URL#readme"
    echo ""
}

# Setup via copy source
setup_copy() {
    local logger_dir="$SCRIPT_DIR"
    local is_remote=false

    print_step "Setting up glean-logger..."
    echo ""

    # Check if running from remote
    if [[ "$0" == "bash" ]] || [[ "$0" == "-c" ]]; then
        is_remote=true
        print_url "Running from remote: $GITHUB_RAW_URL"
    fi

    # Detect logger module location
    if [[ ! -f "$logger_dir/index.ts" ]]; then
        if [[ "$is_remote" == "true" ]]; then
            print_step "Downloading from GitHub..."
            local temp_dir=$(mktemp -d)
            download_file "$GITHUB_RAW_URL/lib/logger/setup.sh" "$temp_dir/setup.sh"
            download_file "$GITHUB_RAW_URL/lib/logger/install.sh" "$temp_dir/install.sh"
            download_file "$GITHUB_RAW_URL/lib/logger/README.md" "$temp_dir/README.md"

            local files=("index.ts" "browser.ts" "server.ts" "http.ts" "timing.ts"
                        "types.ts" "config.ts" "formatters.ts" "utils.ts"
                        "redact.ts" "schema.ts" "winston.config.ts"
                        "package.json" "tsconfig.json")

            for file in "${files[@]}"; do
                download_file "$GITHUB_RAW_URL/lib/logger/$file" "$temp_dir/lib/logger/$file" || true
            done

            logger_dir="$temp_dir/lib/logger"
        else
            print_error "Could not find logger module!"
            echo "Please ensure this script is in the lib/logger directory."
            exit 1
        fi
    fi

    print_success "Found logger module at: $logger_dir"

    # Create project directory structure
    print_step "Creating project directory structure..."
    mkdir -p "$PROJECT_DIR/lib"
    mkdir -p "$PROJECT_DIR/_logs"

    # Copy logger module
    print_step "Copying logger module..."
    cp -r "$logger_dir" "$PROJECT_DIR/lib/"
    chmod +x "$PROJECT_DIR/lib/logger/setup.sh" 2>/dev/null || true
    chmod +x "$PROJECT_DIR/lib/logger/install.sh" 2>/dev/null || true
    print_success "Copied logger module to $PROJECT_DIR/lib/logger"

    # Set permissions
    print_step "Setting permissions..."
    chmod 755 "$PROJECT_DIR/_logs"
    print_success "Permissions set"

    # Update .gitignore
    print_step "Updating .gitignore..."
    if [[ -f "$PROJECT_DIR/.gitignore" ]]; then
        if ! grep -q "_logs/" "$PROJECT_DIR/.gitignore"; then
            echo "" >> "$PROJECT_DIR/.gitignore"
            echo "# Logger module logs" >> "$PROJECT_DIR/.gitignore"
            echo "_logs/" >> "$PROJECT_DIR/.gitignore"
            echo "*.log" >> "$PROJECT_DIR/.gitignore"
            print_success "Updated .gitignore"
        else
            print_warning ".gitignore already contains _logs/"
        fi
    else
        echo "# Logger module logs" > "$PROJECT_DIR/.gitignore"
        echo "_logs/" >> "$PROJECT_DIR/.gitignore"
        echo "*.log" >> "$PROJECT_DIR/.gitignore"
        print_success "Created .gitignore"
    fi

    # Create examples directory
    print_step "Creating examples..."
    mkdir -p "$PROJECT_DIR/examples"
    cat > "$PROJECT_DIR/examples/logger-usage.ts" << 'EOF'
/**
 * Glean Logger - Usage Examples
 */
import { logger, child, loggedFetch, measure, performance } from '@/lib/logger';

const log = logger({ name: 'my-app' });
log.info('Application started');
log.info('User signed in', { userId: 123 });

const apiLog = child({ module: 'api', version: '1.0' });

const fetch = loggedFetch();

async function fetchUserData(userId: number) {
    const { result: user, duration } = await measure('fetch-user', async () => {
        return await database.users.findUnique({ where: { id: userId } });
    });
    console.log(`Fetched user ${userId} in ${duration}ms`);
    return user;
}

export function createMockLogger() {
    return { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
}
EOF
    print_success "Created examples/logger-usage.ts"

    echo ""
    echo "============================================"
    print_success "Copy Setup Complete!"
    echo "============================================"
    echo ""
    echo "📁 Files created:"
    echo "   - lib/logger/"
    echo "   - _logs/"
    echo "   - examples/logger-usage.ts"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Install dependencies: ./lib/logger/install.sh"
    echo "   2. Import: import { logger } from '@/lib/logger'"
    echo "   3. Docs: lib/logger/README.md"
    echo ""
    echo "🔗 Repository: $GITHUB_REPO_URL"
    echo ""
}

# Main function
main() {
    echo ""
    echo "============================================"
    echo "🚀 Glean Logger Setup"
    echo "============================================"
    echo ""

    if [[ "$USE_NPM" == "true" ]]; then
        setup_npm
    else
        setup_copy
    fi
}

main "$@"
