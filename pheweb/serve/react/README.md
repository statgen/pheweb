# Quick start

npm install
npm start


## Set up your api

### Local API server
run api server
```
	run_pheweb.py pheweb serve --port 9999 --num-workers=3
```

### ssh port forward
on port 9999

```
	ssh -L9999:localhost:9999 $API_HOST
```

### Point to exist server

edit public/config.js

Set application.root to your rest end point


# Troubleshooting

Error: error:0308010C:digital envelope routines::unsupported

```
export NODE_OPTIONS=--openssl-legacy-provider
```

# Configuration
