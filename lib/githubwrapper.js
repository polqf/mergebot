var GitHubApi = require("github");
var MergeBot = require('./../mergebot');
var Logger = require ('./../logger')
var request = require('request');

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
    if (global.debug) {
        callback("Debug: Comment done on PR " + prNumber + "\n" + message)
        return
    }

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
	this.gitHubApi.repos.getCombinedStatusForRef({
		owner: this.repoOwner, 
		repo: this.repoName, 
		ref: sha
	}, function(error, result) {
    	if (error) { 
    		callback(error) 
    		return
    	}

    	var succeeded = result.data.state == "success"
    	callback(succeeded)
    });
}

GithubWrapper.prototype.mergePR = function(prNumber, method, callback) {
    Logger.log("Merging PR " + prNumber + " using " + method)

    if (global.debug) {
        callback("Debug: PR " + prNumber + " merged")
        return
    }

 	this.gitHubApi.pullRequests.merge({
		owner: this.repoOwner, 
		repo: this.repoName,
    	number: prNumber,
        merge_method: method,
	}, function(error, result) {
    	if (error) { 
    		callback(error) 
    		return
    	}
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

GithubWrapper.prototype.reviewReport = function(prNumber, callback) {
    this.gitHubApi.issues.getEventsTimeline({
        owner: this.repoOwner, 
        repo: this.repoName,
        issue_number: prNumber,
        per_page: 100
    }, function(error, result) {
        if (error) { 
            callback(error) 
            return
        }

        var reviews = {}
        for (var index in result.data) {
            var element = result.data[index]
            if (element.event != "reviewed") { continue }
            
            reviews[element.user.login] = element.state
        }

        callback(reviews)
    });
}

GithubWrapper.prototype.removeBranch = function(branchName, callback) {
    Logger.log("Removing branch " + branchName)
    if (global.debug) {
        callback("Debug: Branch " + branchName + " removed")
        return
    }

    var url = 'https://api.github.com/repos/' + this.repoOwner + '/' + this.repoName + '/git/refs/heads/' + branchName
    request({
        url: url,
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token ' + process.env.OAUTH_TOKEN,
            'User-Agent': 'mergebot'
        }
   }, function(err, res, body) {
        callback(err || "Branch successfully removed")
   })
}

module.exports = GithubWrapper;