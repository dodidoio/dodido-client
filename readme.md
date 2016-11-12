# dodido-client
dodido-client is a module used to communicate with the Dodido platform using websockets. The dodido platform is used to execute bots developed using the human-computer dictionary. For an overview of the human-computer dictionary look [here](https://github.com/dodidoio/hucomdic/wiki/Overview). 

Here is an example for initializing the connection and sending a simple request:

```javascript
const SERVER_URL = 'wss://assist.dodido.io';
const TOKEN = 'some token';
const CID = 'conversation id';
var client = require('dodido-client');
client.connect(SERVER_URL,TOKEN).then(()=>{
	client.request("how are you",CID)
		.on('say',(text)=>{
			console.log(text);
		}).on('error',(err)=>{
			console.error(err);
		});
});
```

## Initializing a connection
Connecting to the server is done using the connect function:

```javascript
const SERVER_URL = 'wss://assist.dodido.io';
const TOKEN = 'some token';
var client = require('dodido-client');
client.connect(SERVER_URL,TOKEN)
```
The dodido-client module only supports a single connection to the server so a subsequent call to connect will replace existing connection. All API calls return promises. The request call takes the URL of the dodido server (typically wss://assist.dodido.io). The token is the user token for connecting to the server. It can be found in file .dodido.json that is generated after initializing a Human-Computer dictionary environment using the [hucomdic utility](https://github.com/dodidoio/hucomdic).

## API Calls
After connecting to the server, requests can be sent to the server using the `request` function. The return value is a promise and an event emiter. Event listeners can be chained as follows:

```javascript
client.request("how are you",CID)
		.on('say',(text)=>{
			console.log(text);
		}).on('error',(err)=>{
			console.error(err);
		});
```

The other API functions work in a similar way. Each call has its related events. For example, the following code saves a file on the dodido server. The file can later be referenced by the dictionary entries.

```javascript
const fs = require('fs');
const text = fs.readFileSync('path-to-file','base64');
client.saveFile('path-to-file',text)
	.on('error',(err)=>{
		console.error(err);
	});
```

## API Reference
The API reference can be found [here](https://github.com/dodidoio/hucomdic/wiki/dodido-client-api). Each API call is listed with the events it may emit.

## Contribute
Please suggest enahcements and bug fixes using pull requests.

## License
Mozilla Public License, version 2.0
