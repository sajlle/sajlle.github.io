---
title: BugFix｜AgentV0Bug：OpenAI SDK的retry可能套娃～
date: 2026-09-14 15:36:08
categories:
  - BugFix
tags:
  - SDK integration
---
一开始我们定义，最多retry 1次。但是查询官方SDK之后发现：SDK有自己默认的retry。
如果应用层`retry 1`，SDK又`retry 2`，实际HTTP attempts 很可能跟我们定义的最多retry 1次不同。

后续明确:
```markdown
SDK是唯一的retry owner
configured retries = 1
max HTTP attempts = 2
timeout = 8s per attempt
```
测试的时候用fake HTTP provider真的去数请求次数。

这个Bug的重点就是：
> 第三方SDK不能只看接口能跑完就算完
