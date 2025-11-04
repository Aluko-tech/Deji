Write-Host "Running Deji API patch..."

# Step 1: Clean npm cache
Write-Host "Cleaning npm cache..."
npm cache clean --force

# Step 2: Remove node_modules and package-lock.json
Write-Host "Removing node_modules and package-lock.json..."
if (Test-Path "node_modules") { Remove-Item -Recurse -Force node_modules }
if (Test-Path "package-lock.json") { Remove-Item -Force package-lock.json }

# Step 3: Reinstall dependencies
Write-Host "Reinstalling dependencies..."
npm install

# Step 4: Prisma setup
Write-Host "Regenerating Prisma client..."
npx prisma generate

Write-Host "Deploying Prisma migrations..."
npx prisma migrate deploy

Write-Host "Backend patch applied successfully!"
