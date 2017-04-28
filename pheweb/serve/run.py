
def run(argv):

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0', help='the hostname to use to access this server')
    parser.add_argument('--port', type=int, default=5000, help='an integer for the accumulator')
    parser.add_argument('--no-reloader', action='store_false', dest='use_reloader')
    args = parser.parse_args(argv)

    from .server import app
    app.run(
        host=args.host, port=args.port,
        debug=True, use_evalex=False,
        use_reloader=args.use_reloader,
    )
