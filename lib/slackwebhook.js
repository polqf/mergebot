var WebClient = require('@slack/client').WebClient;
var IncomingWebhook = require('@slack/client').IncomingWebhook;
var Logger = require('./logger');
var MergeBot = require('./mergebot');
var request = require('request');

function SlackWebhook() {
};

SlackWebhook.prototype.sendMessage = function(token, state, header, headerURL, linksAmount, message) {
	if (MergeBot.debug) { return; }

	var attachment = SlackWebhook.attachmentWith(header, headerURL, "", "State: " + state, message, "", "")
	var opts = {
		"link_names": linksAmount,
		"attachments": [attachment],
		"username": "Mergebot",
		"icon_url": process.env.SLACK_ICON_URL
	}

	var wc = new WebClient(token);
	wc.chat.postMessage(process.env.SLACK_CHANNEL, "", opts);
};

SlackWebhook.prototype.botReplyText = function(url, message) {
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

SlackWebhook.prototype.botReplyAttachment = function(url, message, attachments) {
	var message = (message instanceof Error) ? message.message : message
	var opts = {
		"link_names": 0,
		"attachments": attachments,
		"icon_url": process.env.SLACK_ICON_URL
	}

	request.post({
		url: url,
		json: true,
		body: {
			response_type: "in_channel",
			text: "",
			link_names: 0,
			attachments: attachments }
		}, function(error, response, body){
			Logger.log(error)
		});
}

SlackWebhook.attachmentWith = function(title, titleURL, message, descriptionTitle, descriptionValue, authorIcon, authorName) {
	return {
		"pretext": message,
		"fallback": message,
		"color": "#42b9f4",
		"title": title,
		"title_link": titleURL,
		"fields": [{
			"title": descriptionTitle,
			"value": descriptionValue,
			"short": false
		}],
		"author_icon": authorIcon,
		"author_name": authorName
	}
}

module.exports = SlackWebhook;