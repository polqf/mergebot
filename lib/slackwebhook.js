var WebClient = require('@slack/client').WebClient;
var Logger = require('./logger');
var MergeBot = require('./mergebot');

function SlackWebhook(token) {
	this.wc = new WebClient(token);
};

SlackWebhook.prototype.sendMessage = function(state, header, headerURL, linksAmount, message) {
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

	this.wc.chat.postMessage("iosbuilds", "", opts);
};

module.exports = SlackWebhook;