# Deploying wee to a private subdomain

The site is one page (`dist/wee.html`) plus a rooms API, both served by `tools/server.mjs`
behind a password. Rooms are files in a git repo on the server, committed on every save.
Needs Node 20 or newer, nginx and certbot (all already on the box that runs play.manganacarta.com).

Every step below runs as root on the server, except the DNS record.

## Once

1. **DNS.** Add an A record `wee.manganacarta.com` pointing at the server's IP (same as `play`).
2. **User and code.**
   ```sh
   useradd --system --create-home --home-dir /var/lib/wee wee
   git clone https://github.com/danilovalen/wee.git /opt/wee
   chown -R wee:wee /opt/wee
   sudo -u wee node /opt/wee/tools/build-single.mjs
   ```
   The repo is private: clone with a deploy key or a token the way the engine repo is cloned.
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
5. **nginx and https.**
   ```sh
   cp /opt/wee/deploy/nginx-wee.conf /etc/nginx/sites-available/wee
   ln -s ../sites-available/wee /etc/nginx/sites-enabled/wee
   nginx -t && systemctl reload nginx
   certbot --nginx -d wee.manganacarta.com
   ```
6. Open `https://wee.manganacarta.com`, type the user and password, and save a room. The
   Rooms panel should say "Saved on the server."

## Every update

```sh
/opt/wee/deploy/update.sh
```

## Backups (recommended)

Every save is a commit in `/var/lib/wee/rooms`. To keep a copy off the box, make an empty
private GitHub repo, add it as `origin` there, and push from cron:

```sh
sudo -u wee git -C /var/lib/wee/rooms remote add origin git@github.com:danilovalen/wee-rooms.git
echo '*/30 * * * * wee git -C /var/lib/wee/rooms push -q origin HEAD:main' > /etc/cron.d/wee-rooms
```
