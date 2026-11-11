#!/usr/bin/env bash
# Todas las pruebas: motor (Node), interfaz (Chromium) y, con --sim, la simulación de equilibrio.
set -e
cd "$(dirname "$0")/../.."
node tools/qa/engine.test.mjs
node tools/qa/smoke.mjs "${1:-/tmp}"
if [ "$2" = "--sim" ]; then node tools/qa/sim.mjs 40; fi
