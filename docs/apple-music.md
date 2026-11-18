# 在文章里插入 Apple Music

使用 Apple 官方嵌入播放器，不需要安装新依赖或配置开发者密钥。

在文章 Markdown 中独立写一行（前后各空一行）：

```text
{% apple_music "Apple Music 分享链接" %}
```

也可以加一个标题，方便使用屏幕阅读器的读者识别播放器：

```text
{% apple_music "Apple Music 分享链接" "歌名 — 歌手" %}
```

在 Apple Music 中找到歌曲、专辑或歌单，选择「分享 → 拷贝链接」，将完整的
`https://music.apple.com/` 链接粘贴进去。也支持官方 `embed.music.apple.com` 链接。
链接中的地区会保留，不会一律替换成美区。短链接需要先在浏览器中打开，再复制完整地址。
单曲支持 `/song/…/ID` 以及专辑链接带 `?i=单曲ID` 两种格式。

建议放在 `<!-- more -->` 后面，让首页显示文章摘要，进入文章后再看到播放器。
播放器按需加载，默认不自动播放。外层卡片跟随博客配色；播放、账号登录及曲目内容由 Apple 提供。
本功能没有新增全站悬浮播放器，切换文章会中断播放。

## 本地试听

仓库中的 `source/_drafts/apple-music-preview.md` 是试听草稿，普通构建不会发布它。
在博客根目录运行：

```sh
npm run server -- --draft --ip 127.0.0.1 --port 4001
```

打开 <http://127.0.0.1:4001/music-preview/>，点击卡片内的播放按钮。
该命令会在本机预览草稿，按 Ctrl+C 停止。正常发布仍使用原有流程，不要加 `--draft`。

未登录访客可试听，完整播放需要访客自己的有效 Apple Music 订阅和登录状态，
并受地区、曲目可用性及浏览器策略影响。需要登录时由读者在 Apple 页面中操作；
博客不收集 Apple 账号或密码。播放器暂时不可用时，可使用卡片下方「在 Apple Music 中打开」。

参考：[Apple 官方嵌入播放器说明](https://artists.apple.com/support/1117-apple-music-marketing-tools)、
[Hexo 标签 API](https://hexo.io/api/tag)。
