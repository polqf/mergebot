var GitHubApi = require("github");

function GithubWrapper(repoOwner, repoName) {
	this.repoOwner = repoOwner
	this.repoName = repoName
	this.gitHubApi = new GitHubApi({
		version: "3.0.0",
    	headers: {
        	"user-agent": "mentionsbot"
    	}
	});
};

GithubWrapper.prototype.logIn = function() {
	this.gitHubApi.authenticate({
    	type: "oauth",
    	token: process.env.OAUTH_TOKEN
	});
}

GithubWrapper.prototype.commentOnPullRequest = function(prNumber, message, callback) {
	this.gitHubApi.issues.createComment({
    	owner: this.repoOwner,
    	repo: this.repoName,
    	number: prNumber,
    	body: message
   	}, function(err, res) {
    	callback(err)
	});
}

GithubWrapper.prototype.allStatusesSucceeded = function(sha, callback) {
	this.gitHubApi.repos.getCombinedStatus({
		owner: this.repoOwner, 
		repo: this.repoName, 
		ref: sha
	}, function(error, result) {
		console.log(result)
    	if (error) { 
    		callback(error) 
    		return
    	}

    	var succeeded = result.data.state == "success"
    	callback(succeeded)
    });
}

GithubWrapper.prototype.mergePR = function(prNumber, callback) {
 	this.gitHubApi.pullRequests.merge({
		owner: this.repoOwner, 
		repo: this.repoName,
    	number: prNumber,
	}, function(error, result) {
    	if (error) { 
    		callback(error) 
    		return
    	}
    	console.log(result.data)
    	callback(result.data)
    });
}

GithubWrapper.prototype.grabPRs = function(callback) {
 	this.gitHubApi.pullRequests.getAll({
		owner: this.repoOwner, 
		repo: this.repoName,
		state: "open",
		sort: "updated",
		sort: "updated",
		direction: "desc"
	}, function(error, result) {
    	if (error) { 
    		callback(error) 
    		return
    	}
    	callback(result.data)
    });
}

GithubWrapper.prototype.grabCommits = function(prNumber, callback) {
 	this.gitHubApi.pullRequests.getCommits({
		owner: this.repoOwner, 
		repo: this.repoName,
		number: prNumber
	}, function(error, result) {
    	if (error) { 
    		callback(error) 
    		return
    	}

		var commitsSHAs = []
    	for (var index in result.data) {
    		var prCommit = result.data[index].sha
    		commitsSHAs.push(prCommit)
		}

    	callback(commitsSHAs)
    });
}

GithubWrapper.prototype.grabComments = function(prNumber, callback) {
 	this.gitHubApi.issues.getComments({
		owner: this.repoOwner, 
		repo: this.repoName,
		number: prNumber
	}, function(error, result) {
    	if (error) { 
    		callback(error) 
    		return
    	}

		var comments = []
    	for (var index in result.data) {
    		var comment = result.data[index].body
    		comments.push(comment)
		}

    	callback(comments)
    });
}

module.exports = GithubWrapper;