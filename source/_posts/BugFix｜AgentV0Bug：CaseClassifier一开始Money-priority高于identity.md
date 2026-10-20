---
title: BugFix｜AgentV0Bug：CaseClassifier一开始Money priority高于identity
date: 2026-09-14 15:29:29
categories:
  - BugFix
tags:
  - CaseClassifier
  - 工程判断
---
原始precedence是 `Money mismatch -> Identity mismatch`；
后续发现逻辑上写反了。

如果：`refund.transactionId != payment.transactionId`，那首先该确认：「这是不是同一笔交易？」。即使这时候金额也不同：`refundAmount != paymentAmount`，Money violation可以保留，但它不该成为primary diagnosis。

于是改成：
```markdown
Identity
-> Money
-> Cardinality
-> State
-> Evidence
-> Normal
```

而且专门做了测试：
```markdown
Identity + Money 同时存在
两条violation都保留
primary = Identity
并且不受violation list顺序影响
```

这个Bug的重点是：
> 异常分类不是按照严重程度随便排序，要按推理依赖关系来排序