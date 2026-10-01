#!/usr/bin/env node
'use strict';

// 节点人生博客快捷命令：新建 / 打开 / 检查并发布，不用再手动找目录。
// 安装：ln -sf "$PWD/tools/blog.js" ~/.local/bin/blog
// 发布 = 提交 source/ 并推送 main，之后由 .github/workflows/deploy.yml 构建上线。

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const readline = require('readline/promises');

const BLOG_DIR = process.env.BLOG_DIR || path.resolve(__dirname, '..');
const SOURCE_DIR = path.join(BLOG_DIR, 'source');
const POSTS_DIR = path.join(SOURCE_DIR, '_posts');
const EDITOR_APP = process.env.BLOG_EDITOR || 'MarkEdit';

// 复用博客自己 node_modules 里的 Hexo 工具，保证文件名、front-matter 解析和 hexo 一致
const requireLocal = name => require(require.resolve(name, { paths: [BLOG_DIR] }));
const { slugize } = requireLocal('hexo-util');
const frontMatter = requireLocal('hexo-front-matter');
const yaml = requireLocal('js-yaml');

const HELP = `用法：blog <命令>

  blog new [标题] [-t 标签1,标签2]   新建文章并用 ${EDITOR_APP} 打开
                                     标题里「｜」前面的部分自动当分类
  blog edit [关键词]                 找文章打开；不带关键词列出最近修改的
  blog publish [提交说明] [-y]       检查 → 提交 → 推送 → 等新文章上线
  blog preview                       本地预览 http://localhost:4000
  blog img                           压缩 source/uploads/raw 的原图到 optimized

简写：n / e / p / s
标题里有空格或英文 ? * 时记得加引号。`;

class CliError extends Error {}
const fail = message => { throw new CliError(message); };
const pad = n => String(n).padStart(2, '0');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function git(...args) {
  return execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: BLOG_DIR, encoding: 'utf8' });
}

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: BLOG_DIR, stdio: 'inherit' }).status === 0;
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('SIGINT', () => {
    console.log('\n已取消。');
    process.exit(130);
  });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

// 把 ["标题", "-t", "a,b"] 拆成 { text: "标题", tags: [...], yes: false }
function parseArgs(args) {
  const words = [];
  const tags = [];
  let yes = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-y' || arg === '--yes') yes = true;
    else if (arg === '-t' || arg === '--tags') tags.push(...(args[++i] || '').split(/[,，]/));
    else words.push(arg);
  }
  return { text: words.join(' ').trim(), tags: tags.map(t => t.trim()).filter(Boolean), yes };
}

function openInEditor(file) {
  if (!run('open', ['-a', EDITOR_APP, file])) run('open', [file]);
  console.log(`已打开：${path.relative(BLOG_DIR, file)}`);
}

function formatDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
    + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 能原样写进 YAML 就不加引号（和现有文章风格一致），否则用双引号转义
function yamlScalar(value) {
  try {
    if (yaml.load(`v: ${value}`).v === value) return value;
  } catch {}
  return JSON.stringify(value);
}

function yamlList(key, items) {
  return items.length ? `${key}:\n${items.map(item => `  - ${yamlScalar(item)}`).join('\n')}` : `${key}:`;
}

function buildPost(title, tags, date = new Date()) {
  const sep = title.indexOf('｜');
  const categories = sep > 0 ? [title.slice(0, sep).trim()] : [];
  return [
    '---',
    `title: ${yamlScalar(title)}`,
    `date: ${formatDate(date)}`,
    yamlList('categories', categories),
    yamlList('tags', tags),
    '---',
    '',
    ''
  ].join('\n');
}

// 与 _config.yml 的 new_post_name: :title.md 保持一致
function postFileFor(title) {
  const slug = slugize(title);
  if (!slug) fail('标题全是特殊符号，生成不了文件名。');
  return path.join(POSTS_DIR, `${slug}.md`);
}

function listPosts() {
  return fs.readdirSync(POSTS_DIR)
    .filter(name => name.endsWith('.md'))
    .map(name => {
      const file = path.join(POSTS_DIR, name);
      return { file, name: name.slice(0, -3), mtime: fs.statSync(file).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function siteUrl() {
  const config = yaml.load(fs.readFileSync(path.join(BLOG_DIR, '_config.yml'), 'utf8'));
  return String(config.url || '').replace(/\/+$/, '');
}

function actionsUrl() {
  const remote = git('remote', 'get-url', 'origin').trim();
  const match = remote.match(/github[^:/]*[:/](.+?)(?:\.git)?$/);
  return match ? `https://github.com/${match[1]}/actions` : remote;
}

// permalink: :year/:month/:day/:title/，:title 是 _posts 下去掉 .md 的相对路径
function postUrl(file, date) {
  const slug = path.relative(POSTS_DIR, file).replace(/\.md$/, '');
  const ymd = `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  return `${siteUrl()}/${ymd}/${slug.split(path.sep).map(encodeURIComponent).join('/')}/`;
}

function isGitIgnored(file) {
  return spawnSync('git', ['check-ignore', '-q', file], { cwd: BLOG_DIR }).status === 0;
}

function checkImages(content, label) {
  const body = content
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1/gm, '')
    .replace(/`[^`\n]*`/g, '');
  const refs = [];
  for (const m of body.matchAll(/!\[[^\]]*\]\(\s*<?((?:[^()\s<>]|\([^()\s]*\))+)>?/g)) refs.push(m[1]);
  for (const m of body.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi)) refs.push(m[1]);

  const errors = [];
  for (const ref of refs) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref)) continue;
    let target = ref.split(/[?#]/)[0];
    try {
      target = decodeURIComponent(target);
    } catch {}
    // Hexo 会把相对路径前面补上站点根（../uploads → /../uploads），浏览器再归一化成 /uploads，
    // 所以站点上的图片一律按 source/ 根目录解析
    const sitePath = path.posix.normalize(`/${target}`);
    const local = path.join(SOURCE_DIR, sitePath);
    if (!fs.existsSync(local)) {
      errors.push(`${label}：图片不存在 → ${ref}`);
    } else if (sitePath.startsWith('/uploads/raw/') || isGitIgnored(local)) {
      errors.push(`${label}：这张图不会被上传（原图目录或被 .gitignore 忽略），先 blog img 压缩后引用 optimized 里的 → ${ref}`);
    }
  }
  return errors;
}

function checkPost(file) {
  const label = path.basename(file);
  const raw = fs.readFileSync(file, 'utf8');
  if (!/^---\r?\n/.test(raw)) return { errors: [`${label}：开头缺少 front-matter（---）`] };

  let data;
  try {
    data = frontMatter.parse(raw);
  } catch (err) {
    return { errors: [`${label}：front-matter 格式错误：${err.message.split('\n')[0]}`] };
  }

  const errors = [];
  if (!data.title) errors.push(`${label}：缺少 title`);
  const date = data.date instanceof Date && !isNaN(data.date) ? data.date : null;
  if (!date) errors.push(`${label}：缺少 date，或格式不对（应为 YYYY-MM-DD HH:mm:ss）`);
  errors.push(...checkImages(data._content, label));
  return { errors, title: String(data.title || label), url: date && postUrl(file, date) };
}

// 相对 HEAD 的所有改动（含已暂存、未暂存、未跟踪），只看 source/
function collectChanges() {
  const names = { A: '新增', M: '修改', D: '删除', T: '修改' };
  const changes = [];
  const parts = git('diff', '--name-status', '--no-renames', '-z', 'HEAD', '--', 'source').split('\0');
  for (let i = 0; i + 1 < parts.length; i += 2) {
    changes.push({ status: names[parts[i]] || parts[i], rel: parts[i + 1] });
  }
  for (const rel of git('ls-files', '--others', '--exclude-standard', '-z', '--', 'source').split('\0')) {
    if (rel) changes.push({ status: '新增', rel });
  }
  return changes;
}

async function waitUntilLive(urls) {
  process.stdout.write('等待新文章上线（一般 1–3 分钟，Ctrl+C 退出不影响发布）');
  const deadline = Date.now() + 6 * 60 * 1000;
  while (Date.now() < deadline) {
    const live = await Promise.all(urls.map(url =>
      fetch(`${url}?t=${Date.now()}`, { method: 'HEAD' }).then(res => res.ok, () => false)));
    if (live.every(Boolean)) {
      console.log(' ✓ 已上线');
      return;
    }
    process.stdout.write('.');
    await sleep(10 * 1000);
  }
  console.log(`\n6 分钟了还没上线，去 Actions 看看构建日志：${actionsUrl()}`);
}

async function cmdNew(args) {
  const { text, tags } = parseArgs(args);
  const title = text || await ask('标题：');
  if (!title) fail('标题不能为空。');

  const file = postFileFor(title);
  if (fs.existsSync(file)) {
    console.log('同名文章已存在，直接打开它。');
    return openInEditor(file);
  }
  fs.writeFileSync(file, buildPost(title, tags));
  openInEditor(file);
  console.log('写完运行 blog publish 发布。');
}

async function cmdEdit(args) {
  const keyword = parseArgs(args).text.toLowerCase();
  const posts = listPosts().filter(post => post.name.toLowerCase().includes(keyword));
  if (!posts.length) fail(`没找到文件名包含「${keyword}」的文章。`);
  if (keyword && posts.length === 1) return openInEditor(posts[0].file);

  const shown = posts.slice(0, 15);
  shown.forEach((post, i) => console.log(`${String(i + 1).padStart(3)}. ${post.name}`));
  if (posts.length > shown.length) console.log(`     …还有 ${posts.length - shown.length} 篇，加个关键词缩小范围`);
  const picked = shown[Number(await ask('打开第几篇？[1] ') || 1) - 1];
  if (!picked) fail('序号不对。');
  openInEditor(picked.file);
}

async function cmdPublish(args) {
  const { text, yes } = parseArgs(args);
  const branch = git('rev-parse', '--abbrev-ref', 'HEAD').trim();
  if (branch !== 'main') fail(`当前在 ${branch} 分支，自动部署只认 main，先切回 main。`);

  const changes = collectChanges();
  if (!changes.length) {
    console.log('source/ 下没有改动，没什么要发布的。');
    return;
  }
  console.log('将发布以下改动：');
  for (const { status, rel } of changes) console.log(`  ${status}  ${rel}`);

  const posts = changes
    .filter(c => c.status !== '删除' && c.rel.startsWith('source/_posts/') && c.rel.endsWith('.md'))
    .map(c => ({ ...c, ...checkPost(path.join(BLOG_DIR, c.rel)) }));
  const errors = posts.flatMap(post => post.errors);
  if (errors.length) {
    console.log('\n检查没通过：');
    for (const err of errors) console.log(`  ✗ ${err}`);
    fail('改好再发布。');
  }
  if (posts.length) console.log(`\n✓ ${posts.length} 篇文章检查通过（front-matter、图片路径）`);

  const lead = posts.find(post => post.status === '新增') || posts[0];
  let message = text || (posts.length === 1 ? `- ${lead.title}`
    : posts.length ? `- ${lead.title} 等 ${posts.length} 篇` : '- 更新博客资源');
  if (!yes) message = await ask(`提交说明（回车 = ${message}，Ctrl+C 取消）：`) || message;

  git('add', '-A', '--', 'source');
  // 只提交 source/，不带上其他暂存区里的东西（比如 .idea）
  if (!run('git', ['commit', '-m', message, '--', 'source'])) fail('提交失败，看上面的报错。');

  if (!run('git', ['push', 'origin', 'HEAD:main'])) {
    console.log('推送被拒，先同步远端再推一次…');
    if (!run('git', ['pull', '--rebase', '--autostash', 'origin', 'main'])) {
      fail('同步远端失败（可能有冲突），手动处理后再 git push。提交已在本地，不会丢。');
    }
    if (!run('git', ['push', 'origin', 'HEAD:main'])) fail('推送失败，看上面的报错。提交已在本地，不会丢。');
  }

  console.log(`\n已推送，GitHub Actions 正在构建：${actionsUrl()}`);
  for (const post of posts) console.log(`  ${post.status}  ${post.title}\n        ${post.url}`);
  const fresh = posts.filter(post => post.status === '新增').map(post => post.url);
  if (fresh.length) await waitUntilLive(fresh);
}

const COMMANDS = {
  new: cmdNew,
  n: cmdNew,
  edit: cmdEdit,
  e: cmdEdit,
  open: cmdEdit,
  publish: cmdPublish,
  pub: cmdPublish,
  p: cmdPublish,
  preview: () => run('npx', ['hexo', 'server', '--open']),
  server: () => run('npx', ['hexo', 'server', '--open']),
  s: () => run('npx', ['hexo', 'server', '--open']),
  img: () => {
    run('bash', ['source/scripts/compress_images.sh']);
    console.log('\n文章里这样引用：![说明](../uploads/optimized/文件名.webp)');
  }
};

async function main([command, ...args]) {
  const handler = COMMANDS[command];
  if (!handler) {
    console.log(HELP);
    if (command && !['help', '-h', '--help'].includes(command)) process.exitCode = 1;
    return;
  }
  await handler(args);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch(err => {
    console.error(err instanceof CliError ? `✗ ${err.message}` : err);
    process.exit(1);
  });
}

module.exports = { buildPost, postFileFor, checkPost, collectChanges, parseArgs };
