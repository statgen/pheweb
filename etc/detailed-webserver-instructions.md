## Hosting a pheweb and accessing it from your browser

Run `pheweb serve --open`.  That command should either open a web browser showing your PheWeb, or it should give you a URL that you can open in your web browser.  If that doesn't work, try these:

- If pheweb's output says that port 5000 is already taken, run `pheweb serve --open --port=5001` instead.  Or try some other port.

- If `pheweb serve` is running fine, but you can't open it in a web browser, you have two options:

  1. Option 1: Serve PheWeb on port 80.

     You need a port that can get through your firewall.  80 or 443 probably work.

     To use port 80 or 443 you'll need root permissions.  Run  `sudo $(which python3) $(which pheweb) serve --open --port=80`.
     Then open the URLs that they suggest.

  3. Option 2: Run PheWeb with the default settings, then connect an SSH tunnel between your computer and your server.

     Here's how to do that if your laptop runs Mac or Linux:

     Suppose you normally ssh in with `ssh me@example.com`.  Instead, run `ssh -N -L localhost:5000:localhost:5000 me@example.com`.
     Then open <http://localhost:5000> in your web browser.

     Sometimes MacOS itself uses port 5000, so I usually use port 8000.



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
       '@umich.edu',  # Allows any email @umich.edu
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
To make PheWeb use less space, you can delete some of the files created during the loading process.

Files in `generated-by-pheweb/parsed/` are only needed for re-buiding the site with more GWAS.  You can replace those files with symlinks to the files in `pheno_gz/`.

Files in `generated-by-pheweb/tmp/` can also be removed.

This should work:

```bash
cd generated-by-pheweb/parsed/
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

You can also override any template found in [pheweb/serve/templates](https://github.com/statgen/pheweb/tree/master/pheweb/serve/templates).  It'll work best if you copy the original version and modify it.  If you update Pheweb after overriding entire pages like this, those pages might be broken.  The templating language is Jinja2 and you can see what variables are available by looking at `route`s with `render_template` in [pheweb/serve/server.py](https://github.com/statgen/pheweb/tree/master/pheweb/serve/server.py).
