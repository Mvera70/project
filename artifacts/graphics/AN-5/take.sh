#!/bin/bash
# AN-5 · Ruedo una toma con el observatorio, aislada y con su log (como AN-4b).
#   take.sh <nombre> <argumentos del observatorio sin --out>
cd /home/user/project || exit 99
export VALLEY_CHROMIUM=/opt/pw-browsers/chromium
name="$1"; shift
out="artifacts/graphics/AN-5/$name"
log="artifacts/graphics/AN-5/logs/$name.log"
rm -rf "$out" "$log"
echo "CMD: node tools/graphics/observe-life.mjs $* --out $out" > "$log"
echo "INICIO $(date +%H:%M:%S)" >> "$log"
timeout 2400 node tools/graphics/observe-life.mjs "$@" --out "$out" >> "$log" 2>&1
echo "rc=$?" >> "$log"
