#!/bin/sh
export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch -f --env-filter "$(cat filter.sh)" -- --all
