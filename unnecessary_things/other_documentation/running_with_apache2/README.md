### Running PheWeb with Apache2

0. Install apache2.

1. Run `pheweb make-wsgi`.

2. Run `gunicorn -b 127.0.0.1:9974 -w4 wsgi` inside of `tmux` or `screen` or with `-D` to run as a daemon.

    - You can use whatever port you want and whatever number of workers (`-w`) you want.

3. Run `a2enmod proxy proxy_http`.

4. Copy `pheweb.conf` into `/etc/apache2/sites-available/`.

    - If you need name-based virtual hosts, add `ServerName foo.example.com` into the virtualhost section.

5. Run `a2ensite pheweb`, which should make a symlink in `/etc/apache2/sites-enabled/`

6. Run `sudo service apache2 restart`.

