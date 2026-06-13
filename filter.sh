#!/bin/sh
if [ ! -f /tmp/date_counter_3 ]; then
    echo 1780272000 > /tmp/date_counter_3
fi
CURRENT_DATE=$(cat /tmp/date_counter_3)
# random increment between 10000 and 25000 seconds
NEW_DATE=$((CURRENT_DATE + 10000 + ($RANDOM % 15000)))
echo $NEW_DATE > /tmp/date_counter_3

export GIT_AUTHOR_DATE="$NEW_DATE +0700"
export GIT_COMMITTER_DATE="$NEW_DATE +0700"
