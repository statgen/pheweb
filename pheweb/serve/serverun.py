
def run(argv):

    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0', help='the hostname to use to access this server')
    parser.add_argument('--port', type=int, default=5000, help='an integer for the accumulator')
    args = parser.parse_args(argv)

    from . import server
    server.app.run(
        host=args.host, port=args.port,
        debug=True, use_evalex=False,
        use_reloader=True,
    )
