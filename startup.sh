#!/bin/bash
#
# This script supports the following environment vars:
#  - WEB_MEMORY: the amount of memory each
#    process is expected to consume, in MB.
#  - NODEJS_V8_ARGS: any additional args to
#    pass to the v8 runtime.

node_args="index.js --color"

if [[ -n "$WEB_MEMORY" ]]; then
  if [ $WEB_MEMORY -le 512 ]; then
    node_args="--max_semi_space_size=2 $node_args"
  elif [ $WEB_MEMORY -le 768 ]; then
    node_args="--max_semi_space_size=8 $node_args"
  elif [ $WEB_MEMORY -le 1024 ]; then
    node_args="--max_semi_space_size=16 $node_args"
  fi
  # mem_node_old_space=$((($WEB_MEMORY*4)/5))
  mem_node_old_space=$(($WEB_MEMORY/2))
  node_args="--max_old_space_size=$mem_node_old_space $node_args"
fi

if [[ -n "$NODEJS_V8_ARGS" ]]; then
  # Pass any additional arguments to v8.
  node_args="$NODEJS_V8_ARGS $node_args"
fi

echo "Starting app:"
echo "> node $node_args"

# Start the process using `exec`.
# This ensures that when node exits,
# the exit code is passed up to the
# caller of this script.
exec node $node_args