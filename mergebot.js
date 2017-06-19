var GithubWrapper = require('./lib/githubwrapper');

function MergeBot(path) {
};

MergeBot.processBody = function(body, callback) {

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

///////////////////////////////////////////////////
	console.log(prAuthor)
	console.log(repoName)
	console.log(repoOwner)
	console.log(commitSHA)
	console.log("-----------------")
///////////////////////////////////////////////////

	var githubWrapper = new GithubWrapper(repoOwner, repoName);
	var logInResult = githubWrapper.logIn()

	if (logInResult instanceof Error) { 
		callback(logInResult)
		return
	}

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

			MergeBot.processPRs(githubWrapper, result, 0, commitSHA, function(found, prNumber, branchName) {
				if (found == false || prNumber == 0) {
    				callback("Did not find any PR with the given commit")
					return
				}

				githubWrapper.grabComments(prNumber, function(result) {
					var found = false;
					for(var index in result) {
						if (result[index].toLowerCase() === process.env.COMMIT_MESSAGE.toLowerCase()) {
        					found = true;
        					break;
    					}
    				}
    				if (found) {
    					MergeBot.mergePR(githubWrapper, prNumber, branchName, function(error) {
    						if (succeeded instanceof Error) { 
								callback(error)
								return
							}
							callback("Expected message found")
    					})
    				} else {
    					callback("Expected message not found")
    				}
				})
			})
		})
	})
}

MergeBot.processPRs = function(githubWrapper, prs, index, sha, callback) {
	if (index > prs.length - 1) {
		callback(false, 0)
		return
	}

	var pr = prs[index]
	var prNumber = pr.number
	var prRef = pr.head.ref
	var currentIndex = index
	var currentCallback = callback

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

    	MergeBot.processPRs(githubWrapper, prs, ++currentIndex, sha, currentCallback)
	})
}

MergeBot.mergePR = function(githubWrapper, prNumber, branchName, callback) {
	if (process.env.SHOULD_MERGE) {
		MergeBot.postAlertMessage(githubWrapper, prNumber, function() {
			githubWrapper.mergePR(prNumber, function(result) {
				if (result instanceof Error) { 
					callback(result)
					return
				}

				if (process.env.SHOULD_REMOVE_BRANCH) {
					githubWrapper.removeBranch(branchName, function(error) {
						callback(error)
					})
				} else {
					callback("Done")
				}
			})
		})
	} else {
		MergeBot.postAlertMessage(githubWrapper, prNumber, function() {
			callback()
		})
	}
}

MergeBot.postAlertMessage = function(githubWrapper, prNumber, callback) {
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
		callback()
	})
}

module.exports = MergeBot;