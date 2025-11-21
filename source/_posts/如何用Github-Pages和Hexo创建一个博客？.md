---
title: 如何用Github Pages和Hexo创建一个博客？
date: 2025-11-21 20:29:31
categories:
  - 技术手记
  - 博客搭建 
tags: 
  - Hexo
  - Github Pages
  - 博客搭建
  - 部署流程
  - Github Actions
  - 自动部署
---

### 登陆Git
#### 用Token当密码
1. 打开Github网页，登陆自己账号sajlle
2. 右上角头像 --> Settings
3. 左侧拉到最下方 --> Developer settings
4. 选Personal access tokens
5. 点击Generate new token
    - Note随便写，例如`hexo-blog`之类
    - Expiration：可以选90天
    - Scopes选：repo
6. 点生成
7. 复制这个Token，保存好（只会显示一次）
8. 这个Token就是以后`git push`时的密码

#### 新建Github仓库
1. 打开Settings，选择新建仓库
2. 仓库名称写成`username.github.io`
3. 选择公开
4. 新建仓库的时候，不要勾选
    - Add a README file
    - Add .gitignore
    - Add a license
否则后期给仓库推送博客的时候，会推送失败

### 保存一键脚本
```bash
#!/usr/bin/env bash

set -e

echo "====== Hexo + GitHub Pages 一键初始化脚本 ======"

# 1. 收集信息
read -rp "GitHub 用户名（例如 yourname）： " GH_USER
read -rp "仓库名（例如 yourname.github.io 或 my-blog）： " REPO_NAME
read -rp "本地博客目录名（例如 blog）： " BLOG_DIR

if [[ -z "$GH_USER" || -z "$REPO_NAME" || -z "$BLOG_DIR" ]]; then
  echo "有字段为空，请重新运行脚本。"
  exit 1
fi

# 2. 基础检查
command -v git >/dev/null 2>&1 || { echo "未检测到 git，请先安装 git。"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "未检测到 node，请先安装 Node.js。"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "未检测到 npm，请先安装 npm。"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "未检测到 npx，请确认 Node.js 版本在 8+。"; exit 1; }

if [[ -d "$BLOG_DIR" ]]; then
  echo "目录 $BLOG_DIR 已存在，请换一个目录名，或者先删除该目录。"
  exit 1
fi

# 3. 计算 url & root
if [[ "$REPO_NAME" == "$GH_USER.github.io" ]]; then
  BLOG_URL="https://$GH_USER.github.io"
  BLOG_ROOT="/"
  echo "检测到用户主页仓库，将以根域名部署：$BLOG_URL"
else
  BLOG_URL="https://$GH_USER.github.io/$REPO_NAME"
  BLOG_ROOT="/$REPO_NAME/"
  echo "检测到项目页仓库，将以子路径部署：$BLOG_URL"
fi

export BLOG_URL
export BLOG_ROOT
export GH_USER
export REPO_NAME

echo "==============================================="
echo "GitHub 用户名 : $GH_USER"
echo "仓库名        : $REPO_NAME"
echo "本地目录      : $BLOG_DIR"
echo "部署 URL      : $BLOG_URL"
echo "root          : $BLOG_ROOT"
echo "==============================================="

read -rp "确认以上信息无误？(y/N)： " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "已取消。"
  exit 1
fi

# 4. 初始化 Hexo
echo "👉 开始初始化 Hexo 项目..."
npx hexo-cli init "$BLOG_DIR"
cd "$BLOG_DIR"

echo "👉 安装依赖..."
npm install

echo "👉 安装 hexo-deployer-git..."
npm install hexo-deployer-git --save

# 5. 修改 _config.yml 的 url & root
echo "👉 配置 _config.yml 的 url & root..."

python3 << 'EOF'
import os
from pathlib import Path

cfg = Path("_config.yml")
text = cfg.read_text(encoding="utf-8").splitlines()

url = os.environ["BLOG_URL"]
root = os.environ["BLOG_ROOT"]

out = []
for line in text:
    stripped = line.strip()
    if stripped.startswith("url:"):
        out.append(f"url: {url}")
    elif stripped.startswith("root:"):
        out.append(f"root: {root}")
    else:
        out.append(line)

cfg.write_text("\n".join(out) + "\n", encoding="utf-8")
EOF

# 6. 配置 deploy 块
echo "👉 配置 Hexo 部署到 gh-pages 分支..."

cat >> _config.yml <<EOF

# ==== 自动添加的部署配置 ====
deploy:
  type: git
  repo: https://github.com/${GH_USER}/${REPO_NAME}.git
  branch: gh-pages
EOF

# 7. 初始化 git 仓库并关联远程
echo "👉 初始化 git 仓库并关联远程..."

git init
git add .
git commit -m "Init Hexo blog"

git branch -M main || true

git remote remove origin >/dev/null 2>&1 || true
git remote add origin "https://github.com/${GH_USER}/${REPO_NAME}.git"

echo "👉 本地仓库已初始化并绑定到：https://github.com/${GH_USER}/${REPO_NAME}.git"

# 8. 可选：立即推送
read -rp "是否现在推送到 GitHub？(y/N)： " PUSH_NOW
if [[ "$PUSH_NOW" == "y" || "$PUSH_NOW" == "Y" ]]; then
  echo "👉 正在推送 main 分支到远程..."
  git push -u origin main
  echo "✅ 推送完成。"
else
  echo "ℹ️ 你可以稍后手动执行： git push -u origin main"
fi

echo "==============================================="
echo "✅ Hexo 博客初始化完毕！"
echo
echo "下一步你可以："
echo "1) 本地写文章："
echo "   npx hexo new \"first-post\""
echo
echo "2) 本地预览："
echo "   npx hexo server   # 打开 http://localhost:4000"
echo
echo "3) 部署到 GitHub Pages（生成并推 gh-pages 分支）："
echo "   npx hexo generate && npx hexo deploy"
echo
echo "记得在 GitHub 仓库设置里，把 Pages 的 Source 设为：gh-pages 分支。"
echo "==============================================="

```

### 下载配置
1. 新建一个空目录，比如`my-blog`，把脚本放进去
```bash
mkdir my-blog    # 新建目录
cd my-blog    # 进入目录
vi setup_hexo_github_pages.sh   # 新建文件
```
2. 把脚本内容贴进去，保存。
3. 设置脚本执行权限
```bash
chmod +x setup_hexo_github_pages.sh
```
4. 运行脚本
```bash
./setup_hexo_github_pages.sh
```
5. 按照提示输入：
  - Github用户名
  - 仓库名称
  - 本地目录名称

6. 跑完之后，进入目录.
```bash
cd BLOG_DIR
npx hexo new "first-post"
npx hexo generate && npx hexo deploy
```
把Github仓库设置里的Pages的Source改成gh-pages分支，即可上线

### 推送分支
进入`BLOG_DIR`
```bash
cd /你的路径/BLOG_DIR
git push -u origin main
```
它会问你
```bash
Username for 'https://github.com': 
Password for 'https://sajlle@github.com': 
```
Username 输入 `sajlle`
Password 粘贴第一步生成的Token，这就推送成功啦


### 用Hexo部署到Github Pages
之后博客流程就是
1. 本地写文章
```bash
npx hexo new "first-post"
npx hexo generate
npx hexo deploy
```
2. 第一次部署之后，到Github仓库的：
    Settings --> Pages --> Source选
        - Branch: `gh-pages`
        - 目录：`/(root)`
等几分钟，用浏览器打开：`https:\\username.github.io`

### Github Actions自动部署博客
1. 确认hexo基础没问题，进入目录，运行
```bash
cd /你/的/路径/life-node-blog

# 安全一点，先把依赖装好
npm install

# 本地试跑一下
npx hexo clean
npx hexo generate
npx hexo server
```
打开浏览器：http://localhost:4000
——能看到页面就说明 Hexo 本体没问题。

看完 Ctrl + C 关掉服务。

2. 选一个主题，用Hexo NexT（稳定，好看，中文资料多）
2.1 安装主题
在`BLOG_DIR`目录执行
```bash
# 进到博客目录
cd /你/的/路径/BLOG_DIR

# 克隆主题到 themes/next
git clone https://github.com/next-theme/hexo-theme-next.git themes/next
```

2.2 启动主题
找到根目录的`_config.yml`文件，找到`theme: landscape`，换成`theme: next`

3. 手动部署一次Github Pages
3.1 只靠着Hexo生成静态文件
```bash
cd /你/的/路径/life-node-blog
npx hexo clean
npx hexo generate
```
这会生成`public/`目录，里面就是最终要给Github Pages用的静态文件

3.2 直接靠着Actions 推送gh-pages
套路如下：Hexo生成静态文件 --> Github Actions把`public/`推到`gh-pages`分支

3.3 开启Github Pages
1. 打开博客仓库
2. 点击博客顶部Settings
3. 左侧找到Pages
4. 在Build and Deployment --> Source里选择：
    - Deploy from a branch 
    - Branch: 选`gh-pages`
    - Directory: `/`
如果现在还没有 gh-pages 分支，不要慌，下面我们用 Actions 自动建。

4. GitHub Actions自动发布
目标：
你只要往 main 推代码，Actions 自动：
Node 环境 → 安装依赖 → hexo generate → 把 public 推到 gh-pages → GitHub Pages 自动上线。

创建 workflow文件
```bash
mkdir -p .github/workflows
```

新建 .github/workflows/deploy.yml，内容：
```bash
name: Deploy Hexo to GitHub Pages

permissions:
  contents: write   # 允许往仓库写（push gh-pages 分支用）

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci || npm install

      - name: Build hexo
        run: |
          npx hexo clean
          npx hexo generate

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
          publish_branch: gh-pages

```

提交并推送
```bash
cd /你/的/路径/BLOG_DIR

git add .
git commit -m "Add Hexo NexT theme and deploy workflow"
git push origin main

```
然后去 GitHub 仓库页面：
点 Actions 标签
能看到 Deploy Hexo to GitHub Pages workflow 在跑
等它变成 ✅ 绿色成功

成功后：仓库列表里会多一个 gh-pages 分支（不用你手动建）
GitHub Pages 自动从 gh-pages 读取