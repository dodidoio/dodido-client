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


	