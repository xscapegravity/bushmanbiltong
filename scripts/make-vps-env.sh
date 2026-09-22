#!/bin/sh
# Creates the Bushman Biltong env file on the VPS with a strong random SESSION_SECRET.
# Run this in the Hostinger panel browser terminal (or any root shell on the VPS).
set -e
mkdir -p /docker/bushmanbiltong
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null \
  || openssl rand -hex 32)

cat > /docker/bushmanbiltong/.env <<EOF
NEXT_PUBLIC_SITE_URL=https://bushmanbiltong.xscapebot.tech
SESSION_SECRET=${SECRET}
SESSION_TTL_DAYS=7
BUSINESS_NAME=Bushman Biltong
PICKUP_ENABLED=true
PICKUP_INSTRUCTIONS=Pickup details will be confirmed by phone or email after your order is received.
DELIVERY_ENABLED=true
DELIVERY_FEE_CENTS=0
FREE_DELIVERY_THRESHOLD_CENTS=0
DELIVERY_MIN_ORDER_CENTS=0
EOF

chmod 600 /docker/bushmanbiltong/.env
echo "OK: .env written with random SESSION_SECRET (64 hex chars)"
