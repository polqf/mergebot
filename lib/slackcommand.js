var Logger = require ('./logger')
var MergeBot = require('./mergebot');
var SlackWebhook = require('./slackwebhook');
var GithubWrapper = require('./githubwrapper');
var request = require('request');

function SlackCommand() {
};

var buddybuildAddCommand = "add"
var listPRsCommand = "list prs"

SlackCommand.prototype.processBody = function(body, callback) {
	var command = body.text
	var responseURL = body.response_url

	var complete = function(result) {
		callback((result instanceof Error) ? result.message : result)
	}

	if (command.includes(buddybuildAddCommand)) {
		SlackCommand._addUserToBuddybuild(command, function(result) {
			complete(result)
		})
	} else if (command == listPRsCommand) {
		SlackCommand._listPullRequests(command, responseURL, function(result) {
			complete(result)
		})
	} else {
		complete("Received unexpected command")
	}
}

SlackCommand._addUserToBuddybuild = function(command, callback) {
	command = command.replace(buddybuildAddCommand, "")
	var components = command.split(" ").filter(word => word.length > 0)

	if (components.length > 1 || components.length == 0) {
		callback("Received unexpected command")
		return
	}

	var email = components[0]
	var emailDomains = process.env.EMAIL_DOMAINS.split(",").map(domain => "@" + domain)

	if (emailDomains.filter(domain => email.endsWith(domain)).length == 0) {
		callback("Email has incorrect domain")
		return
	}

	SlackCommand._sendEmailToBuddybuild(email, function(result) {
		callback(result)
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

SlackCommand._listPullRequests = function(command, responseURL, callback) {
	var githubWrapper = new GithubWrapper(process.env.GITHUB_REPO_OWNER, process.env.GITHUB_REPO_NAME);
	githubWrapper.logIn()
	githubWrapper.grabPRs(function(prs) {
		if (prs instanceof Error) {
			callback(prs)
			return
		}

		callback({
			"response_type": "in_channel",
			"text": "There are " + prs.length + " open Pull Requests"
		})

		SlackCommand._getPullRequestsReport(githubWrapper, prs, 0, [], function(reports) {
			if (reports instanceof Error) {
				callback(reports)
				return
			}

			var attachments = reports.map(function(pr) {
				var digest = MergeBot.reviewDigestFrom(pr.reviews, pr.author)
				return SlackWebhook.attachmentWith(
					pr.name,
					pr.url,
					"",
					"Status: " + (digest.approved ? "Approved" : "Missing review"),
					digest.message,
					pr.avatarURL,
					pr.author)
			})

			var sw = new SlackWebhook()
			sw.botReplyAttachment(responseURL, "", attachments)
		})
	})
}

SlackCommand._getPullRequestsReport = function(githubWrapper, prs, index, accumulated, callback) {
	if (index > prs.length - 1) {
		callback(accumulated)
		return
	}

	var pr = prs[index]
	githubWrapper.reviewReport(pr.number, function(reviews) {
		if (reviews instanceof Error) {
			callback(reviews)
			return
		}

		Logger.log(pr.user)

		var pullRequest = new PullRequest(pr.title, pr.user.login, pr.user.avatar_url, pr.number, pr.html_url, reviews)
		accumulated.push(pullRequest)
		SlackCommand._getPullRequestsReport(githubWrapper, prs, ++index, accumulated, callback)
	})
}

function PullRequest(name, author, avatarURL, number, url, reviews) {
	this.name = name
	this.author = author
	this.avatarURL = avatarURL+"&s=32"
	this.number = number
	this.url = url
	this.reviews = reviews
}

module.exports = SlackCommand;