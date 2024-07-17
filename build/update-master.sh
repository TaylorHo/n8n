#!/bin/bash

UPSTREAM_ORIGIN_EXISTS=$(git remote -v | grep upstream)

if [ -z "$UPSTREAM_ORIGIN_EXISTS" ]; then
  echo "INFO: upstream repository not added, configuring..."
  git remote add upstream git@github.com:n8n-io/n8n.git
fi

git fetch upstream -q
echo "INFO: got changes from the upstream repository"

git checkout master -q
git merge upstream/master -q

rm -rf ../.github/
git add ../

echo "READY: Resolve conflicts on Code Editor."
