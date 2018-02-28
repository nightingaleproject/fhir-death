Here's how to post a bundle to the server:

```
curl -u client:secret http://localhost:9080/? -H 'Content-Type: application/json' --data-binary @smart-bundle-v2.json
```

And how to delete a resource you want to be rid of:

```
curl -u client:secret -X DELETE http://localhost:9080/Patient/100001
```
