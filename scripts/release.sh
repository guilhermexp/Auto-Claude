#!/bin/bash

# ============================================
# Auto Claude Release Script
# ============================================
# Usage: ./scripts/release.sh [patch|minor|major]
#
# This script:
# 1. Switches to main
# 2. Merges develop
# 3. Bumps version
# 4. Updates CHANGELOG.md
# 5. Creates and pushes tag
# 6. Syncs develop back
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version bump type
BUMP_TYPE=${1:-patch}

if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid bump type. Use: patch, minor, or major${NC}"
    exit 1
fi

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Auto Claude Release Script${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${YELLOW}Current version: ${CURRENT_VERSION}${NC}"
echo -e "${YELLOW}Bump type: ${BUMP_TYPE}${NC}"
echo ""

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
    echo -e "${RED}Error: You have uncommitted changes. Please commit or stash first.${NC}"
    git status --short
    exit 1
fi

# Check if we're on develop or main
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: ${CURRENT_BRANCH}${NC}"

# Step 1: Switch to main
echo ""
echo -e "${BLUE}Step 1: Switching to main branch...${NC}"
git checkout main

# Step 2: Merge develop
echo ""
echo -e "${BLUE}Step 2: Merging develop into main...${NC}"
git merge develop --no-edit

# Step 3: Bump version
echo ""
echo -e "${BLUE}Step 3: Bumping version (${BUMP_TYPE})...${NC}"
node scripts/bump-version.js "$BUMP_TYPE"

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: ${NEW_VERSION}${NC}"

# Step 4: Update CHANGELOG.md
echo ""
echo -e "${BLUE}Step 4: Updating CHANGELOG.md...${NC}"
echo ""
echo -e "${YELLOW}Enter release title (or press Enter for default):${NC}"
read -r RELEASE_TITLE
RELEASE_TITLE=${RELEASE_TITLE:-"Release ${NEW_VERSION}"}

# Create changelog entry
CHANGELOG_ENTRY="## ${NEW_VERSION} - ${RELEASE_TITLE}

### ✨ New Features

-

### 🐛 Bug Fixes

-

---

"

# Prepend to CHANGELOG.md
if [ -f "CHANGELOG.md" ]; then
    echo "${CHANGELOG_ENTRY}$(cat CHANGELOG.md)" > CHANGELOG.md
    echo -e "${GREEN}CHANGELOG.md updated with template${NC}"
    echo -e "${YELLOW}Please edit CHANGELOG.md to add your changes, then press Enter to continue...${NC}"
    read -r
else
    echo "${CHANGELOG_ENTRY}" > CHANGELOG.md
fi

# Amend commit with CHANGELOG
git add CHANGELOG.md
git commit --amend --no-edit

# Step 5: Create and push tag
echo ""
echo -e "${BLUE}Step 5: Creating and pushing tag v${NEW_VERSION}...${NC}"
git tag "v${NEW_VERSION}"
git push origin main --force-with-lease
git push origin "v${NEW_VERSION}"

# Step 6: Sync develop
echo ""
echo -e "${BLUE}Step 6: Syncing develop branch...${NC}"
git checkout develop
git merge main --no-edit
git push origin develop

# Done!
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   Release v${NEW_VERSION} created!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Track the build at:"
echo -e "${BLUE}https://github.com/guilhermexp/Auto-Claude/actions${NC}"
echo ""
echo -e "Release will be available at:"
echo -e "${BLUE}https://github.com/guilhermexp/Auto-Claude/releases/tag/v${NEW_VERSION}${NC}"
