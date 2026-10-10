#!/bin/sh
# Run on your own computer: updates wee.manganacarta.com over SSH (alias manga-vps, or set
# WEE_VPS), which runs deploy/update.sh on the server.
set -e
VPS="${WEE_VPS:-manga-vps}"
echo "updating wee via '$VPS'..."
ssh -t "$VPS" 'sudo /opt/wee/deploy/update.sh'
