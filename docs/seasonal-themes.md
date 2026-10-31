# 博客节日主题

在根目录 `_config.yml` 中选择 `seasonalTheme`，然后运行 `npm run build`。
这是整站构建时的选择；不会按日期自动切换，也不改变 NexT 的布局。

| 配置值 | 主题 | 独立文件 |
| --- | --- | --- |
| `original` | 原始 NexT 外观，保留系统明暗偏好 | 不加载节日样式或装饰 |
| `mid-autumn` | 中秋月夜 | `source/_data/mid-autumn-theme.styl`、同名 `.njk` |
| `halloween` | 万圣节·南瓜夜读 | `source/_data/halloween-theme.styl`、同名 `.njk` |
| `autumn` | 11 月·深秋书房 | `source/_data/autumn-theme.styl`、同名 `.njk` |

例如，切回中秋版：

```yaml
seasonalTheme: mid-autumn
```

四套选项互斥。中秋的原始样式与装饰文件保持不变；新增节日主题不覆盖已有主题。
未配置 `seasonalTheme` 时，仍兼容旧版的 `midAutumnTheme: true/false`。
如果同时配置两者，以 `seasonalTheme` 为准。

万圣节版复用 NexT 官方的 `theme_inject` 自定义入口和现有的深色代码高亮，
橙色 `#FFB86C` 与紫色 `#BD93F9` 参考 [Dracula 色板](https://draculatheme.com/contribute)，
没有新增运行时依赖。南瓜放在站名旁，页头保留琥珀月亮和蝙蝠；
桌面页面空白边缘增加南瓜灯与暖光，宽度不足 1280px 时隐藏边缘装饰，避免挡住正文。
所有装饰不捕获鼠标事件，并在辅助技术、打印和强制颜色模式下隐藏。

11 月版使用燕麦背景、暖白卡片、焦糖链接与鼠尾草绿，页头放置落叶、台灯，
并写上「一个人，也好好生活」。切换时使用 `seasonalTheme: autumn`。
它与万圣节版共用站名装饰、卡片边框圆角和标题悬停效果；不会覆盖中秋版。

当前默认选择万圣节版。构建只更新本地 `public/`，发布继续使用已有部署流程。
