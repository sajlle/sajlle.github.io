---
title: BugFix｜AgentV0Bug：voucherInstance被LIMIT 1静默截断
date: 2026-09-13 17:31:21
categories:
  - BugFix
tags:
  - Agent
  - DB
---
项目事实层复用了 voucherInstanceMapper.getByOrderId，但是DB里，order_id只有普通索引，没有UNIQUE，理论上可能出现order1对应instanceA和instanceB。
但旧实现会告诉Agent，voucherInstance=A。

这导致的问题是「事实层偷偷替诊断层做了选择」。

后续修成了FactLookup<List<VoucherInstanceFact>>，把DB里所有记录完整保留。于是分层变成了
- Facts: 我查到了2条数据
- Diagnosis：一订单两条instance为范 cardinality invariant

概括一下就是：
> 做Agent事实投影的时候发现业务Mapper默认LIMIT 1，但DB没有唯一约束。如果直接复用，会让Agent在脏数据场景下丢失证据。后续没有改生产Mapper，而是诊断为read-side，增加全量查询，让Facts保留全部记录，再由deterministic invariant判断cardinality violation

