var WebClient = require('@slack/client').WebClient;
var IncomingWebhook = require('@slack/client').IncomingWebhook;
var Logger = require('./logger');
var MergeBot = require('./mergebot');

function SlackWebhook() {
};

SlackWebhook.prototype.sendMessage = function(token, state, header, headerURL, linksAmount, message) {
	if (MergeBot.debug) { return; }

	var attachments = [{
		"fallback": message,
		"color": "#42b9f4",
		"title": header,
		"title_link": headerURL,
		"footer": "Mergebot",
		"fields": [
                {
                    "title": "State: " + state,
                    "value": message,
                    "short": false
                }
            ]
	}]

	var opts = {
		"link_names": linksAmount,
		"attachments": attachments,
		"username": "Mergebot",
		"icon_url": process.env.SLACK_ICON_URL
	}

	var wc = new WebClient(token);
	wc.chat.postMessage(process.env.SLACK_CHANNEL, "", opts);
};

SlackWebhook.prototype.botReply = function(url, message) {
	var webhook = new IncomingWebhook(url);

	var message = (message instanceof Error) ? message.message : message

	webhook.send(message, function(err, header, statusCode, body) {
		if (err) {
			console.log('Error:', err);
		} else {
			console.log('Received', statusCode, 'from Slack');
		}
	});

}

module.exports = SlackWebhook;