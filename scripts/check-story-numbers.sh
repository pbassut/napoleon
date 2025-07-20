#!/bin/bash
# check-story-numbers.sh
# Script to validate story numbering and detect conflicts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to stories directory
cd "$(dirname "$0")/../docs/stories" || exit 1

echo "Checking for story number conflicts..."

# Find all story files (excluding DOD files and other non-story files)
story_files=$(ls US*.md 2>/dev/null | grep -v '_dod\.md$' | grep -v 'STORY_INDEX\.md' | grep -v 'DOD_FILES_README\.md' || true)

if [ -z "$story_files" ]; then
    echo -e "${YELLOW}Warning: No story files found${NC}"
    exit 0
fi

# Extract story numbers and check for duplicates
duplicates=$(echo "$story_files" | cut -d'_' -f1 | sort | uniq -d)

if [ -n "$duplicates" ]; then
    echo -e "${RED}ERROR: Duplicate story numbers found:${NC}"
    for dup in $duplicates; do
        echo -e "${RED}  $dup:${NC}"
        ls ${dup}_*.md | grep -v '_dod\.md$' | while read -r file; do
            echo "    - $file"
        done
    done
    
    # Check STORY_INDEX for duplicates
    echo -e "\n${YELLOW}Checking STORY_INDEX.md for duplicate entries...${NC}"
    if [ -f "STORY_INDEX.md" ]; then
        dup_in_index=$(grep -E '^\| US[0-9]{3} \|' STORY_INDEX.md | cut -d'|' -f2 | tr -d ' ' | sort | uniq -d || true)
        if [ -n "$dup_in_index" ]; then
            echo -e "${RED}Duplicate entries in STORY_INDEX.md:${NC}"
            for dup in $dup_in_index; do
                echo -e "${RED}  $dup appears multiple times${NC}"
            done
        fi
    fi
    
    exit 1
fi

# Check for missing numbers in sequence
echo -e "${GREEN}✓ No duplicate story numbers in files${NC}"

# Extract all numbers and check sequence
all_numbers=$(echo "$story_files" | cut -d'_' -f1 | sed 's/US//' | sort -n)
first_num=$(echo "$all_numbers" | head -1)
last_num=$(echo "$all_numbers" | tail -1)

echo "Story number range: US$(printf "%03d" $first_num) to US$(printf "%03d" $last_num)"

# Find gaps in numbering
missing=""
for i in $(seq $first_num $last_num); do
    formatted=$(printf "%03d" $i)
    if ! echo "$all_numbers" | grep -q "^$i$"; then
        missing="$missing US$formatted"
    fi
done

if [ -n "$missing" ]; then
    echo -e "${YELLOW}Missing story numbers:${NC}$missing"
fi

# Check for DOD files without main story files
echo -e "\n${YELLOW}Checking for orphaned DOD files...${NC}"
dod_files=$(ls US*_dod.md 2>/dev/null || true)
orphaned=0
for dod in $dod_files; do
    base_name=$(echo "$dod" | sed 's/_dod\.md/.md/')
    if [ ! -f "$base_name" ]; then
        echo -e "${RED}  Orphaned DOD file: $dod (missing $base_name)${NC}"
        orphaned=1
    fi
done

if [ $orphaned -eq 0 ]; then
    echo -e "${GREEN}✓ No orphaned DOD files${NC}"
fi

# Summary
echo -e "\n${GREEN}Story validation complete!${NC}"
echo "Total stories: $(echo "$story_files" | wc -l | tr -d ' ')"
echo "DOD files: $(echo "$dod_files" | wc -l | tr -d ' ')"

# Check if next number is available
next_num=$((last_num + 1))
next_formatted=$(printf "US%03d" $next_num)
echo -e "\nNext available story number: ${GREEN}$next_formatted${NC}"