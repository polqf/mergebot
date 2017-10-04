var express = require('express');
var bodyParser = require('body-parser');
var MergeBot = require('./lib/mergebot');
var Logger = require ('./lib/logger')

var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
	response.render('pages/index');
});

app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
});

app.post('/hook', function(request, response) {
	var body = null

	if (request.headers.host.includes("localhost")) {
		body = request.body
		global.debug = true
	} else {
		body = JSON.parse(request.body.payload)
	}

	var mergeBot = new MergeBot();
	mergeBot.processBody(body, function(result) {
		Logger.log(result)
		if (result instanceof Error) {
			response.status(503).send(result)
			return
		}

		response.send(result)
	})
});

app.post('/slash_command', function(request, response) {
	var body = null

	if (request.headers.host.includes("localhost")) {
		body = request.body
		global.debug = true
	} else {
		body = JSON.parse(request.body.payload)
	}
});
