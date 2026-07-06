#!/usr/bin/env bash
# Generate a local RS256 keypair for JWT signing (development only).
# Production keys come from the secret manager — never use these in prod.
set -euo pipefail

KEYS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/keys"
PRIVATE="$KEYS_DIR/jwt_private.pem"
PUBLIC="$KEYS_DIR/jwt_public.pem"

if [[ -f "$PRIVATE" ]]; then
  echo "Key already exists at $PRIVATE — refusing to overwrite. Delete it first if you really mean to."
  exit 0
fi

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$PRIVATE"
openssl rsa -in "$PRIVATE" -pubout -out "$PUBLIC"
chmod 600 "$PRIVATE"

echo "Generated:"
echo "  $PRIVATE"
echo "  $PUBLIC"
