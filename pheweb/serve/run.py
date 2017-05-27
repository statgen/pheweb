
def run_flask_dev_server(app, args):
    ## use flask dev server
    app.run(
        host=args.host, port=args.port,
        debug=True, use_evalex=False,
        use_reloader=args.use_reloader,
    )

def run_gunicorn(app, args):
    import gunicorn.app.base
    # use gunicorn
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
    }
    sga = StandaloneGunicornApplication(app, options)
    # for skey,sval in sorted(sga.cfg.settings.items()):
    #     cli_args = sval.cli and ' '.join(sval.cli) or ''
    #     val = str(sval.value)
    #     print(f'cfg.{skey:25} {cli_args:28} {val}')
    #     if sval.value != sval.default:
    #         print(f'             default: {str(sval.default)}')
    #         print(f'             short: {sval.short}')
    #         print(f'             desc: <<\n{sval.desc}\n>>')
    sga.run()

def gunicorn_is_broken():
    try:
        import gunicorn.app.base
    except:
        try:
            import inotify
        except ImportError:
            raise
        else:
            # `import gunicorn` is failing because `inotify` is installed.
            # see <https://github.com/benoitc/gunicorn/issues/1477>
            print("On python3 gunicorn is incompatible with inotify, so PheWeb will use the less-secure, slower Flask development server while inotify is installed.\n")
            return True
    return False


def run(argv):

    from .server import app

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0', help='the hostname to use to access this server')
    parser.add_argument('--port', type=int, default=5000, help='an integer for the accumulator')
    parser.add_argument('--no-reloader', action='store_false', dest='use_reloader')
    parser.add_argument('--num-workers', type=int, default=4, help='number of worker threads')
    args = parser.parse_args(argv)

    if gunicorn_is_broken():
        run_flask_dev_server(app, args)
    else:
        run_gunicorn(app, args)
