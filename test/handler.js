const t = require('tap');
const c = require('..');
const fs = require('fs-extra');
const config = require('./config');

t.test('call handler',function(t){
	t.plan(1);
	c.connect(config.url,config.token).then(()=>{
		const file = fs.readFileSync(__dirname + '/testuser/basic.js');
		return c.saveFile("basic.js",new Buffer(file).toString('base64'));
	}).then(()=>{
		return c.callHandler('handler@test2/basic','very funny',null,{'the test context':' world'}).on('say',(text)=>{
			t.equal(text,'very funny world');
		});
	}).then(function(){
	process.exit();
	});
});


	