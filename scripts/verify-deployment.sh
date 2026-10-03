#!/bin/bash
# Deployment Verification Script
# Usage: ./scripts/verify-deployment.sh [phase]
# Example: ./scripts/verify-deployment.sh phase2

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

function print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

function print_error() {
    echo -e "${RED}✗ $1${NC}"
}

function print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

function verify_phase1_database() {
    print_header "Phase 1: Database Verification"

    # Check if pscale is installed
    if command -v pscale &> /dev/null; then
        print_success "PlanetScale CLI is installed"
    else
        print_error "PlanetScale CLI is not installed"
        print_info "Install with: brew install planetscale/tap/pscale"
        return 1
    fi

    # Check if logged in
    if pscale auth show &> /dev/null; then
        print_success "Logged in to PlanetScale"
    else
        print_error "Not logged in to PlanetScale"
        print_info "Login with: pscale auth login"
        return 1
    fi

    # Check if database exists
    if pscale database show home-monitor &> /dev/null; then
        print_success "Database 'home-monitor' exists"
    else
        print_error "Database 'home-monitor' not found"
        print_info "Create with: pscale database create home-monitor --region us-east"
        return 1
    fi

    print_success "Phase 1 verification complete!"
}

function verify_phase2_api() {
    print_header "Phase 2: API Verification"

    # Check if vercel is installed
    if command -v vercel &> /dev/null; then
        print_success "Vercel CLI is installed"
    else
        print_error "Vercel CLI is not installed"
        print_info "Install with: npm install -g vercel"
        return 1
    fi

    # Check if .env.production exists
    if [ -f "ui/.env.production" ]; then
        print_success "ui/.env.production exists"

        # Check if it has required variables
        if grep -q "DB_HOST=" ui/.env.production && \
           grep -q "API_KEY=" ui/.env.production; then
            print_success "Required environment variables are set"
        else
            print_error "Missing required environment variables in ui/.env.production"
            print_info "Required: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, API_KEY"
            return 1
        fi
    else
        print_error "ui/.env.production not found"
        print_info "Copy from ui/.env.production.example and fill in values"
        return 1
    fi

    # Ask for Vercel URL to test
    echo -e "\nEnter your Vercel deployment URL (or press Enter to skip API tests):"
    read -r VERCEL_URL

    if [ -n "$VERCEL_URL" ]; then
        # Test filters endpoint
        echo -e "\nTesting GET $VERCEL_URL/api/filters"
        if curl -s -f "$VERCEL_URL/api/filters" > /dev/null; then
            print_success "Filters endpoint is accessible"
        else
            print_error "Filters endpoint failed"
            return 1
        fi

        # Test homes endpoint with API key
        echo -e "\nEnter your API_KEY (or press Enter to skip authenticated test):"
        read -r -s API_KEY

        if [ -n "$API_KEY" ]; then
            echo -e "\nTesting GET $VERCEL_URL/api/homes?limit=1"
            if curl -s -f -H "x-api-key: $API_KEY" "$VERCEL_URL/api/homes?limit=1" > /dev/null; then
                print_success "Homes endpoint is accessible with API key"
            else
                print_error "Homes endpoint failed (check API key)"
                return 1
            fi
        fi
    fi

    print_success "Phase 2 verification complete!"
}

function verify_phase3_mobile() {
    print_header "Phase 3: Mobile Configuration Verification"

    # Check if eas is installed
    if command -v eas &> /dev/null; then
        print_success "EAS CLI is installed"
    else
        print_error "EAS CLI is not installed"
        print_info "Install with: npm install -g eas-cli"
        return 1
    fi

    # Check if logged in
    if eas whoami &> /dev/null; then
        print_success "Logged in to Expo"
    else
        print_error "Not logged in to Expo"
        print_info "Login with: eas login"
        return 1
    fi

    # Check if eas.json exists
    if [ -f "mobile/eas.json" ]; then
        print_success "mobile/eas.json exists"
    else
        print_error "mobile/eas.json not found"
        print_info "Run: cd mobile && eas build:configure"
        return 1
    fi

    # Check if .env.production exists
    if [ -f "mobile/.env.production" ]; then
        print_success "mobile/.env.production exists"

        # Check if it has required variables
        if grep -q "EXPO_PUBLIC_API_URL=" mobile/.env.production && \
           grep -q "EXPO_PUBLIC_API_KEY=" mobile/.env.production; then
            print_success "Required environment variables are set"
        else
            print_error "Missing required environment variables in mobile/.env.production"
            print_info "Required: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_API_KEY"
            return 1
        fi
    else
        print_error "mobile/.env.production not found"
        print_info "Copy from mobile/.env.production.example and fill in values"
        return 1
    fi

    print_success "Phase 3 verification complete!"
}

function verify_phase4_builds() {
    print_header "Phase 4: Build Verification"

    # Check recent builds
    echo -e "\nRecent EAS builds:"
    eas build:list --limit 5 2>/dev/null || {
        print_error "Could not fetch build list"
        print_info "Check your connection and EAS credentials"
        return 1
    }

    print_info "If builds show 'FINISHED' status, your apps are ready!"
    print_info "Download links are shown in the build list above"
}

function verify_phase5_scraper() {
    print_header "Phase 5: Scraper Verification"

    echo "Which scraper option are you using?"
    echo "1. Local Docker with cloud database"
    echo "2. GitHub Actions"
    read -r -p "Enter choice (1 or 2): " choice

    if [ "$choice" = "1" ]; then
        # Check if docker is running
        if docker ps &> /dev/null; then
            print_success "Docker is running"
        else
            print_error "Docker is not running"
            return 1
        fi

        # Check if scraper container exists
        if docker ps -a | grep -q home_scraper; then
            print_success "Scraper container exists"

            # Check if running
            if docker ps | grep -q home_scraper; then
                print_success "Scraper container is running"
                echo -e "\nRecent logs:"
                docker logs --tail 20 home_scraper
            else
                print_error "Scraper container is not running"
                print_info "Start with: docker compose -f docker-compose.cloud.yml up -d scraper"
            fi
        else
            print_error "Scraper container not found"
            print_info "Start with: docker compose -f docker-compose.cloud.yml up -d scraper"
        fi
    elif [ "$choice" = "2" ]; then
        print_info "Check GitHub Actions status at:"
        print_info "https://github.com/YOUR_USERNAME/home-monitor/actions"
        print_info ""
        print_info "Ensure these secrets are set:"
        print_info "  - DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME"
        print_info "  - EMAIL_FROM, EMAIL_PASS"
    fi
}

function verify_all() {
    print_header "Full Deployment Verification"

    verify_phase1_database || return 1
    verify_phase2_api || return 1
    verify_phase3_mobile || return 1
    verify_phase4_builds || return 1
    verify_phase5_scraper || return 1

    print_header "All Phases Verified Successfully! 🎉"
}

# Main script
case "${1:-all}" in
    phase1)
        verify_phase1_database
        ;;
    phase2)
        verify_phase2_api
        ;;
    phase3)
        verify_phase3_mobile
        ;;
    phase4)
        verify_phase4_builds
        ;;
    phase5)
        verify_phase5_scraper
        ;;
    all)
        verify_all
        ;;
    *)
        echo "Usage: $0 [phase1|phase2|phase3|phase4|phase5|all]"
        echo ""
        echo "Phases:"
        echo "  phase1 - Verify database (PlanetScale)"
        echo "  phase2 - Verify API deployment (Vercel)"
        echo "  phase3 - Verify mobile configuration (EAS)"
        echo "  phase4 - Verify mobile builds"
        echo "  phase5 - Verify scraper setup"
        echo "  all    - Verify all phases (default)"
        exit 1
        ;;
esac
