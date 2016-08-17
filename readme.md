# dodido-client
dodido-client is a module used to communicate with the Dodido platform using websockets. The basic flow of using the module is:
1. call a module function
2. listen on the function events

Here is an example for initializing the connection

```js
var SERVER_URL = 'http://dodido.io/server';
var TOKEN = 'some token';
var client = require('dodido-client');
client.connect(SERVER_URL,TOKEN,function(){
	var req = client.request({packages:"test/test1",input:"how are you today"});
}

})

