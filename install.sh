#!/bin/sh
set -eu
INKSPECT_INSTALL_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec python3 "$INKSPECT_INSTALL_ROOT/scripts/install.py" "$@"
