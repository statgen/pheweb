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

`pheweb serve` already uses gunicorn. For maximum speed and safety, you should run gunicorn routed through a reverse proxy like Apache2 or Nginx. If you choose Apache2, I have some documentation [here](detailed-apache2-instructions/README.md).



## Using OAuth

1. Make your own random `SECRET_KEY` for flask.

   ```bash
   $ python3 -c 'import os; print(os.urandom(24))'
   b'(\x1e\xe5IY\xe4\xdc\x00s\xc6z\xf8\x9b\xf3\x99Miw\x9dct\xdf}\xeb'
   ```

   In `config.py` in your pheweb directory, set

   ```python
   SECRET_KEY = '(\x1e\xe5IY\xe4\xdc\x00s\xc6z\xf8\x9b\xf3\x99Miw\x9dct\xdf}\xeb'
   ```

2. Set up OAuth with Google.

   Go [here](https://console.developers.google.com/apis/credentials) to create a project.
   In the list "Authorized redirect URIs" add your OAuth callback URL, which should look like `http://example.com/callback/google` or `http://example.com:5000/callback/google`.

   In `config.py`, set:

   ```python
   login = {
     'GOOGLE_LOGIN_CLIENT_ID': 'something-something.apps.googleusercontent.com',
     'GOOGLE_LOGIN_CLIENT_SECRET': 'letters-letters',
     'whitelist': [
       'user1@example.com',
       'user2@example.com',
       'user3@gmail.com',
     ]
   }
   ```

   The correct values of `GOOGLE_LOGIN_CLIENT_ID` and `GOOGLE_LOGIN_CLIENT_SECRET` are at the top of the Google project page.  The whitelist can contain any email addresses connected to Google accounts.



## Using Google Analytics

Go [here](https://analytics.google.com/analytics/web) and do whatever you have to to get your own UA-xxxxxxxx-x tracking id.

Then, in `config.py`, set:

```
GOOGLE_ANALYTICS_TRACKING_ID = 'UA-xxxxxxxx-x'
```

and kill and restart `pheweb serve`.

If you visit your site, you should see the activity at [the Google Analytics web console](https://analytics.google.com/analytics/web).


## Reducing storage use
To make PheWeb use less space, you can delete many of the files created during the loading process.
Inside of `generated-by-pheweb/`, `parsed/` is only needed for re-buiding the site with more GWAS, and `pheno/` is only needed if you have enabled summary stat downloads.

Alternatively, you can replace those files with symlinks to the files in `pheno_gz/`.
Internally, pheweb always checks if a file is gzipped before reading it, so that won't be a problem (though reading gzipped files takes time when re-loading data).
Just replace all the files in `parsed/` and `pheno/` with symlinks to their corresponding files in `pheno_gz/`.
This should work:

```bash
cd generated-by-pheweb/pheno/
for f in *; do
  ln -sf ../pheno_gz/$f.gz $f
done

cd ../parsed/
for f in *; do
  ln -sf ../pheno_gz/$f.gz $f
done

cd ..
rm tmp/*
```

## Customizing page contents
To modify the contents of the About page and others, create a directory named `custom_templates` next to `generated-by-pheweb`.

Here are some templates that are intended to be modified:

- `custom_templates/about/content.html`: contents of the about page
- `custom_templates/index/h1.html`: large title above the search bar on the homepage
-  `custom_templates/index/below-h1.html`: subtext above the search bar on the homepage
- `custom_templates/index/below-query.html`: beneath the search bar on the homepage
- `custom_templates/pheno/h1.html`: the large text at the top of the phenotype (Manhattan Plot) page
- `custom_templates/region/h1.html`: the large text at the top of the region (LocusZoom Region Plot) page
- `custom_templates/title.html`: the title of the window, usually shown in the tab bar

You can also override any template found in [pheweb/serve/templates](https://github.com/statgen/pheweb/tree/master/pheweb/serve/templates).  It'll work best if you copy the original version and modify it.  If you update Pheweb after overriding entire pages like this, those pages might be broken.
