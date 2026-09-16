mkdir -p source/uploads/optimized
for f in source/uploads/raw/*.jpg; do
  name=$(basename "${f%.*}")
  magick "$f" -resize "1600x1600>" -quality 75 "source/uploads/optimized/${name}.webp"
done