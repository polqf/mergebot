var Logger = require ('./logger')
var GithubWrapper = require('./lib/githubwrapper');

function MergeBot() {
};

MergeBot.prototype.processBody = function(body, callback) {
	if (body.state != "success") {
		callback("Nothing to do here!")
		return
	}

	var prAuthor = body.sender.login
	var repoOwner = body.repository.owner.login
	var repoName = body.repository.name
	var commitSHA = body.sha
	
	if (!prAuthor || !repoOwner || !repoName || !commitSHA) {
		callback(new Error('Received unexpected input'))
		return
	}

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

			self.processPRs(githubWrapper, result, 0, commitSHA, function(found, prNumber, branchName) {
				if (found == false || prNumber == 0) {
    				callback("Did not find any PR with the given commit")
					return
				}

				Logger.log("PR Found: " + prNumber)

				githubWrapper.isPullRequestApproved(prNumber, function(approved) {
					if (approved == false) { 
						callback("Missing PR approval") 
						return
					}

					githubWrapper.grabComments(prNumber, function(result) {
						var prMergeMethod = null;
						for(var index in result) {
							var mergeMethod = self.mergeMethodFor(result[index])
							if (mergeMethod != null) {
        						prMergeMethod = mergeMethod;
        						break;
    						}
    					}
    					if (prMergeMethod != null) {
    						Logger.log("Expected message found")
    						self.mergePR(githubWrapper, prNumber, branchName, prMergeMethod, function(result) {
	    						if (result instanceof Error) { 
									callback(result)
									return
								}
								callback(result)
    						})
    					} else {
    						callback("Expected message not found")
    					}
					})

				})
			})
		})
	})
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
    		callback(found, prNumber, prRef)
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