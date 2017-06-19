### MERGEBOT

Environment variables:
- `OAUTH_TOKEN`: Github OAuth Token
- `COMMIT_MESSAGE`: The commit message that will trigger the merge
- `SHOULD_MERGE`: Flag to detemine if the bot should merge or not (if not set, it just posts a comment)
- `ALERT_MESSAGE`: Message that is going to post when CI succeeds
- `SHOULD_REMOVE_BRANCH`: Flag that detemines if the branch should be deleted after the merge
