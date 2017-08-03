#!/bin/bash

# Helper script used by .gitlab-ci.yml
#
# Start a script using the timeout command.  If the command is
# terminated by the timeout command (exit code 143), return 0
# (success).  If the script terminated for any other reason,
# return the actual exit code.
#
# Ideally, GitLab CI would make it possible to control build status by
# specific exit codes, as in this (currently open) Issue:
#   https://gitlab.com/gitlab-org/gitlab-ce/issues/25738

timeout --preserve-status $@
RETVAL=$?
if [ $RETVAL = 143 ]; then
    exit 0
else
    exit $RETVAL
fi
