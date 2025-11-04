Write-Host "Running Deji Frontend patch..."

# Step 1: Go into frontend folder
if (Test-Path "deji-frontend") {
    Set-Location "deji-frontend"
} else {
    Write-Host "Frontend folder 'deji-frontend' not found. Please ensure this script is in the project root."
    exit
}

# Step 2: Clean npm cache
Write-Host "Cleaning npm cache..."
npm cache clean --force

# Step 3: Remove node_modules and package-lock.json
Write-Host "Removing node_modules and package-lock.json..."
if (Test-Path "node_modules") { Remove-Item -Recurse -Force node_modules }
if (Test-Path "package-lock.json") { Remove-Item -Force package-lock.json }

# Step 4: Reinstall dependencies
Write-Host "Reinstalling dependencies..."
npm install

# Step 5: Build project (optional)
Write-Host "Building project..."
npm run build

# Step 6: Launch Vite dev server
Write-Host "Starting Vite development server..."
npm run dev
