#!/bin/sh
DATE=$(git log -1 --format="%cd" --date=format:"%d/%m/%Y %H.%M.%S" "$GIT_COMMIT")
echo "Exs - $DATE"
