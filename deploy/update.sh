#!/bin/sh
# Run on the server as root to take the latest wee: pull, build, restart.
set -e
cd /opt/wee
sudo -u wee git pull --ff-only
sudo -u wee node tools/build-single.mjs
systemctl restart wee
sleep 1
systemctl is-active --quiet wee && echo "wee is running" || { journalctl -u wee -n 20 --no-pager; exit 1; }
