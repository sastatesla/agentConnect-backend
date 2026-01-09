#!/bin/bash

# Configuration
IMAGE_NAME="backend-test"
CONTAINER_NAME="backend-test-container"
PORT=5000

echo "------------------------------------------------"
echo "🔍 Starting Docker Verification"
echo "------------------------------------------------"

# 1. Build the Image
echo "1️⃣  Building Docker Image..."
docker build -t $IMAGE_NAME .

if [ $? -ne 0 ]; then
    echo "❌ Docker Build Failed!"
    exit 1
fi
echo "✅ Docker Build Successful."

# 2. Cleanup previous runs
echo "2️⃣  Cleaning up old containers..."
docker stop $CONTAINER_NAME 2>/dev/null
docker rm $CONTAINER_NAME 2>/dev/null

# 3. Run the Container
echo "3️⃣  Running Container ($IMAGE_NAME)..."
# We assume .env exists in the parent directory or current directory
if [ -f .env ]; then
    ENV_FILE_OPT="--env-file .env"
    echo "   Using .env file."
else
    ENV_FILE_OPT=""
    echo "   ⚠️ .env file not found, running without env file."
fi

docker run -d --name $CONTAINER_NAME -p $PORT:5000 $ENV_FILE_OPT $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo "❌ Failed to start container!"
    exit 1
fi

echo "   Waiting 5 seconds for server to start..."
sleep 5

# 4. Check Container Logs (brief)
echo "   Container Logs (Last 5 lines):"
docker logs --tail 5 $CONTAINER_NAME

# 5. Test the Endpoint
echo "4️⃣  Testing Root Endpoint (http://localhost:$PORT)..."
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" http://localhost:$PORT/)

if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "404" ] || [ "$HTTP_STATUS" == "401" ]; then
    # Accepting 404/401 too as it means the server is UP and responding, just maybe path issues which is fine for infrastructure test
     echo "✅ Server responded with HTTP $HTTP_STATUS"
else
     echo "❌ Server check failed. Expected 200/40x, got $HTTP_STATUS"
fi

# 6. Test Maps Endpoint
echo "5️⃣  Testing Maps Autocomplete Endpoint..."
MAPS_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "http://localhost:$PORT/api/maps/places/autocomplete?input=test")
echo "   Maps API Response Code: $MAPS_STATUS"


# 7. Cleanup
echo "------------------------------------------------"
echo "🧹 Stopping and removing test container..."
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME
echo "✨ Verification Complete!"
