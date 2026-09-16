---
title: BugFix｜AgentV0Bug：Timeline差点被当成状态迁移历史
date: 2026-09-14 15:41:07
categories:
  - BugFix
tags:
  - bug prevention
  - timeline
---
如题～

实际数据库只有：
```markdown
createdAt
updatedAt
refundTime
notifyTime
```

不能凭空给`updatedAt`瞎编一个：
```markdown
10:00:01 APPLYING
10:00:02 PROCESSING
```

所以最后叫`Evidence Timeline`，并且把`updatedAt`标记成`approximate`。
这个不是传统Bug，更近似于防止Agent编故事的bug prevention。