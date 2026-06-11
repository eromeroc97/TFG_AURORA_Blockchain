#!/bin/bash

URL="https://michigan-frog-julie-reflected.trycloudflare.com/api/telemetry/v1/ingest"
API_KEY="AUR-z1cOc7_xCk5iPRhEqp38kRS4FM5_y7rgdyGBSMVVSnE"

trap 'echo -e "\nDeteniendo simulación..."; exit 0' SIGINT SIGTERM

while true; do
    curl -X POST "$URL" \
        -H "Content-Type: application/json" \
        -H "X-API-Key:$API_KEY" \
        -d @payload.json

    echo "Mensaje enviado $(date)"

    SLEEP_TIME=$(( RANDOM % 360 + 120 ))
    sleep "$SLEEP_TIME" &
    wait $!
done
