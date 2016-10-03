### Running Pheweb with Apache2

0. Install apache2 and `libapache2-mod-wsgi` (Ubuntu/Debian) or `mod_wsgi` (yum-based).
1. Copy `wsgi.wsgi` somewhere and modify the path in it.  (I usually put it next to the repository)
2. Copy `000-default.conf` into `/etc/apache2/sites-enabled/`, or maybe append it if that file already exists.  Modify the paths in it as needed.  Maybe use a different name or make it a symlink to `sites-available` or whatever.
3. Run `sudo service apache2 restart`.
4. See <http://flask.pocoo.org/docs/0.11/deploying/mod_wsgi/> if this doesn't work.
