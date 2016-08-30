var t = require('tap');
var c = require('..');
var config = require('./config');

t.test('hello world request',function(t){
	t.plan(4);
	c.connect(config.url,config.token).then(function(){
		return c.request({
			input: "hello world",
			packages : ["dodido/test-basic"]
		}).once('say',function(text){
			t.equal(text,"Hello to you to");
		}).on('log',function(text){
			t.equal(text,"in helloWorld");
		});
	}).then(function(){
		return c.request({
			options: ["this is not a real request","hello world"],
			packages : ["dodido/test-basic"]
		}).once('say',function(text){
			t.equal(text,"Hello to you to","with several options");
		}).on('log',function(text){
			t.equal(text,"in helloWorld","with several options");
		});
	}).then(function(){
		process.exit();
	}).catch(t.threw);
});


