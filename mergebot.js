var GithubWrapper = require('./lib/githubwrapper');

function MergeBot(path) {
};

MergeBot.processBody = function(body, callback) {

	if (body.state != "success") {
		callback("Nothing to do here!")
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

			MergeBot.processPRs(githubWrapper, result, 0, commitSHA, function(found, prNumber) {
				if (found == false || prNumber == 0) {
    				callback("Did not find any PR with the given commit")
					return
				}

				githubWrapper.grabComments(prNumber, function(result) {
					var found = false;
					for(var index in result) {
    					if (result[index] == process.env.COMMIT_MESSAGE) {
        					found = true;
        					break;
    					}
    				}
    				if (found) {
    					MergeBot.mergePR(githubWrapper, prNumber, function() {
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

	var prNumber = prs[index].number
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
    		callback(found, prNumber)
    		return
    	}

    	MergeBot.processPRs(githubWrapper, prs, ++currentIndex, sha, currentCallback)
	})
}

MergeBot.mergePR = function(githubWrapper, prNumber, callback) {
	if (process.env.SHOULD_MERGE) {
		githubWrapper.mergePR(prNumber, function(result) {
			callback()
		})

	} else {
		githubWrapper.commentOnPullRequest(prNumber, "I am going to merge you", function(result) {
			callback()
		})
	}
}

module.exports = MergeBot;