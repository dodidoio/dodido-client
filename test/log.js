var t = require('tap');
var c = require('..');
var config = require('./config');

t.test('log request',function(t){
	t.plan(1);
	c.connect(config.url,config.token).then(function(){
		return c.log(config.token,'test','test userid','this is a test text log')
		.on('error',(err)=>{console.log(err);t.fail();});
	}).then(function(){
		t.ok(true);
		process.exit();
	}).catch(t.threw);
});


