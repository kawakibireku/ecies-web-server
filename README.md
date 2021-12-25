## ecies-web-server
This is the backend API for project encryption data ESP8266

please look https://github.com/kawakibireku/ecies_esp8266_arduino for details

DB using influx DB

# How To Run

Please don't npm install, just use the node_modules existing because there's some code edited on the library node_modules

Run the program using 

```
node app.js
```

The program will run on port 2500

## LIST API

POST /api/diffiehellman -> for exchange key using diffiehelman method

POST /api/add-data -> receive encrypted data and decrypt it then store to db
