### Running Pheweb with Apache2

0. Install apache2 and `libapache2-mod-wsgi` (Ubuntu/Debian) or `mod_wsgi` (yum-based).

1. Copy `wsgi.wsgi` somewhere.  I usually put it next to the repository or next to $data_dir.
    - Modify the path in it so it points to your directory.  ie, if you have `/home/watman/projects/pheweb/server.py`, you need the path `/home/watman/projects/pheweb/`.

2. Copy `pheweb.conf` into `/etc/apache2/sites-available/`.

    - Change the servername to what you're actually going to use.  If you're just going to use the IP address, or your server will only have one domain name, you don't need the line with `ServerName`.
    - Modify the path in it to point to `wsgi.wsgi`.
    - Put some email address in it, I'm not sure why.

3. Run `a2ensite pheweb`, which should make a symlink in `/etc/apache2/sites-enabled/`

4. Run `sudo service apache2 restart`.  You can run this command (or the faster `sudo service apache2 reload`) after changing files to update the running copy of the site.

See <http://flask.pocoo.org/docs/0.11/deploying/mod_wsgi/> or email me if you have trouble.
