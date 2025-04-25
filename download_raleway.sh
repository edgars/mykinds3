#!/bin/bash

# Exit on error
set -e

# Create fonts directory if it doesn't exist
mkdir -p fonts

# Download Raleway font files directly
echo "Downloading Raleway font files..."

# Download Regular variant
echo "Downloading Raleway Regular..."
wget -q -O fonts/Raleway-Regular.ttf "https://fonts.gstatic.com/s/raleway/v28/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCIPrE.woff2"

# Download Bold variant
echo "Downloading Raleway Bold..."
wget -q -O fonts/Raleway-Bold.ttf "https://fonts.gstatic.com/s/raleway/v28/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVs9pbCIPrE.woff2"

# Download Italic variant
echo "Downloading Raleway Italic..."
wget -q -O fonts/Raleway-Italic.ttf "https://fonts.gstatic.com/s/raleway/v28/1Pt_g8zYS_SKggPNyCgSQamb1W0lwk4S4WjMDrMfJg.woff2"

# Download Variable font
echo "Downloading Raleway Variable Font..."
wget -q -O fonts/Raleway-VariableFont_wght.ttf "https://fonts.gstatic.com/s/raleway/v28/1Ptug8zYS_SKggPNyC0ITw.woff2"

echo "Raleway font files have been downloaded to the fonts directory." 