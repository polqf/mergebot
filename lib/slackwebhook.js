var IncomingWebhook = require('@slack/client').IncomingWebhook;
var Logger = require('./logger');

function SlackWebhook(url) {
	this.wh = new IncomingWebhook(url, {
		username: 'Mergebot',
		iconEmoji: ':iphone:',
		channel: 'iosbuilds'
	});
};

SlackWebhook.prototype.sendMessage = function(state, header, headerURL, message) {
	Logger.log("sjnfjgks" + headerURL)
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

	this.wh.send({attachments: attachments});
};

module.exports = SlackWebhook;