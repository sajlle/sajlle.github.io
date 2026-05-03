---
title: 让Codex帮我审代码 ｜ Codex帮我填平了404/击穿/缓存被删的坑
date: 2026-01-09 18:52:00
categories:
  - 技术手记
tags:
  - Java
  - 缓存
  - Codex
  - Redis
---
Codex帮我改了几个地方，我复盘如下：
# lockKey的前缀从`CACHE_KEY_PREFIX`改成`LOCK_KEY_PREFIX`
改了之后，缓存和锁物理上隔离：
- 缓存Key：`cache:shop:{id}`存真实JSON
- 锁Key：`lock:shop:{id}`存锁占用标记
这属于缓存并发的底层卫生，锁是锁，缓存是缓存。

不改会导致：
- 一个key既当缓存，又当锁。

会同时引发三类事故：
- 缓存存在时，永远拿不到锁 --> 逻辑分支直接走歪
  - `SETNX(cache:shop:1, "1")`在缓存已经存在时会失败
  - 永远进不去回源DB的分支，`shop`可能一直是null，后续很容易触发写空值缓存/返回null的逻辑。造成明明有店铺却返回不存在（假404）
- 缓存不存在时，锁把缓存Key写成`"1"`，下一次读缓存会读到垃圾