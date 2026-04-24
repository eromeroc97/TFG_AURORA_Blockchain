#!/bin/bash

# Configuración
STACK_NAME="red-tfg"
NODES=2
ADMIN_NAME="AURORA-GLOBAL-ADMIN"
NAMESPACE="default"

echo "=== 1. Limpiando entorno anterior ==="
ff stop $STACK_NAME 2>/dev/null
ff remove $STACK_NAME -f 2>/dev/null

echo "=== 2. Inicializando nueva red Fabric ($NODES nodos) ==="
ff init $STACK_NAME $NODES -b fabric

echo "=== 3. Arrancando el stack (esto puede tardar unos minutos) ==="
ff start $STACK_NAME

# Esperar a que los servicios estén listos
echo "Esperando a que la API de FireFly responda..."
until $(curl --output /dev/null --silent --fail http://localhost:5000/api/v1/status); do
    printf '.'
    sleep 5
done
echo " OK!"