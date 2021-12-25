var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var eccrypto = require('eccrypto');
var ecies = require('standard-ecies');
var crypto = require('crypto');
var ivuse;
var Influx = require('influx');
const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'db_sensor',
    schema: [
      {
        measurement: 'temperature',
        fields: { temperature: Influx.FieldType.FLOAT, humidity: Influx.FieldType.FLOAT, heatindex: Influx.FieldType.FLOAT },
        tags: ['unit']
      }
    ]
  });

var iv;
var publicKeyClientuse;
var sharedKeyuse;
var options = {
    hashName: 'sha256',
    hashLength: 32,
    macName: 'sha256',
    macLength: 32,
    curveName: 'secp256k1',
    symmetricCypherName: 'aes-128-cbc',
    iv: null, // iv is used in symmetric cipher, set null if cipher is in ECB mode. 
    keyFormat: 'uncompressed',
    s1: null, // optional shared information1
    s2: null // optional shared information2
}
var ecdh = crypto.createECDH(options.curveName);

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;

var router = express.Router();

router.get('/', function(req, res){
    res.json({message : "Horray"});
});

router.post('/diffiehellman',function(req,res){
   ecdh.generateKeys();

   var publicKeyServer = ecdh.getPublicKey();
   var publicKey = publicKeyServer.slice(1);
   var publicKeyClient = req.body['pk'];
   iv = req.body['iv'];
   console.log('iv',iv);
   ivuse = new Buffer.from(iv,'base64');
   options.iv = iv;
   publicKeyClientuse = new Buffer.from(publicKeyClient,'base64');
   eccrypto.derive(ecdh.getPrivateKey(),publicKeyClientuse).then(function(sharedKey){
       console.log(sharedKey.toString('base64'));
       sharedKeyuse = sharedKey;
   });
   console.log(publicKeyServer);
   console.log(publicKey);

   console.log(publicKeyClient);

   res.send(publicKey.toString('base64'))
});

router.post('/add-data',function(req,res){
    console.log("awe");
    var value = req.body['value'];
    console.log(value);
    var cipherText = new Buffer.from(value,'base64');
    var decryptedText = ecies.decrypt(ecdh,cipherText,options,sharedKeyuse);
    console.log("DECRYPTED: ",decryptedText);
    var valuejson = JSON.parse(decryptedText);
    console.log(valuejson.Temperature);
    console.log(valuejson.Humidity);
    console.log(valuejson.HeatIndex);
    console.log(valuejson.sensorType);
    influx.getDatabaseNames()
    .then(names => {
        if (!names.includes('db_sensor')) {
        return influx.createDatabase('db_sensor');
        }
    })
    .then(() => {
        influx.writePoints([
            {
              measurement: 'temperature',
              tags: {
                unit: valuejson.sensorType
              },
              fields: { temperature: valuejson.Temperature, humidity: valuejson.Humidity, heatindex: valuejson.HeatIndex }
            }
          ], {
            database: 'db_sensor',
            precision: 's',
          })
          .catch(error => {
            console.error(`Error saving data to InfluxDB! ${err.stack}`)
          });
    })
    .catch(error => console.log({ error }));
});
app.use('/api', router);
app.listen(port);
console.log("Magic happens on port", + port);