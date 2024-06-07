#!/bin/bash

if type docker >/dev/null 2>&1; then
    echo ""
else
    echo "Docker is not installed."
    echo "https://docs.docker.com/engine/install/"
    exit 1
fi

docker build -t n8n-custom .

echo "Optimization Done!"
echo ""
echo "It's now time to push your Images ;)"

## Docker Slim was minimizing just 7MB, so it's not being used now
