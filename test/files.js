const t = require('tap');
const c = require('..');
const fs = require('fs-extra');
const config = require('./config');

t.test('save file',function(t){
	t.plan(1);
	c.connect(config.url,config.token).then(function(){
		const file = fs.readFileSync(__dirname + '/testuser/basic.js');
		return c.saveFile("basic.js",new Buffer(file).toString('base64')).on('error',function(error){
			t.fail('failed to save file: ' + error);
		});
	}).then(function(){
		t.pass();
	}).catch(t.threw);
}).then(function(){
	return t.test('save manifest',function(t){
		t.plan(1);
		const manifest = fs.readJsonSync(__dirname+'/testuser/basic.dic');
		return c.saveManifest("basic.dic",manifest).on('error',function(error){
			t.fail('failed to save manifest: ' + error);
		}).then(function(){
			t.pass();
		}).catch(t.threw);
	});
}).then(function(){
	var promise = new Promise(function(resolve,reject){
		setTimeout(resolve,5000);
	});
	return promise;
}).then(function(){
	return t.test('ensure loaded files are working correctly',(t)=>{
		t.plan(2);
		return c.request({
			input: "hello world",
			packages : [config.username + "/basic"]
		}).once('say',function(text){
			t.equal(text,"Hello to you to");
		}).on('log',function(text){
			t.equal(text,"in helloWorld");
		});
	});
}).then(function(){
		return t.test('ask a question',(t)=>{
			return c.request({
				input: "what is your name",
				packages : [config.username + "/basic"]
			}).once('ask',function(message,id,description,expecting){
				t.equal(message,"What is yours?","ask message incorrect");
				t.equal(expecting,"text","ask type incorrect");
				c.answer(id,"funny name",expecting);
			}).on('say',function(text){
				t.equal(text,"nice meeting you funny name. My name is dodido","say after answer incorrect");
		});
	});
	}).then(function(){
	return t.test('delete manifest',function(t){
		t.plan(1);
		return c.deleteManifest("basic.dic").on('error',function(error){
			t.fail('failed to delete manifest: ' + error);
		}).then(function(){
			t.pass();
		}).catch(t.threw);
	});
}).then(function(){
	return t.test('delete file',function(t){
		t.plan(1);
		return c.deleteFile("basic.js").on('error',function(error){
			t.fail('failed to delete file: ' + error);
		}).then(function(){
			t.pass();
		}).catch(t.threw);
	});
}).then(function(){
	process.exit();
});


	