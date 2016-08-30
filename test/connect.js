var t = require('tap');
var c = require('..');
var config = require('./config');

t.test('connect',function(t){
	t.plan(2);
	c.connect(config.url,config.token).on('opened',function(){
		t.pass("connected");
	}).then(function(){
		return c.whoami().on('userid',function(userid){
			t.equals(userid,config.username);
		});
	}).then(function(){
		process.exit();
	}).catch(t.threw);
});


