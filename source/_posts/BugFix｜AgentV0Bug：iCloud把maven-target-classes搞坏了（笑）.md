---
title: BugFix｜AgentV0Bug：iCloud把maven target/classes搞坏了（笑）
date: 2026-09-13 17:59:32
categories:
  - BugFix
tags:
  - iCloud
---
这个可以说是目前遇到的最难定位的问题No.1～

症状比较离谱～
```markdown
RefundMapper
VoucherKeyBuilder
SeckillReservationOutboxPersistenceService
ReservationExceptionRecordDTO
```
几个毫无关系的老类，在第二轮`mvn clean verify`里随机出现`ClassNotFoundException` `NoClassDefFoundError`
但是`.class`明明存在。而且更诡异的是`failsafe-reports` 构建结束之后还在消失。

最后做forensic：
- 查Failsafe effective config
- 查有没有测试删target
- hash `.class`
- 查`ctime` `mtime`
- 查File Provider
- 发现项目在iCloud Drive File Provider domain
- 失败窗口iCloud正在大量`apply-changes`
- 把同一`working tree`复制到`/private/tmp`
一通操作之后，连续 332/332，三次测试全绿。

总结一下就是：
> V0 release gate曾经随机出现多个互不关联旧类的ClassNotFoundException。我排除了Failsafe，源码，和class hash之后，发现项目目录属于iCloud File Provider，构建期间同步进程还在修改target和failsafe reports。把同一working tree目录复制到非同步 `/private/tmp/`之后连续三次测试全绿，最后定位为构建目录环境干扰，而不是业务代码或者maven配置问题～

