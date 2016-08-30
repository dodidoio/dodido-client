const t = require('tap');
const c = require('..');
const fs = require('fs-extra');
const config = require('./config');
var gToken = null;
t.test('connect with username/pswd',function(t){
	t.plan(2);
	c.connect(config.url).then(function(){
		console.log("after connect");
		return c.signin(config.username,config.pswd).on('token',function(token){
			console.log('token is',token);
			t.pass();
			gToken = token;
		});
	}).then(function(){
		console.log("after sign in");
		return c.connect(config.url,gToken);
	}).then(function(){
		return c.whoami().on('userid',function(userid){
			t.equal(userid,config.username);
		});
	}).catch(t.threw);
}).then(function(){
	process.exit();
});


	