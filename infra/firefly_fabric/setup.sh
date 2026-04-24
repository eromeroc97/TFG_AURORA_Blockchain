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
ff init $STACK_NAME $NODES -b fabric --prompt=false

echo "=== 3. Arrancando el stack (esto puede tardar unos minutos) ==="
ff start $STACK_NAME

# Esperar a que los servicios estén listos
echo "Esperando a que la API de FireFly responda..."
until $(curl --output /dev/null --silent --head --fail http://localhost:5000/api/v1/namespaces/$NAMESPACE/status); do
    printf '.'
    sleep 5
done
echo " OK!"

echo "=== 4. Obteniendo Verifier Key del Nodo 0 ==="
# Extraemos la clave criptográfica X.509 de la organización
ORG_KEY=$(curl -s http://localhost:5000/api/v1/namespaces/$NAMESPACE/status | grep -oP '(?<="value":")[^"]*' | head -n 1)

if [ -z "$ORG_KEY" ]; then
    echo "Error: No se pudo obtener la clave del nodo."
    exit 1
fi
echo "Key detectada: $ORG_KEY"

echo "=== 5. Reclamando Identidad Raíz ($ADMIN_NAME) ==="
# Este comando es el que ancla la identidad al namespace y a la clave del nodo
ff identity claim $STACK_NAME $ADMIN_NAME --key "$ORG_KEY" --namespace $NAMESPACE

echo "=== 6. Verificando indexación local ==="
sleep 5
CHECK=$(curl -s "http://localhost:5000/api/v1/namespaces/$NAMESPACE/identities?name=$ADMIN_NAME")

if [[ $CHECK == *"$ADMIN_NAME"* ]]; then
    echo "=========================================================="
    echo "¡ÉXITO! Red desplegada e identidad raíz lista."
    echo "Identidad: $ADMIN_NAME"
    echo "Namespace: $NAMESPACE"
    echo "Ya puedes ejecutar el seed de tu base de datos."
    echo "=========================================================="
else
    echo "Advertencia: La identidad se ha enviado pero el indexador aún no la muestra."
    echo "Espera unos segundos y verifica con: ff identity list $STACK_NAME"
fi