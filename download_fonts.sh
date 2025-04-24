#!/bin/bash

# Create directories
mkdir -p noto-sans/static

# Parse the JSON file to extract URLs and filenames
# Skip the first line (")]}'") which is non-standard JSON
echo "Extracting font URLs from the manifest..."
cat noto-sans.zip | tail -n +2 > noto-sans.json

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq to process JSON."
    echo "On macOS: brew install jq"
    echo "On Linux: apt-get install jq"
    exit 1
fi

# First create the README and OFL files
echo "Creating documentation files..."
jq -r '.manifest.files[] | select(.filename == "README.txt" or .filename == "OFL.txt") | .filename' noto-sans.json | while read -r filename; do
    target_path="noto-sans/$filename"
    echo "Creating $filename..."
    jq -r ".manifest.files[] | select(.filename == \"$filename\") | .contents" noto-sans.json > "$target_path"
done

# Download font files
echo "Downloading font files..."
jq -r '.manifest.fileRefs[] | .filename + "\n" + .url' noto-sans.json | while read -r filename; do
    read -r url
    target_path="noto-sans/$filename"
    echo "Downloading $filename..."
    # Create directory if needed
    mkdir -p "$(dirname "$target_path")"
    # Download the file
    curl -s -o "$target_path" "$url"
done

echo "Download complete. Font files are in the noto-sans directory." 