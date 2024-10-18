#!/bin/bash

# Set Firebase configuration
echo "FIREBASE_API_KEY=${{ secrets.FIREBASE_API_KEY }}" >> config/_default/params.toml
echo "FIREBASE_AUTH_DOMAIN=${{ secrets.FIREBASE_AUTH_DOMAIN }}" >> config/_default/params.toml
echo "FIREBASE_PROJECT_ID=${{ secrets.FIREBASE_PROJECT_ID }}" >> config/_default/params.toml
echo "FIREBASE_STORAGE_BUCKET=${{ secrets.FIREBASE_STORAGE_BUCKET }}" >> config/_default/params.toml
echo "FIREBASE_MESSAGING_SENDER_ID=${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}" >> config/_default/params.toml
echo "FIREBASE_APP_ID=${{ secrets.FIREBASE_APP_ID }}" >> config/_default/params.toml
echo "FIREBASE_MEASUREMENT_ID=${{ secrets.FIREBASE_MEASUREMENT_ID }}" >> config/_default/params.toml

# Build the Hugo site
hugo
