#!/bin/bash
# Script untuk test generate 20 video bersamaan
# Memanfaatkan script generate.js yang ada di folder captcha-broker

echo "🎬 Mulai test generate 20 video..."
cd /Users/jalal/jennabot/captcha-broker

# Mode T2V (Text-to-Video) dengan 20 request paralel
node generate.js --mode t2v --prompt "a beautiful serene mountain landscape with a flowing river" --total 20
