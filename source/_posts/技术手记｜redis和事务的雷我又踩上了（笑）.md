---
title: 技术手记｜redis和事务的雷我又踩上了（笑）
date: 2026-02-05 19:43:51
categories:
  - 技术手记
tags:
  - Spring
  - 事务
  - 缓存
---

如题。
我代码的逻辑是：
1. redis（读写）
2. DB读写（封装了private方法）
3. redis（读写）

这涉及两个问题：
1. private方法加事务，无效，因为Spring事务是走AOP的，但AOP不拦截private方法。就算加了@Transactional注解，也不会拦截。
2. redis + DB事务，DB回滚，但redis没有回滚，导致数据不一致。

问题一改法：
1. 把事务加到调用private方法的public方法
2. 使用AspectJ，绕过Spring AOP的public限制

问题二改法：
1. 使用afterCommit，在提交事务之后再更新redis的值