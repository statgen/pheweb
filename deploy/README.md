# Upgrading

  For results,r6,r5,staging use helm
```
helm upgrade -f r6_values.yaml pheweb . # r6
helm upgrade -f r5_values.yaml pheweb . # r5
helm upgrade -f results_values.yaml pheweb . # results
helm upgrade -f staging_values.yaml  pheweb . # starging
```

 For r1,r2,r3,r4 use kubectl
