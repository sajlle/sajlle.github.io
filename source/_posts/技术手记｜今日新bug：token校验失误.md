---
title: 技术手记｜今日新bug：token校验失误
date: 2026-02-11 10:53:04
categories:
  - 技术手记
tags:
  - token
  - SHA256
  - BugFix
---
如题。（笑）。

昨儿我测试发现，cachedTokenId跟前端传的tokenId一样，为啥还是校验失败？
难道是pepper每次都随机生成一个新的，不是固定常量？（因为之前出现过类似错误，但我检查了一下pepper，没错哎）。

tokenId对得上，那传递没问题，问题就出在加密上了。
后续排查，发现，创建token存redis的时候，token = sha256(sha256(tokenId))，校验的时候，用的是token = sha256(tokenId)，我说怎么tokenId对了，但校验老失败。

另，出现这次问题，是因为写saveRefreshToken的时候，没有在文档里写清楚，存token还是存tokenId作校验。所以，写清楚文档，真的很必要啊（笑）