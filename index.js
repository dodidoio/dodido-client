//dodido client

/* jshint node:true */
const _ = require('underscore');
const EventEmitter = require('events');
//const EventEmitter = require('promise-events');

var socket = null;
var frames = {};
var gurl = null;
var frameid = 0;

/** 
* dodido-client enables clients to connect with the Dodido server. It can be used to upload dictionary files and
* bot files to the server or to handle user requests using the Dodido platform.
* @module dodido-client 
*/

/**
 * Connect to the Dodido server
 * @param   {string}  url   the server url (e.g. wss://assist.dodido.io)
 * @param   {string}  token the token used to access the server. It is possible to connect without a token
 *                          but a {@link signin} is required before performing any actions
 * @returns {Promise} a promise resolved when the connection is successfule. The promise is rejected if the connection
 *                    fails with an error message
 * @fires opened
 * @fires closed
 */
function connect(url,token){
	var ret = new Promise(function(resolve,reject){
		gurl = token? url+ "?key="+token : url;
		socket = require('engine.io-client')(gurl);
		socket.on('error',function(err){
			if(err.description === 503){
				reject('Error connecting to the server - ensure url is correct');
				return;
			}
			reject(err);
		});
		socket.on('open', function(){
			socket.on('message', function(data){
				reportMessage(data);
			});
			socket.on('disconnect', function(){
				socket = null;
				ret.emit('closed');
				});
			socket.on('close', function(had_error){
				socket = null;
				ret.emit('closed');
			});
			socket.on('error', function(err){
				socket = null;
				ret.emit('closed');
			});
			socket.on('timeout', function(err){
				socket = null;
				ret.emit('closed');
			});
			setImmediate(function(){ret.emit('opened');});
			resolve();
		});
	});
	_.extend(ret,EventEmitter.prototype);
	return ret;
}

/**
 * Signin to the server after connecting without a token. This function connects to the server with specified userid
 * and emits a token that can be used in subsequent calls.
 * @param   {string}  username the user name
 * @param   {string}  pswd     the user password
 * @returns {Promise} an event emitter promise
 * @fires token 
 */
function signin(username,pswd){
	return dispatch('sign in userid [] pswd []',[username,pswd]);
}

/**
 * Pass a text request from the user to the Dodido server. The server parses the request and translates
 * it into an intermediary format that can be converted into a computer program. If only one request
 * interpretaion exists, it executes it. Otherwise, it fires an {@link event:options} event with the possible interpretations. The
 * bot communicates with the user by emitting events that should be handled by the API user.
 * @param   {Object}  input           an object containing request data
 * @param   {string}  input.input     the request text or an array of possible request text. The array option can
 *                                    be used with voice input when there are several possible transcripts. The
 *                                    text element in the array gets precedence over the rest.
 * @param   {string}  input.expecting the expected parse type. By default this is 'action' - meaning an action the bot 
 *                                  should take in response to a request. 
 * @param   {Array}   input.packages  an array of package names to use when processing the request. The parser looks
 *                                  for definitions contained in these packages
 * @param   {string}  input.token     iptional  dodido token - this is required when using user entities - data stored
 *                                    on the server. Data is stored on the token owner account
 * @param   {string}  input.userid    userid of the request. A single token owner may manage many userids. Each userid
 *                                    has its own data space. If * is specified as userid, the requests uses the token
 *                                    owner data space, shared among all users.
 * @param   {string}  cid             conversation id - this is a string id used to keep context of the 
 *                                  conversation. It should be unique per userid. If a single userid manages several
 *                                  bots, the cid should be prefixed with the full name of the bot
 * @param   {boolean} isParsed        true if the request text is  a parsed request returned in the options transcript.
 *                                  For regular text requests, this should be false. If the request is parsed, the 
 *                                  request function bypasses the parser and executes the request immediately. The
 *                                  parsed format is a text string containing the binding of the request 
 *                                  interpretation to javascript code 
 * @param   {Object}  context         The context of the request. Each property name is a name of a context object that
 *                                  may be used by the bot code. This should include data such as userid and other
 *                                  data that may be needed by the bot code.
 * @returns {Promise} an event emitter promise
 * @fires say
 * @fires options
 * @fires ask
 * @fires show
 * @fires log
 * @fires progress
 * @fires error
 * @fires fail
 * @fires upload
 * @example
 * var client = require('dodido-client');
 * client.connect('wss://assist.dodido.io','some-token').then(()=>{
 * 	return request({input:'hello world'},'some-conversation-id',false,{userid:'the userid'})
 * 	.on('say',(message)=>{
 *  	console.info(message);
 *   }).on('error',(message)=>{
 *   	console.error(message);
 *    });
 * });
 */
function request(input,cid,isParsed,context){
	var ret = dispatch("run script [] as [] with cid []",[input,isParsed? 'parsed' : 'text',cid],context);
	ret.on('error [] parsing file [] at []',(err,filename,pos)=>{
		ret.emit('error',`Error processing the request - ${err} at ${filename}:${pos}`);
	});
	ret.on('error [] with message []',(err,message)=>{
		ret.emit('error',`${message} (${err})`);
	});
	return ret;
}

/**
 * Call a handler function, passing it some data object. A handler is a function defined in the human-computer dictionary. The format should be functionName@user/module
 * It uses the 'bind' format as specified in the human-computer dictionary reference. 
 * @param   {string}  handler a bind spec in the format functionName@owner/package
 * @param   {Object}  data    the data to pass to the handler function as its first argument
 * @param   {string}  cid     context id. The context may be used by the handler code. null if there is no cid
 * @param   {Object}  context context of the call - similar to the context parameter in {@link request}
 * @returns {Promise} an event emitter promise
 * @fires say
 * @fires ask
 * @fires show
 * @fires log
 * @fires error
 * @fires upload
 */
function callHandler(handler,data,cid, context){
	let c = {};
	_.extend(c,context);
	c['the data'] = data;
	return dispatch("run script [] as [] with cid []",[`handler(${handler} it('data',frame))`,'parsed',cid],c);
}

function log(ownerToken,type,userid,text){
	return dispatch("log",[ownerToken,type,userid,text]);
}

/**
 * Get the currently connected userid.
 * @returns {Promise} and event emitter promise
 * @fires userid
 */
function whoami(){
	return dispatch("whoami",[],{});
}
/**
 * Answer a question the user was asked. This call should reference a previously received {@link event:ask}.
 * @param   {string}  qid       question id as received by {@link event:ask}
 * @param   {Object}  response  a response object in the form of {@link request} input parameter or plain text
 * @param   {string}  expecting the expected type as received by {@link event:ask} - default "text"
 * @param	{Object}  context   the context object
 * @returns {Promise} an event emitter promise
 * @fires options
 * @fires error
 * @fires timeup
 
 */
function answer(qid,response,expecting,context){
	if(typeof response === "string"){
		return dispatch('answer question [] with response [] expecting []',[qid,{
			input:response,
			expecting: expecting || "text",
		},expecting || "text"],{});
	}else{
		return dispatch('answer',[qid,response,expecting,context],context);
	}
}

/**
 * Save a file on Dodido server. The type of the file is assumed based on the dot ending - file.js is assumed to be
 * a javascript file. The name may be a path like 'path/to/location/filename.js
 * @param {string} name file name including the dot ending - filename.js.
 * @param {string} body file body as base64 encoded
 * @fires error
 */
function saveFile(name,body){
	return dispatch("saveFile",[name,body]);
}

/**
 * Show log messages of the token owner. Options specify filters on the log entries
 * @param   {object} options an opject with filter options
 */
function showLogs(options){
	return dispatch("showLog",[options]);
}

/**
 * Delete a file from the server
 * @param   {string}  name file name
 * @returns {Promise} an event emitter promise object
 * @fires error
 */
function deleteFile(name){
	return dispatch("deleteFile",[name]);
}

/**
 * Delete a definition manifest from the server. If the manifest does not exist, no error message is returned
 * @param   {string}  name mafniest name
 * @returns {Promise} an event emitter promise object
 * @fires error
 */
function deleteManifest(name){
	return dispatch("deleteManifest",[name]);
}

/**
 * Saves a mafniest JSON object. This function is used to save JSON definition of some object like dictionary files 
 * or bot files.
 * @param {string}   name name of the file including the dot ending. The manifest type is assumed based on the dot
 *                        ending. Eg. name.bot is assumed to be a bot definition JSON object
 * @param {Object}   body a JSON manifest object
 * @fires error
 */
function saveManifest(name,body){
	return dispatch("saveManifest",[name,body]);
}


/**
 * Disconnect from the Dodido server
 */
function disconnect(){
	if(socket){
		socket.close();
	}
	socket = null;
}

EventMap ={
	/**
	* Report an error message to the user.
	* @event error
	* @param {string} message the error message
	*/
	'error []' : 'error',
	'on error Error with message Message' : 'error',

	/**
	* Send a text message to the user. When voice is enabled, this should be spoken to the user
	* @event say
	* @param {string} message the message to send to the user
	*
	*/
	'say []' : 'say',
	
	/**
	* Show a widget in the messaging platform UI. The format of the widget definition may depend on the messaging
	* platform.
	* @event show
	* @param {string}  type the widget type (e.g. 'table' or 'facebook' for passing directly to Facebook messenger)
	* @param {Object}  body a JSON object with the data to display in the widget specialised format
	*/
	'show' : 'show',
	/**
	* Ask the user a question. The message should be sent to the user as a question (if relevant for the platform).
	* The id and expecting fields should be stored in the conversation state so the next request will be treated
	* as an answer to the question.
	* @event ask
	* @param {string} message the question to ask
	* @param {string} id  the question id. This is the reference to the question. It should be passed back
	*                     to the server when returning the user's answer
	* @param {string} description some description of the expected answer - may be displayed to the user as
	*                             further explanation to the question
	* @param {string} expecting the expected answer type - this specifies the patterns the parser may accept
	*
	*/
	'ask [] with id [] placeholder [] expecting []' : 'ask',

		/**
	* Log a message. This message should be sent to the application log for development purposes
	* @event log
	* @param {string} message the message to send to the log
	*/
	'log []' : 'log',

	/**
	* Show a progress message. This is a message that should be displayed in the request view to update
	* the user as to the state of the request.
	* @event progress
	* @param {string} message the progress message
	*/
	'show progress Progress' : 'progress',

	/**
	* Failed to parse the request. Client should show a message notifying the user the request could not be
	* understood by the bot
	* @event fail
	*/
	'parse failed' : 'fail',
	
	/**
	* Send a file to the user
	* @event upload
	* @param {string} body the file base64 encoded
	* @param {string} name file name
	* @param {string} title file title
	*/
	'upload file [] named [] with title []' : 'upload',
	
	/**
	* The Dodido server identified several possible interpretations for the user request. The options is an array
	* of possible parses. Each object in the array has the following fields:
	* <ul> parsed - a parsed interpretation of the request using a special format incorporating the text, its parse
	* and binding
	* <ul> text - the interpretation in human readable text format
	* The client should either choose the most likely interpretation (the first one) and send the parsed text to server
	* using the request function with format parsed format or ask the user to choose between the interpretations.
	* @event options
	* @param {Option[]} options an array of option objects. 
	* @param {string} options.transcript the rewritten option in a format that includes the function binding.
	*                                    This should be passed on to subsequent 'request' calls
	* @param {string} options.text the request interpretation in plain text format
	*/
	'possible rewrites are []' : 'options',
	
	/**
	* When the server is waiting for an answer to a question, timeup event is fired when the server is no longer
	* waiting for the answer. After this event is fired, answer calls should not be sent to the server.
	* @event timeup
	*/
	'timed up' : 'timeup',
	
	/**
	* The connection to the Dodido server was opened
	* @event opened
	*/
	'opened' : 'opened',
	
	/**
	* The connection to the Dodido server was closed
	* @event closed
	*/
	'closed' : 'closed',
	
	/**
	* In response to the whoami request, return the userid
	* @event userid
	*/
	'userid is []' : 'userid',
	
	/**
	* The user token - used when connecting with username/password - fires a generated token
	* @event token
	*/
	'key []' : 'token'
};

///////////////////////////////////////////////////////////////////////////////
// private functions
///////////////////////////////////////////////////////////////////////////////

/**
 * Dispatch an action to the dodido server. This functions activates an action on the dodido server and
 * returns an event emitter promise. The returned promise can be listened on using the 'on' function
 * @param   {string}  message the action to envoke
 * @param   {Array}   args    an array of action arguments
 * @param   {Object}   context object - use format "the user" for tag values an just name for name values
 * @returns {Promise} an even emitter promise
 * @private
 */
function dispatch(message,args,context){
	var id = ++frameid;
	var promise = new Promise(function(resolve,reject){
		frames[id] = {promise:promise,resolve:resolve,reject:reject};
		var out = `[${id},${JSON.stringify(message)}, ${JSON.stringify(args)}`;
		if(context){
			out += ("," + JSON.stringify(context));
		}
		out += "]";
		if(socket){
			socket.send(out);
		}else{
			if(!gurl){
				promise.emit('error','Connection to server was not initialized');
				reject('Connection to server was not initialized');
				return;
			}
			connect(gurl).then(function(){
				socket.send(out);
			});
		}
	});
	//need to set the promise. When the resolve and reject were set, the promise did not exists yet
	frames[id].promise = promise;
	_.extend(promise,EventEmitter.prototype);
	return promise;
}

/**
 * Emit an even received from the server via websocket to the corresponding action promise.
 * @param {string} data string that should be parsed as a JSON array. The array may contain up to 3 elements
 *                      <ol>the request id
 *                      <ol>event name. If only the the array contains only one element then the message is treated
 *                      as an END event.
 *                      <ol>an array with event arguments
 * @private
 */
function reportMessage(data){
	var parsed = {};
	try{
		parsed = JSON.parse(data);
	}catch(e){
		console.error("Error - parsing message from server - ",e,data);
		return;
	}
	if(frames[parsed[0]]){
		if(parsed.length === 1){
			//receiving a message array of length 1 is an end message - finished processing
			let id = Number.parseInt(parsed[0]);
			frames[id].promise.emit('end');
			frames[id].resolve();
			delete frames[parsed[0]];
		}else{
			var message = EventMap[parsed[1]] || parsed[1];
			let id = Number.parseInt(parsed[0]);
			frames[id].promise.emit.apply(frames[id].promise,[message].concat(parsed[2] || []));
		}
	}else{
		console.error("Received message after completion",data);
	}
}

/**
 * Kill all user requests that are currently running
 * @param {string} userkey user key
 * @private
 */
function killUser(userkey){
	var out = `[0,"kill",["${userkey}"]]`;
	if(socket){
		socket.send(out);
	}else{
		if(!gurl){
			console.error("url was not defined. Cannot kill user");
			return;
		}
		connect(gurl).then(function(){
			socket.send(out);
		});
	}
}


module.exports = {
	connect : connect,
	signin : signin,
	whoami : whoami,
	disconnect:disconnect,
	request : request,
	callHandler : callHandler,
	answer : answer,
	saveFile : saveFile,
	deleteFile : deleteFile,
	saveManifest : saveManifest,
	deleteManifest : deleteManifest,
	showLogs : showLogs,
	log : log
};

