//dodido client

/* jshint node:true */
var _ = require('underscore');
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
 * @param   {string}  url   the server url (e.g. https://dodido.io)
 * @param   {string}  token the token used to access the server
 * @returns {Promise} a promise resolved when the connection is successfule. The promise is rejected if the connection
 *                    fails with an error message
 * @fires opened
 * @fires closed
 */
function connect(url,token){
	var ret = new EventEmitter();
	gurl = token? url+"?key="+token : url;
	socket = require('engine.io-client')(gurl);
	socket.on('open', function(){
		socket.on('message', function(data){reportMessage(data);});
		socket.on('close', function(){
			socket = null;
			ret.emit('closed');
			});
		});
		ret.emit('opened');
	return ret;
}


/**
 * Pass a text request from the user to the Dodido server. The cid argument is some unique identification of the
 * conversation. This is used to store the context of the conversation. It can be the bot userid if each 
 * @param   {string}  userid          the end user id
 * @param   {string}  ownertoken      the token of the bot owner
 * @param   {string}  cid             conversation id - this is some string id used to keep context of the 
 *                                    conversation. It should be unique per bot owner
 * @param   {Object}  input           an object containing request information
 * @param   {string}  input.input     the request text
 * @param   {Array}   input.options   an array of possible request texts. This can be used when using
 *                                    voice recognition and several possible interpretations are possible
 * @param   {string}  input.expecting the expected parse type. By default this is 'action' - meaning an
 *                                    action the bot should take in response to a request. 
 * @param   {Array}   input.packages  an array of package names to use when processing the request
 * @param   {boolean} isTranscript    true if the request text is  a parsed request returned in the options transcript.
 *                                    If the request is parsed, the request function bypasses the parser and executes
 *                                    the request immediately.
 * @returns {Promise} an event emitter promise
 * @fires say
 * @fires options
 * @fires ask
 * @fires log
 * @fires error
 * @fires progress
 * @fires error
 * @fires fail
 * @fires upload
 * @example
 * var client = require('dodido-client');
 * client.request('myuser','bot owner token','some-conversation-id',{input:'hello world'})
 * 	.on('say',function(message){
 *  	console.log(message);
 *   }).on('error',function(message){
 *   	console.error(message);
 *    });
 */
function request(userid, ownertoken,cid,input,isParsed){
	return dispatch("run script [] as [] with cid []",[input,isParsed? 'parsed' : 'text',cid],{
		'the user id':userid,
		'the Key':ownertoken
	});
}

/**
 * Answer a question the user was asked. This call should reference a previously received {@link event:ask}.
 * @param   {string}  userid    the end user id
 * @param   {string}  ownertoken the bot token
 * @param   {string}  qid       question id as received by {@link event:ask}
 * @param   {string}  expecting the expected type as received by {@link event:ask}
 * @param   {Object}  response  a response object in the form of {@link request} input parameter
 * @returns {Promise} an event emitter promise
 * @fires options
 * @fires error
 * @fires timeup
 * @fires error
 
 */
function answer(userid,ownertoken,qid,expecting,response){
	return dispatch('answer question [] with response [] expecting []',[qid,response,expecting],{
		'the user id':userid,
		'the key':ownertoken
	});
}

/**
 * Save a file on Dodido server. The type of the file is assumed based on the dot ending - file.js is assumed to be
 * a javascript file. The name may be a path like 'path/to/location/filename.js
 * @param {string} name file name including the dot ending - filename.js.
 * @param {string} body file body as base64 encoded
 * @fires error
 */
function saveFile(name,body){
	return null;
}

/**
 * Delete a file from the server
 * @param   {string}  name file name
 * @returns {Promise} an event emitter promise object
 * @fires error
 */
function deleteFile(name){
	return null;
}

/**
 * Delete a definition manifest from the server
 * @param   {string}  name mafniest name
 * @returns {Promise} an event emitter promise object
 * @fires error
 */
function deleteManifest(name){
	return null;
}

/**
 * Saves a mafniest JSON object. This function is used to save JSON definition of some object like dictionary files 
 * or bot files.
 * @param {string}   name name of the file including the dot ending. The manifest type is assumed based on the dot
 *                        ending. Eg. name.bot is assumed to be a bot definition JSON object
 * @param {Object}   body a JSON manifest object
 * @fires error
 */
function saveManifest(name,body,type){
	return null;
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
	var id = frameid++;
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
			frames[parsed[0]].promise.emit('end');
			frames[parsed[0]].resolve();
			delete frames[parsed[0]];
		}else{
			var message = EventMap[parsed[1]] || parsed[1];
			frames[parsed[0]].promise.emit.apply(promise,[message].concat(parsed[2] || []));
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
	'possible rewrites are X' : 'options',
	
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
	'closed' : 'closed'
};

module.exports = {
	connect : connect,
	disconnect:disconnect,
	request : request,
	answer : answer
};

