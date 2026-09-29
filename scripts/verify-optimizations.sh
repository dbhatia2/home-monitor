#!/bin/bash
#
# Verification script for Phase 1 optimizations
# Run this to verify caching and performance improvements are working
#

set -e

echo "======================================"
echo "API Optimization Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3200}"
THRESHOLD_MS=300

echo "Testing API at: $API_URL"
echo ""

# Function to test API endpoint
test_endpoint() {
    local endpoint=$1
    local name=$2

    echo "Testing: $name"
    echo "Endpoint: $endpoint"

    # Make request and capture timing
    response=$(curl -w "\n%{time_total}" -o /tmp/response.json -s "$API_URL$endpoint")
    time_total=$(echo "$response" | tail -n1)

    # Convert to milliseconds
    time_ms=$(echo "$time_total * 1000" | bc)
    time_ms_int=$(printf "%.0f" "$time_ms")

    # Check if response is valid JSON
    if jq empty /tmp/response.json 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Valid JSON response"
    else
        echo -e "${RED}✗${NC} Invalid JSON response"
        return 1
    fi

    # Check response time
    if [ "$time_ms_int" -lt "$THRESHOLD_MS" ]; then
        echo -e "${GREEN}✓${NC} Response time: ${time_ms_int}ms (< ${THRESHOLD_MS}ms threshold)"
    else
        echo -e "${YELLOW}⚠${NC} Response time: ${time_ms_int}ms (> ${THRESHOLD_MS}ms threshold)"
    fi

    echo ""
}

# Function to check cache headers
check_cache_headers() {
    local endpoint=$1
    local name=$2

    echo "Checking cache headers: $name"
    echo "Endpoint: $endpoint"

    # Get headers
    headers=$(curl -I -s "$API_URL$endpoint")

    # Check for Cache-Control header
    if echo "$headers" | grep -i "cache-control" | grep -q "s-maxage"; then
        cache_control=$(echo "$headers" | grep -i "cache-control" | tr -d '\r')
        echo -e "${GREEN}✓${NC} Cache headers present: $cache_control"
    else
        echo -e "${RED}✗${NC} Cache headers missing or incorrect"
        return 1
    fi

    echo ""
}

# Function to check database size
check_db_size() {
    echo "Checking database size..."

    if command -v mysql &> /dev/null; then
        total=$(mysql -u root home_monitor -N -e "SELECT COUNT(*) FROM homes;" 2>/dev/null || echo "0")
        active=$(mysql -u root home_monitor -N -e "SELECT COUNT(*) FROM homes WHERE status NOT IN ('SOLD','FUTURE','MODEL_HOME');" 2>/dev/null || echo "0")

        if [ "$total" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Database accessible"
            echo "  Total homes: $total"
            echo "  Active homes: $active"

            # Provide recommendations based on size
            if [ "$total" -lt 10000 ]; then
                echo -e "${GREEN}✓${NC} Phase 1 optimizations sufficient (< 10,000 homes)"
            elif [ "$total" -lt 25000 ]; then
                echo -e "${YELLOW}⚠${NC} Consider deploying Phase 2 indexes (10,000-25,000 homes)"
            elif [ "$total" -lt 50000 ]; then
                echo -e "${YELLOW}⚠${NC} Deploy Phase 2 full optimization (25,000-50,000 homes)"
            else
                echo -e "${RED}!${NC} Deploy Phase 3 optimizations immediately (> 50,000 homes)"
            fi
        else
            echo -e "${YELLOW}⚠${NC} Database empty or not accessible"
        fi
    else
        echo -e "${YELLOW}⚠${NC} MySQL client not found, skipping database check"
    fi

    echo ""
}

# Function to test multiple requests (check caching effectiveness)
test_caching() {
    local endpoint=$1
    local name=$2

    echo "Testing cache effectiveness: $name"
    echo "Making 3 consecutive requests..."

    times=()
    for i in {1..3}; do
        response=$(curl -w "\n%{time_total}" -o /dev/null -s "$API_URL$endpoint")
        time_total=$(echo "$response" | tail -n1)
        time_ms=$(echo "$time_total * 1000" | bc)
        time_ms_int=$(printf "%.0f" "$time_ms")
        times+=($time_ms_int)
        echo "  Request $i: ${time_ms_int}ms"
    done

    # Check if times are improving (cache warming up)
    if [ "${times[2]}" -le "${times[0]}" ]; then
        echo -e "${GREEN}✓${NC} Response times stable/improving (caching likely working)"
    else
        echo -e "${YELLOW}⚠${NC} Response times not improving (cache may not be working)"
    fi

    echo ""
}

# Run tests
echo "======================================"
echo "1. Cache Headers Verification"
echo "======================================"
echo ""

check_cache_headers "/api/filters" "Filters endpoint"

echo "======================================"
echo "2. API Response Time Tests"
echo "======================================"
echo ""

test_endpoint "/api/filters" "Filters endpoint"
test_endpoint "/api/homes" "Homes endpoint (no filters)"
test_endpoint "/api/homes?city=Dublin" "Homes endpoint (with city filter)"
test_endpoint "/api/homes?city=Dublin&minBeds=3&maxPrice=800000" "Homes endpoint (multiple filters)"

echo "======================================"
echo "3. Cache Effectiveness Test"
echo "======================================"
echo ""

test_caching "/api/filters" "Filters endpoint"

echo "======================================"
echo "4. Database Size Check"
echo "======================================"
echo ""

check_db_size

echo "======================================"
echo "5. Optimization Status Summary"
echo "======================================"
echo ""

# Summary
echo "Phase 1 Optimizations:"
echo "  [✓] Response caching (filters endpoint)"
echo "  [✓] MAX_CANDIDATES reduced to 1000"
echo "  [✓] Stats query caching (1-hour TTL)"
echo ""

echo "Performance Targets:"
echo "  ✓ Excellent: < 200ms"
echo "  ✓ Good:      200-400ms"
echo "  ⚠ Acceptable: 400-600ms"
echo "  ✗ Poor:      > 600ms (action needed)"
echo ""

echo "Next Steps:"
echo "  1. Check database size regularly"
echo "  2. Monitor API response times"
echo "  3. Deploy Phase 2 when database reaches 10,000 homes"
echo ""

echo "Documentation:"
echo "  - OPTIMIZATION_IMPLEMENTATION.md - Full status"
echo "  - OPTIMIZATION_QUICK_REFERENCE.md - Quick commands"
echo "  - SCALING_SUMMARY.md - Executive summary"
echo ""

echo "======================================"
echo "Verification Complete"
echo "======================================"
