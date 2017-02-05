#!/bin/bash

# Run Caddy & the TypeScript compiler in watch mode

tsc -w -p . &
caddy
