---
title: BugFix｜AgentV0Bug：REFUND_INSTANCE_USED_CONFLICT很诱人，但没证据就不去实现
date: 2026-09-14 15:44:58
categories:
  - BugFix
tags:
  - Agent证据建模
---
因为DB持久化的数据不足以证明`USED`，究竟发生在退款冻结前还是退款之后，所以没有为了Agent显得很牛来硬判。
算是主动删除了一条看起来很亮，但没办法呗证据确定支持的规则。