### MERGEBOT

Environment variables:
- `BUDDYBUILD_APP_ID`: Buddybuild App ID
- `BUDDYBUILD_GROUP_ID`: Buddybuild Group ID
- `BUDDYBUILD_TOKEN`: Buddybuild Bearer token
- `EMAIL_DOMAINS`: Buddybuild distribution lists allowed email domains
- `COMMIT_MESSAGE`: The commit message that will trigger the merge
- `GITHUB_ALERT_MESSAGE`: Message that is going to post when CI succeeds
- `GITHUB_BOT_USER`: Github user to be mentioned when willing to execute mergebot
- `GITHUB_OAUTH_TOKEN`: Github OAuth Token
- `GITHUB_REPO_NAME`: Github repository name
- `GITHUB_REPO_OWNER`: Github reposotory owner (either the organization or the user)
- `SHOULD_MERGE`: Flag to detemine if the bot should merge or not (if not set, it just posts a comment)
- `SHOULD_REMOVE_BRANCH`: Flag that detemines if the branch should be deleted after the merge
- `SLACK_BOT_TOKEN`: Slack bot custom integration token
- `SLACK_CHANNEL`: Slack channel where automatic posts should take place

Custom users mapping:

If there's a user with different users in github than in slack, you can do mappings for Slack to be able to ping them

- `<Github username>`: `<Slack username>`