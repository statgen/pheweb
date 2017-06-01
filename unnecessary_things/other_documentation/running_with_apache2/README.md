### Running PheWeb with Apache2

1. Install apache2.

2. Run `tmux` or `screen` to get a shell session that won't exit when you close your terminal.

3. Run `pheweb serve --host 127.0.0.1 --port 9974 --num-workers 4 --no-reloader`.

    - This command is equivalent to `gunicorn -b 127.0.0.1:9974 --access-logfile=- -w4 pheweb.serve.server:app`
    - Use whatever port you want and whatever number of workers you want.

3. Run `sudo a2enmod proxy proxy_http`.

4. Copy `pheweb.conf` from this directory into `/etc/apache2/sites-available/`.

    - If you need name-based virtual hosts, add uncomment `ServerName foo.example.com` and use your domain instead.

5. Run `sudo a2ensite pheweb`, which should make a symlink in `/etc/apache2/sites-enabled/`

6. Run `sudo service apache2 restart`.

7. Any time the computer crashes, apache2 should start on its own but you'll need to start tmux and pheweb/gunicorn.
