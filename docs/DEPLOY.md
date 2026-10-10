# Deploying wee to a private subdomain

The site is one page (`dist/wee.html`) plus a rooms API, both served by `tools/server.mjs`
behind a password. Rooms are files in a git repo on the server, committed on every save.
Needs Node 20 or newer and Caddy, both already on the box that runs play.manganacarta.com.

Every step below runs as root on the server, except the DNS record. Log in with the SSH
shortcut the engine's deploy already uses: `ssh manga-vps` (SSH is not on port 22).

## Once

1. **DNS.** Add an A record `wee.manganacarta.com` pointing at the server's IP (same as `play`).
2. **User and code.**
   ```sh
   useradd --system --create-home --home-dir /var/lib/wee wee
   git clone https://github.com/danilovalen/wee.git /opt/wee
   chown -R wee:wee /opt/wee
   cd /opt/wee && sudo -u wee node tools/build-single.mjs
   ```
   The code repo is public, so no key is needed. Your rooms never go in it: they live in
   `/var/lib/wee/rooms` on the server.
3. **Password.**
   ```sh
   cp /opt/wee/deploy/wee.env.example /etc/wee.env
   chmod 600 /etc/wee.env
   nano /etc/wee.env          # set WEE_PASSWORD (and WEE_USER if you like)
   ```
4. **Service.**
   ```sh
   cp /opt/wee/deploy/wee.service /etc/systemd/system/
   systemctl daemon-reload && systemctl enable --now wee
   curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8040/   # 401 means it runs and wants the password
   ```
5. **Caddy and https.** Caddy already serves play.manganacarta.com and gets certificates
   by itself, so wee only needs its block added:
   ```sh
   cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
   cat /opt/wee/deploy/Caddyfile-wee >> /etc/caddy/Caddyfile
   caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
   ```
   The DNS record must already point at the server, or the certificate request fails; Caddy
   retries by itself once it does. (`deploy/nginx-wee.conf` is for a box that uses nginx.)
6. Open `https://wee.manganacarta.com`, type the user and password, and save a room. The
   Rooms panel should say "Saved on the server."

## Every update

From your own computer, in your local copy:

```sh
./deploy/update-live.sh
```

It logs in through the `manga-vps` SSH alias and runs `/opt/wee/deploy/update.sh` on the
server (pull, build, restart). Already logged in to the server, run that script directly.

## Backups (recommended)

Every save is a commit in `/var/lib/wee/rooms`. To keep a copy off the box, make an empty
private GitHub repo, add it as `origin` there, and push from cron:

```sh
sudo -u wee git -C /var/lib/wee/rooms remote add origin git@github.com:danilovalen/wee-rooms.git
echo '*/30 * * * * wee git -C /var/lib/wee/rooms push -q origin HEAD:main' > /etc/cron.d/wee-rooms
```
