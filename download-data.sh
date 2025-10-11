#!/bin/bash

# Bombproof USPTO Data Download Script
# Features:
# - Tracks completed downloads in a state file
# - Resumes from where it left off after interruption
# - Validates downloaded files before marking as complete
# - Handles file extraction errors gracefully

--- Configuration and Validation ---

if [ -z "$1" ]; then
    echo "Usage: $0 <YEAR>"
    echo "Example: $0 2023"
    exit 1
fi

YEAR=$1

if [ -z "$USPTO_API_KEY" ]; then
    echo "Error: USPTO_API_KEY environment variable is not set."
    echo "Please set it before running the script: export USPTO_API_KEY='your_key_here'"
    exit 1
fi

# The target directory for our final XML files
DATA_DIR="uspto-data"
mkdir -p "$DATA_DIR"

# State tracking file to track completed downloads
STATE_FILE="${YEAR}.txt"
touch "$STATE_FILE"

# Log file for debugging
LOG_FILE="${YEAR}.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if a file has been completed
is_completed() {
    local filename=$1
    grep -Fxq "$filename" "$STATE_FILE"
}

# Function to mark a file as completed
mark_completed() {
    local filename=$1
    echo "$filename" >> "$STATE_FILE"
}

# Function to validate tar file
validate_tar() {
    local tarfile=$1
    if tar -tzf "$tarfile" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

log "======================================================"
log "Starting USPTO data download for year: $YEAR"
log "State file: $STATE_FILE"
log "======================================================"

# Check for existing partial downloads and resume info
if [ -s "$STATE_FILE" ]; then
    COMPLETED_COUNT=$(wc -l < "$STATE_FILE")
    log "Found existing state file with $COMPLETED_COUNT completed downloads"
    log "Resuming from where we left off..."
fi

--- Main Loop ---

for MONTH in {1..12}; do
    MONTH_FORMATTED=$(printf "%02d" $MONTH)
    START_DATE="$YEAR-$MONTH_FORMATTED-01"
    END_DATE=$(date -d "$START_DATE +1 month -1 day" +%Y-%m-%d)

    log "======================================================"
    log "Fetching file list for: $YEAR-$MONTH_FORMATTED"
    log "Date range: $START_DATE to $END_DATE"
    log "======================================================"

    # Get the list of files for this month
    API_RESPONSE=$(curl -s -X GET \
      "https://api.uspto.gov/api/v1/datasets/products/appdt?fileDataFromDate=$START_DATE&fileDataToDate=$END_DATE&includeFiles=true" \
      -H 'Accept: application/json' \
      -H "x-api-key: $USPTO_API_KEY")

    if [ -z "$API_RESPONSE" ]; then
        log "ERROR: Failed to fetch file list from API for $YEAR-$MONTH_FORMATTED"
        continue
    fi

    # Parse and process each file
    echo "$API_RESPONSE" | jq -r '.bulkDataProductBag[0].productFileBag.fileDataBag[] | select(.fileName | endswith(".tar")) | "\(.fileName) \(.fileDownloadURI)"' | \
    while read -r FILENAME API_URI; do
        if [ -z "$FILENAME" ]; then
            continue
        fi

        # Check if this file was already completed
        if is_completed "$FILENAME"; then
            log "SKIP: $FILENAME (already completed)"
            continue
        fi

        log "----------------------------------------"
        log "Processing: $FILENAME"

        # 1. Download the file (with rate limiting)
        log "Downloading $FILENAME..."
        TEMP_TAR="$DATA_DIR/${FILENAME}.tmp"
        FINAL_TAR="$DATA_DIR/$FILENAME"

        # Respect rate limit: 5 files per 10 seconds = wait 2 seconds between downloads
        sleep 2

        if curl -L -f -o "$TEMP_TAR" -X GET "$API_URI" -H "x-api-key: $USPTO_API_KEY"; then
            log "Download completed: $FILENAME"
        else
            ERROR_CODE=$?
            if [ $ERROR_CODE -eq 22 ]; then
                log "ERROR: HTTP error (possibly 429 rate limit) for $FILENAME. Will retry on next run."
                log "Waiting 10 seconds before continuing..."
                sleep 10
            else
                log "ERROR: Failed to download $FILENAME (curl error $ERROR_CODE). Will retry on next run."
            fi
            rm -f "$TEMP_TAR"
            continue
        fi

        # 2. Validate the downloaded tar file
        log "Validating $FILENAME..."
        if validate_tar "$TEMP_TAR"; then
            mv "$TEMP_TAR" "$FINAL_TAR"
            log "Validation successful: $FILENAME"
        else
            log "ERROR: Corrupt tar file $FILENAME. Will retry on next run."
            rm -f "$TEMP_TAR"
            continue
        fi

        # 3. Extract the archive
        log "Extracting $FILENAME..."
        if tar -xf "$FINAL_TAR" -C "$DATA_DIR/"; then
            log "Extraction successful: $FILENAME"
        else
            log "ERROR: Failed to extract $FILENAME. Will retry on next run."
            rm -f "$FINAL_TAR"
            continue
        fi

        # 4. Clean up the tar file
        log "Cleaning up archive: $FILENAME"
        rm -f "$FINAL_TAR"

        # 5. Mark as completed
        mark_completed "$FILENAME"
        log "COMPLETED: $FILENAME"
    done
done

--- Final Preparation Step ---

log "======================================================"
log "Renaming all .XML files to lowercase .xml..."
RENAMED_COUNT=0
for file in "$DATA_DIR"/*.XML; do
    [ -e "$file" ] || continue
    NEW_NAME="${file%.XML}.xml"
    if [ ! -e "$NEW_NAME" ]; then
        mv -- "$file" "$NEW_NAME"
        ((RENAMED_COUNT++))
    fi
done
log "Renamed $RENAMED_COUNT files to lowercase .xml"
log "======================================================"
log "All data for year $YEAR is downloaded and prepared!"
log "Total completed downloads: $(wc -l < "$STATE_FILE")"
log "Data directory: $DATA_DIR"
log "======================================================"