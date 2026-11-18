#!/bin/bash
# usage: cut.sh page3.mp4 page4.mp4 outdir   — crops each Canva video tile into its own clip
set -e
P3="$1"; P4="$2"; OUT="$3"; mkdir -p "$OUT"
W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$P3")
S=$(echo "$W/1366" | bc -l)
crop() { # src name left top w h
  local x=$(printf %.0f $(echo "$3*$S+2" | bc -l)) y=$(printf %.0f $(echo "$4*$S+2" | bc -l))
  local w=$(printf %.0f $(echo "($5*$S-4)/2" | bc -l)) h=$(printf %.0f $(echo "($6*$S-4)/2" | bc -l))
  w=$((w*2)); h=$((h*2))
  ffmpeg -v error -y -i "$1" -t ${DUR:-24} -an -vf "crop=$w:$h:$x:$y,fps=30" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart "$OUT/$2.mp4"
  ffmpeg -v error -y -ss 1.2 -i "$OUT/$2.mp4" -frames:v 1 -q:v 4 "$OUT/$2.jpg"
}
i=1; for top in 190 471; do for left in 60 228 396 564 732 900; do
  crop "$P3" "ugc-$(printf %02d $i)" $left $top 150 267; i=$((i+1)); done; done
crop "$P4" clay 700 40 190 338
i=1; for left in 520 688 856 1024 1192; do crop "$P4" "brand-$(printf %02d $i)" $left 460 150 267; i=$((i+1)); done
