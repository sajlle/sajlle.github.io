---
title: 日常记录｜搞完创伤数据复盘，忽然想到其他事儿是不是也能做Personal Data Warehouse + Analyst Agent
date: 2026-08-28 11:28:24
categories:
  - 日常记录
tags:
  - 大数据
  - AI
---
基本思路就是：
> 我提供原始事件 → AI帮我规范化 → 建时间线/实体关系/标签 → 做聚合统计 → 找模式 → 提出假设 → 再回原始数据验证。

举个例子：
```markdown

Raw Personal Data
    ↓
PersonalFactAssembler
    ↓
TimelineBuilder
    ↓
Pattern / Invariant Evaluator
    ↓
MissingEvidenceDetector
    ↓
LLM Analyst
    ↓
insights / hypotheses / questions
```

输入数据结构可以做成类似的：
```json
{
  "date": "2026-08-27",
  "domain": "career",
  "eventType": "PROJECT_DECISION",
  "entities": ["CouponFlow", "Agent"],
  "facts": {
    "decision": "先做状态机侦探内核",
    "reason": "确定性工程优先于自由规划"
  },
  "stateBefore": "...",
  "stateAfter": "...",
  "confidence": 0.9,
  "source": "conversation",
  "tags": ["agent", "architecture", "decision"]
}
```

**然后能做的几个库**：
- 职业数据库： JD、HR 联系、岗位薪资、技术要求、投递、面试结果、每阶段技能 → 最后能查“什么技能实际上提高了面试命中率”“哪些岗位只是看起来高薪但匹配度低”。
- 学习数据库：算法题、八股、项目 bug、学习时长、第二次是否会做 → 可以找遗忘曲线、最有效学习方式、知识薄弱节点。
- 研发数据库：每次架构决策、bug、事故、修复、trade-off → 最后能反向生成“工程决策史”和面试案例库。
- 写作数据库：文章主题、素材、句子、阅读、反馈 → 找最稳定的母题、叙事结构甚至哪些素材反复出现。
- 生活状态数据库：睡眠、工作量、出门、运动、情绪主观评分等 → 可以研究相关性，比如“什么组合最容易让我第二天进入高产状态”。这里要注意只能做相关性探索，不能拿它替代医学判断。
- 人际事件数据库：发生了什么、谁做了什么、我的反应、结果 → 能区分“我的印象”与“对方长期行为模式”，避免单次事件把判断带偏。
- 消费/设备/工作环境数据库：买了什么、使用频率、解决什么问题 → 最后甚至能发现自己到底在哪些东西上花钱最值（笑）。

还可以维护几个派生图，比如：
```markdown
events              原始事件
people              人物实体
projects            项目
decisions           重大决策
claims              我目前相信的判断
evidence            支持/反对某判断的证据
states              某段时期状态
metrics             可量化指标
open_questions      尚未解决的问题
```

