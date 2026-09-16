#!/usr/bin/env bash
set -euo pipefail

# =========================
# Hexo 图片压缩脚本
# 默认：
# - raw 目录：source/uploads/raw
# - optimized 目录：source/uploads/optimized
# - jpg/jpeg -> webp (quality=75)
# - png -> webp lossless
# - 长边限制：1600
# 依赖：ImageMagick（magick）
# =========================

RAW_DIR="${1:-source/uploads/raw}"
OUT_DIR="${2:-source/uploads/optimized}"
MAX_SIZE="${MAX_SIZE:-1600}"
JPEG_QUALITY="${JPEG_QUALITY:-75}"
PNG_MODE="${PNG_MODE:-lossless}"   # lossless | lossy
PNG_QUALITY="${PNG_QUALITY:-80}"   # 仅当 PNG_MODE=lossy 时使用

if ! command -v magick >/dev/null 2>&1; then
  echo "错误：未检测到 ImageMagick 的 magick 命令。"
  echo "先执行：brew install imagemagick"
  exit 1
fi

if [ ! -d "$RAW_DIR" ]; then
  echo "错误：原图目录不存在 -> $RAW_DIR"
  exit 1
fi

mkdir -p "$OUT_DIR"

processed=0
skipped=0
failed=0

echo "开始压缩..."
echo "RAW_DIR=$RAW_DIR"
echo "OUT_DIR=$OUT_DIR"
echo "MAX_SIZE=$MAX_SIZE"
echo "JPEG_QUALITY=$JPEG_QUALITY"
echo "PNG_MODE=$PNG_MODE"
echo

# 处理单个文件
process_file() {
  local src="$1"
  local rel="${src#$RAW_DIR/}"
  local rel_no_ext="${rel%.*}"
  local ext="${src##*.}"
  ext="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"

  local out="$OUT_DIR/$rel_no_ext.webp"
  local out_parent
  out_parent="$(dirname "$out")"
  mkdir -p "$out_parent"

  echo "处理：$src"

  case "$ext" in
    jpg|jpeg)
      if magick "$src" \
        -auto-orient \
        -strip \
        -resize "${MAX_SIZE}x${MAX_SIZE}>" \
        -quality "$JPEG_QUALITY" \
        "$out"; then
        processed=$((processed + 1))
      else
        echo "失败：$src"
        failed=$((failed + 1))
      fi
      ;;
    png)
      if [ "$PNG_MODE" = "lossless" ]; then
        if magick "$src" \
          -auto-orient \
          -strip \
          -resize "${MAX_SIZE}x${MAX_SIZE}>" \
          -define webp:lossless=true \
          "$out"; then
          processed=$((processed + 1))
        else
          echo "失败：$src"
          failed=$((failed + 1))
        fi
      else
        if magick "$src" \
          -auto-orient \
          -strip \
          -resize "${MAX_SIZE}x${MAX_SIZE}>" \
          -quality "$PNG_QUALITY" \
          "$out"; then
          processed=$((processed + 1))
        else
          echo "失败：$src"
          failed=$((failed + 1))
        fi
      fi
      ;;
    webp)
      # 已经是 webp，也统一做一次缩尺寸和 strip
      if magick "$src" \
        -auto-orient \
        -strip \
        -resize "${MAX_SIZE}x${MAX_SIZE}>" \
        "$out"; then
        processed=$((processed + 1))
      else
        echo "失败：$src"
        failed=$((failed + 1))
      fi
      ;;
    *)
      echo "跳过：不支持的格式 -> $src"
      skipped=$((skipped + 1))
      ;;
  esac
}

export RAW_DIR OUT_DIR MAX_SIZE JPEG_QUALITY PNG_MODE PNG_QUALITY
export -f process_file

# 遍历所有文件
while IFS= read -r -d '' file; do
  process_file "$file"
done < <(find "$RAW_DIR" -type f ! -name '.*' -print0)

echo
echo "完成。"
echo "成功处理：$processed"
echo "跳过文件：$skipped"
echo "失败文件：$failed"