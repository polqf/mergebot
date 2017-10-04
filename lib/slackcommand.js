var Logger = require ('./logger')
var MergeBot = require('./mergebot');
var SlackWebhook = require('./slackwebhook');
var request = require('request');

function SlackCommand() {
};

SlackCommand.prototype.processBody = function(body, callback) {
	var buddybuildAddCommand = "add"
	var command = body.text
	var responseURL = body.response_url

	var complete = function(result) {
		callback((result instanceof Error) ? result.message : result)
	}

	if (command.includes(buddybuildAddCommand) == false) {
		complete("Received unexpected command")
		return
	}

	command = command.replace(buddybuildAddCommand, "")
	var components = command.split(" ").filter(word => word.length > 0)

	if (components.length > 1 || components.length == 0) {
		complete("Received unexpected command")
		return
	}

	var email = components[0]
	var emailDomains = process.env.EMAIL_DOMAINS.split(",").map(domain => "@" + domain)

	if (emailDomains.filter(domain => email.endsWith(domain)).length == 0) {
		complete("Email has incorrect domain")
		return
	}

	SlackCommand._sendEmailToBuddybuild(email, function(result) {
		complete(result)
	})
}

SlackCommand._sendEmailToBuddybuild = function(email, callback) {
	var url = "https://api.buddybuild.com/v1/apps/" + process.env.BUDDYBUILD_APP_ID + "/deployment-group/" + process.env.BUDDYBUILD_GROUP_ID + "/testers"
    request({
        url: url,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + process.env.BUDDYBUILD_TOKEN,
            'User-Agent': 'mergebot'
        },
        json: {
        	"testers": email
        }
   }, function(err, res, body) {
        callback(err || "Email successfully added")
   })
}

module.exports = SlackCommand;