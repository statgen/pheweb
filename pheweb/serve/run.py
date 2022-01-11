## this is needed before importing request or other network modulse for http communication or else things can spectacularly fail
## dependent on the running environment. https://github.com/gevent/gevent/issues/1009
def run_flask_dev_server(app, args):
    print("Running dev: " + str(args.use_reloader))
    app.run(
        host=args.host, port=args.port,
        debug=True, use_evalex=False,
        use_reloader=args.use_reloader,
    )

def run_gunicorn(app, args):
    import gunicorn.app.base
    print("Running gunicorn")
    class StandaloneGunicornApplication(gunicorn.app.base.BaseApplication):
        # from <http://docs.gunicorn.org/en/stable/custom.html>
        def __init__(self, app, opts=None):
            self.application = app
            self.options = opts or {}
            super().__init__()
        def load_config(self):
            for key, val in self.options.items():
                self.cfg.set(key, val)
        def load(self):
            return self.application

    options = {
        'bind': '{}:{}'.format(args.host, args.port),
        'reload': args.use_reloader,
        'workers': args.num_workers,
        'accesslog': args.accesslog,
        'access_log_format': '%(t)s | %(s)s | %(L)ss | %(m)s %(U)s | resp_len:%(B)s | referrer:"%(f)s" | ip:%(h)s | agent:%(a)s',
        'timeout': 120,
        # docs @ <http://docs.gunicorn.org/en/stable/settings.html#access-log-format>
    }
    sga = StandaloneGunicornApplication(app, options)
    sga.run()

def gunicorn_is_broken():
    #return True
    try:
        import gunicorn.app.base # noqa: F401
    except Exception:
        try:
            import inotify # noqa: F401
        except ImportError:
            raise
        else:
            # `import gunicorn` is failing because `inotify` is installed.
            # see <https://github.com/benoitc/gunicorn/issues/1477>
            print("On python3 gunicorn is incompatible with inotify, so PheWeb will use the less-secure, slower Flask development server while inotify is installed.\n")
            return True
    return False

def print_ip(port):
    ip = get_ip()
    print('If you can open a web browser on this computer (ie, the one running PheWeb), open http://localhost:{} .'.format(port))
    print('')
    print('If not, maybe http://{}:{} will work.'.format(ip, port))
    print("If that link doesn't work, it's either because:")
    print("  - the IP {} is failing to route to this computer (eg, this computer is inside a NAT), or".format(ip))
    print("  - a firewall is blocking port {}.".format(port))
    print("In that case, try port-forwarding.")
    print('')

def get_ip():
    import subprocess
    return subprocess.check_output('dig +short myip.opendns.com @resolver1.opendns.com'.split()).strip().decode('ascii')


def attempt_open(url):
    import os
    import webbrowser
    if 'DISPLAY' not in os.environ:
        print('The DISPLAY variable is not set, so not attempting to open a web browser\n')
        return False
    for name in 'windows-default chrome chromium mozilla firefox opera safari'.split():
        # LATER: prepend `macosx` to this list when <http://bugs.python.org/issue30392> is fixed.
        try:
            b = webbrowser.get(name)
        except Exception:
            pass
        else:
            if b.open(url):
                return True
    return False


def run(argv):

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0', help='the hostname to use to access this server')
    parser.add_argument('--port', type=int, default=5000)
    parser.add_argument('--accesslog', default='-', help='the file to write the access log')
    parser.add_argument('--no-reloader', action='store_false', dest='use_reloader')
    parser.add_argument('--num-workers', type=int, default=8, help='number of worker threads')
    parser.add_argument('--guess-address', action='store_true', help='guess the IP address')
    parser.add_argument('--open', action='store_true', help='try to open a web browser')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')

    args = parser.parse_args(argv)
    if args.open:
        if not attempt_open('http://localhost:{}'.format(args.port)) and not args.guess_address:
            print_ip(args.port)

    if args.host != '0.0.0.0':
        print('http://{}:{}'.format(args.host, args.port))

    if args.guess_address:
        print_ip(args.port)
    from .server import app

    if gunicorn_is_broken() or args.debug :
        run_flask_dev_server(app, args)
    else:
        run_gunicorn(app, args)
