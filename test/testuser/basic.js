module.exports = {
	helloWorld : function(dodido){
		dodido.log("in helloWorld");
		dodido.say("Hello to you to");
		dodido.say("Great talking to you");
	},
	handler : function(data,d){
		d.say(data);
	},
	askName : function(frame){
		return frame.ask('What is yours?','text').then((name)=>{
			frame.say("nice meeting you " + name + ". My name is dodido");
		}).catch((err)=>{
			frame.error("got error in askName");
		});
	}
};