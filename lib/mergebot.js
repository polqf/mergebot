var Logger = require ('./logger')
var GithubWrapper = require('./githubwrapper');
var SlackWebhook = require('./slackwebhook');

function MergeBot() {
	this.prAuthor = null
	this.prName = null
	this.prURL = null
	this.prNumber = null
	this.successfulBuild = false
};

MergeBot.prototype.processBody = function(body, callback) {
	if (this.isSuccessfulBuildOrReview(body) == false) {
		callback("Nothing to do here!")
		return
	}

	var prAuthor = body.sender.login
	var repoOwner = body.repository.owner.login
	var repoName = body.repository.name
	var commitSHA = body.sha || body.pull_request.head.sha

	if (!prAuthor || !repoOwner || !repoName || !commitSHA) {
		callback(new Error('Received unexpected input'))
		return
	}

	this.prAuthor = prAuthor
	this.successfulBuild = body.state == "success"

	Logger.log(prAuthor)
	Logger.log(repoName)
	Logger.log(repoOwner)
	Logger.log(commitSHA)
	Logger.log("-----------------")

	var githubWrapper = new GithubWrapper(repoOwner, repoName);
	var logInResult = githubWrapper.logIn()

	if (logInResult instanceof Error) { 
		callback(logInResult)
		return
	}

	var self = this

	githubWrapper.allStatusesSucceeded(commitSHA, function(succeeded) {
		if (succeeded instanceof Error) { 
			callback(succeeded)
			return
		}

		if (succeeded == false) {
			callback("Not a success status")
			return
		}

		githubWrapper.grabPRs(function(result) {
			if (result instanceof Error) { 
				callback(result)
				return
			}

			self.processPRs(githubWrapper, result, 0, commitSHA, function(found, prNumber, prName, prURL, branchName) {
				if (found == false || prNumber == 0) {
					callback("Did not find any PR with the given commit")
					return
				}

				self.prName = prName
				self.prURL = prURL
				self.prNumber = prNumber

				Logger.log("PR Found: " + prNumber)

				githubWrapper.grabComments(prNumber, function(result) {
					var prMergeMethod = self.mergeMethodOnComments(result)
					if (prMergeMethod == null) {
						callback("Expected message not found")
						return
					}

					Logger.log("Expected message found")

					self.notifyMergeability(githubWrapper, prNumber, function(canMerge) {
						if (canMerge == false || (canMerge instanceof Error)) {
							callback("Missing PR Review")
							return
						}

						self.mergePR(githubWrapper, prNumber, branchName, prMergeMethod, function(result) {
							if (result instanceof Error) { 
								callback(result)
								return
							}
							callback(result)
						})
					})
				})

			})
		})
	})
}

MergeBot.prototype.isSuccessfulBuildOrReview = function(hookBody) {
	return hookBody.state == "success" || hookBody.action == "submitted"
}

MergeBot.prototype.mergeMethodOnComments = function(comments) {
	var prMergeMethod = null;
	for(var index in comments) {
		var mergeMethod = this.mergeMethodFor(comments[index])
		if (mergeMethod != null) {
			prMergeMethod = mergeMethod;
			break;
		}
	}
	return prMergeMethod
}

MergeBot.prototype.mergeMethodFor = function(originalMessage) {
	var message = originalMessage.toLowerCase()
	var user = process.env.BOT_USER.toLowerCase()
	var expectedMessage = process.env.COMMIT_MESSAGE.toLowerCase()

	if (message.includes(expectedMessage) == false || message.includes(user) == false) {
		return null
	}

	if (message.includes("squash")) {
		return "squash"
	}
	if (message.includes("rebase")) {
		return "rebase"
	}
	return "merge"
}

MergeBot.prototype.processPRs = function(githubWrapper, prs, index, sha, callback) {
	if (index > prs.length - 1) {
		callback(false, 0)
		return
	}

	var pr = prs[index]
	var prNumber = pr.number
	var prName = pr.title
	var prURL = pr.html_url
	var prRef = pr.head.ref
	var currentIndex = index
	var currentCallback = callback
	var self = this

	githubWrapper.grabCommits(prNumber, function(result) {
		var found = false;
		for(var index in result) {
			if (result[index] == sha) {
				found = true;
				break;
			}
		}

		if (found) {
			callback(found, prNumber, prName, prURL, prRef)
			return
		}

		self.processPRs(githubWrapper, prs, ++currentIndex, sha, currentCallback)
	})
}

MergeBot.prototype.mergePR = function(githubWrapper, prNumber, branchName, method, callback) {
	if (process.env.SHOULD_MERGE) {
		this.postAlertMessage(githubWrapper, prNumber, function() {
			githubWrapper.mergePR(prNumber, method, function(result) {
				if (result instanceof Error) { 
					callback(result)
					return
				}

				if (process.env.SHOULD_REMOVE_BRANCH) {
					githubWrapper.removeBranch(branchName, function(error) {
						callback((error instanceof Error) ? error : "Done")
					})
				} else {
					callback("Done")
				}
			})
		})
	} else {
		this.postAlertMessage(githubWrapper, prNumber, function() {
			callback()
		})
	}
}

MergeBot.prototype.notifyMergeability = function(githubWrapper, prNumber, callback) {
	var self = this

	githubWrapper.reviewReport(prNumber, function(reviews) {
		if (reviews instanceof Error) {
			callback(reviews)
			return
		}

		var reviewsCount = Object.keys(reviews).length
		if (reviewsCount == 0) {
			callback(false)
			return
		}

		var messageHeader = "### PR Review status :bar_chart:\n\n"
		var message = ""
		var approved = true

		Object.keys(reviews).forEach(function(user) {
			if (user == self.prAuthor) { return; }
			var value = reviews[user]
			user = process.env[user] || user
			approved = approved && value == "approved"
			message = message + "@" + user + "  " + self.emojiForState(value) + "\n"
		})

		if (approved) {
			callback(true)
			return
		}

		if (self.successfulBuild == false) {
			callback(false)
			return
		}

		githubWrapper.commentOnPullRequest(prNumber, messageHeader + message, function(result) {
			callback(false)
		})

		if (process.env.SLACK_BOT_TOKEN == null) { return; }

		var webhook = new SlackWebhook(process.env.SLACK_BOT_TOKEN)
		webhook.sendMessage("Missing PR Review", self.prName + " - #" + prNumber, self.prURL, reviewsCount, message)
	})
}

MergeBot.prototype.emojiForState = function(state) {
	switch(state) {
		case "approved":
			return ":white_check_mark:"
		case "commented":
			return ":speech_balloon:"
		case "changes_requested":
			return ":x:"
	}
}

MergeBot.prototype.postAlertMessage = function(githubWrapper, prNumber, callback) {
	var message = process.env.ALERT_MESSAGE

	var gifs = ["https://media.giphy.com/media/143vPc6b08locw/giphy.gif",
	"https://media1.giphy.com/media/Hw8vYF4DNRCKY/giphy.gif",
	"https://media4.giphy.com/media/ta83CqOoRwfwQ/giphy.gif",
	"https://media4.giphy.com/media/vMNoKKznOrUJi/giphy.gif",
	"https://media0.giphy.com/media/DAC7d6rb1YHbq/giphy.gif",
	"https://media.giphy.com/media/woWz6RL33Hm3S/giphy.gif",
	"http://media.giphy.com/media/tDafHUBVrRKtq/giphy.gif"]
	var randomIndex = Math.floor(Math.random() * gifs.length)
	message = message + "\n![](" + gifs[randomIndex] + ")"

	githubWrapper.commentOnPullRequest(prNumber, message, function(result) {
		callback(result)
	})
}

module.exports = MergeBot;