#!/bin/sh
set -e
echo "$BOATMANAGER_CONFIG_JSON" > config.json
exec node dist/server.js
