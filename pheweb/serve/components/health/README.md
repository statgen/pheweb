# Overview
This component implments a health check.


## Health
The endpoint of the health check is:

/api/health

It returns a json message with the following fields

"is\_okay" : true if everything is okay
"messages": a dictionary containing the name of check and is\_okay and messages of the check

## Metric
The metrics are available at

/api/metrics

It returns metrics in Prometheus format.

# Configuration

## HealthCheck

Below are the configuration options that go in database_conf

### HealthTrivialDAO

HealthTrivialDAO is a safe default that does nothing
```
{ "health" : { "HealthTrivialDAO" : { } } } ,
```
### HealthSimpleDAO

HealthSimpleDAO is an operational health check
```
{ "health" : { "HealthSimpleDAO" : { } } } ,
```
### HealthNotification

HealthNotificationDAO $url to post to

```
{ "health" : { "HealthNotificationDAO" : { "url" : "$url" } } } ,
```

## Metric

These are the configuration options for metrics

IP's to allow collectors from

```
collector_ips = ["127.0.0.1"]
```

Cidr ranges to allow collectors from

```
collector_ips = ["127.0.0.1"]
collector_cidrs = ["0.0.0.0/0"]
```
