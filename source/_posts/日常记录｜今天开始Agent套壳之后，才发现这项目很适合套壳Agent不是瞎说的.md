---
title: 日常记录｜今天开始Agent套壳之后，才发现这项目很适合套壳Agent不是瞎说的
date: 2026-09-07 15:21:28
categories:
  - 日常记录
tags:
  - Agent
---
如题～
很多东西Agent套壳的时候拿来就能用。

举个例子：
1. 不变量已经是显式的。不需要花很多功夫提炼不变量。
2. 渠道有mock版本，可控。Mock版本的notifyController接受任意的objectStatus，通知去重复靠着channel&notify_id，agent换notify_id就是重新投递，不换就是重复通知，乱序，终态冲突全都能注入。不需要真实第三方渠道
3. 证据面完整，riskEvent里，stateSnapshot/payloadSnapshot/stackTrace/traceId/dedupKey之类的字段齐全。做incident-to-regression和侦探agent拿来就能用
4. 测试不光依赖Mockito单测，还有Testcontainers，后续做其他方案，产物需要起MySQL+Redis的集成测试，现有地基很方便。