## Hosting a pheweb and accessing it from your browser

Run `pheweb serve --open`.  That command should either open a browser to your new PheWeb, or it should give you a URL that you can open in your browser to access your new PheWeb.  If it doesn't, follow the directions for [hosting a PheWeb and accessing it from your browser](etc/detailed-webserver-instructions.md).

- If port 5000 is already taken, choose a different port (for example, 5432) and run `pheweb serve --port 5432` instead.

- If the server works but you can't open it in a web browser, you have two options:

  1. Run PheWeb on the open internet.

     You need a port that can get through your firewall. 80 or 5000 probably work.
     
     - To use port 80 you'll need root permissions, so run something like  `sudo $(which python3) $(which pheweb) serve --port 80`.

     Then run `pheweb serve --guess-address` and open the two URLs it provides.

  2. Run PheWeb with the default settings, then use an SSH tunnel to connect to it from your computer.

     For example, if you normally ssh in with `ssh watman@x.example.com`, then the command you should run (on the computer you're sitting at) is `ssh -N -L localhost:5000:localhost:5000 watman@x.example.com`.

     Then open <http://localhost:5000> in your web browser.  It should connect straight to port 5000 on the server through your ssh server, allowing you to access your PheWeb.



## Using Apache2 or Nginx

At this point your PheWeb should be working how you want it to, except maybe the URL you're using.

`pheweb serve` already uses gunicorn. For maximum speed and safety, you should run gunicorn routed through a reverse proxy like Apache2 or Nginx. If you choose Apache2, I have some documentation [here](etc/detailed-apache2-instructions/README.md).
