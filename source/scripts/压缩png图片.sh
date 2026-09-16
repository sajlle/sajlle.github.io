mkdir -p source/uploads/optimized
for f in source/uploads/raw/*.png; do
  name=$(basename "${f%.*}")
  magick "$f" -resize "1600x1600>" -define webp:lossless=true "source/uploads/optimized/${name}.webp"
done