#!/bin/bash

# Configuración
URL="http://localhost/api/telemetry/v1/ingest"
API_KEY="AUR-z1cOc7_xCk5iPRhEqp38kRS4FM5_y7rgdyGBSMVVSnE"
JSON_FILE="services/iot-manager/test-json/01-test.json"
REPETICIONES=100
TIMES_FILE="latencies.csv"
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

# Comprobar que el archivo JSON existe
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: Archivo JSON no encontrado en $JSON_FILE"
    exit 1
fi

# Encabezado del archivo de resultados
echo "Iteracion,Latencia_ms" > "$TIMES_FILE"

echo "Enviando $REPETICIONES peticiones concurrentes a $URL ..."

# Lanzar todas las peticiones en paralelo
for i in $(seq 1 "$REPETICIONES"); do
    (
        # curl -w "%{time_total}" da el tiempo total en segundos con precision de microsegundos
        t=$(curl -s -o /dev/null -w "%{time_total}" \
            -X POST "$URL" \
            -H "x-api-key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d @"$JSON_FILE" 2>/dev/null)

        # Convertir a milisegundos (time_total viene en segundos, ej: 1.234567)
        ms=$(echo "$t * 1000" | bc 2>/dev/null || echo "$t" | awk '{printf "%.3f", $1 * 1000}')

        # Cada proceso escribe su resultado en un archivo temporal independiente
        # para evitar condiciones de carrera al escribir en el archivo compartido
        printf "%d,%s\n" "$i" "$ms" > "$TMP_DIR/$i"
    ) &
done

# Esperar a que todas las peticiones terminen
wait

# Recolectar resultados ordenados por iteracion
for f in "$TMP_DIR"/*; do
    sort -t, -k1,1n "$f" >> "$TIMES_FILE"
done

echo "Mediciones completadas. Resultados guardados en $TIMES_FILE"
