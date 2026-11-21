---
title: 日常记录｜认真找Qwen 3.5 9B写了一下WeightedPermitPool，结果不给约束写的错，给了约束写不出
date: 2026-11-21 20:52:49
categories:
  - 日常记录
tags:
  - Qwen
---

如题。

上一篇[段子](https://sajlle.github.io/2026/11/21/%E8%84%91%E6%B4%9E%EF%BD%9CHugging-Face-%C2%B7-%E6%A8%A1%E5%9E%8B%E5%BA%B7%E5%A4%8D%E4%B8%AD%E5%BF%83/)写 Qwen 写 `WeightedPermitPool` 代码过不了编译，权重不生效，锁的状态不对，超时和关闭都问题严重。

我当时给的 Prompt 是：

```markdown
写一个加权许可池，WeightedPermitPool。用Java。
```

于是效果如上。

我后续一想，也许约束给得不清晰，贸然判断 Qwen 不行不大严谨，于是换了一个版本的 Prompt（太长，放到文章末尾了）。结果它思考了 49 个步骤，终于成功地死机了。代码都没出来。

全在「我想想，wait, actually, But wait, Wait, one detail, Wait, one detail……」了。

最经典的一段摘出来：

> `Condition.await()` 返回后，还持有锁吗？  
> Wait，不持有？  
> Wait，应该持有？  
> Yes，持有。  
> Wait，真的吗？  
> Yes！

实际上，`Condition.await()` 返回前会重新获取关联的锁。它大部分的思考就这样，反复推翻自己已经想清楚的思路，然后不停地 wait，最后交白卷了。（也就是代码一行没写～）

### 第二次给千问的 Prompt

````markdown
# IC01｜WeightedPermitPool（加权许可池）

**语言：** Java 21  
**题型：** 并发编程、线程同步、资源生命周期管理  
**交付物：** `WeightedPermitPool.java`

## 一、问题描述

请实现一个线程安全的加权许可池 `WeightedPermitPool`。

许可池维护固定的总容量 `capacity`。每个线程可以一次申请 `units` 个许可。只有当前可用许可数量足够时，才能一次性获取全部请求的许可。

例如，许可池总容量为 10：

- 线程 A 申请 6 个许可，成功，剩余 4。
- 线程 B 申请 4 个许可，成功，剩余 0。
- 线程 C 申请 3 个许可，必须等待。
- A 归还 6 个许可后，C 可以成功获取 3 个。

**禁止部分获取许可。**

## 二、必须实现的 API

```java
public final class WeightedPermitPool implements AutoCloseable {

    public WeightedPermitPool(int capacity);

    public Lease acquire(int units)
            throws InterruptedException;

    public Lease tryAcquire(int units, long timeoutMillis)
            throws InterruptedException;

    public int available();

    @Override
    public void close();

    public interface Lease extends AutoCloseable {
        int units();

        @Override
        void close();
    }
}
```

可以增加必要的私有字段、辅助方法和内部类，但必须保留上述公开接口。

## 三、功能及正确性要求

### 1. 参数校验

- `capacity` 必须大于 0。
- `units` 必须满足 `1 <= units <= capacity`。
- `timeoutMillis` 不得为负数。
- 不合法参数抛出 `IllegalArgumentException`。

### 2. 获取许可

`acquire(int units)`：

- 资源充足时，原子地扣减 `units` 并返回独立的 `Lease`。
- 资源不足时阻塞等待。
- 等待期间若线程被中断，抛出 `InterruptedException`。
- 等待期间若许可池被关闭，抛出 `IllegalStateException`。
- 中断或失败不得造成许可泄漏。

### 3. 限时获取许可

`tryAcquire(int units, long timeoutMillis)`：

- 资源充足时立即成功。
- `timeoutMillis == 0` 时不得等待，资源不足立即返回 `null`。
- 正超时内允许阻塞等待。
- 超时后仍不能成功获取全部许可，返回 `null`。
- 中断时抛出 `InterruptedException`，不得泄漏许可。
- 等待期间许可池关闭时，抛出 `IllegalStateException`。

### 4. Lease 生命周期

每次获取成功，都必须返回一张独立的 `Lease`。

- `Lease.units()` 返回该次实际获取的许可数量。
- `Lease.close()` 归还对应的全部许可。
- 同一张 `Lease` 重复调用 `close()`，最多只能归还一次。
- 同一张 `Lease` 被多个线程同时调用 `close()`，也只能归还一次。
- 允许在不同于获取线程的线程中归还许可。
- 归还后应通知可能满足条件的等待线程。

### 5. 查询

`available()`：

- 返回当前可用许可数量。
- 必须线程安全。
- 返回值始终处于 `[0, capacity]` 范围内。

### 6. 关闭许可池

`WeightedPermitPool.close()`：

- 必须幂等。
- 关闭后禁止新的许可获取，抛出 `IllegalStateException`。
- 正在等待许可的线程必须被唤醒，并以 `IllegalStateException` 结束等待。
- 不需要等待已经发出的 `Lease` 全部归还。
- 已发出的 `Lease` 仍然可以安全关闭。

## 四、并发约束

- 必须保证许可数量守恒，不得超发。
- 获取多个许可必须具有原子性。
- 不允许采用 `Thread.sleep()` 轮询或忙等方式实现阻塞。
- 不要求严格 FIFO 公平性。
- 必须正确处理获取、释放、中断、超时和关闭之间的并发竞争。

## 五、提交要求

1. 给出完整、可编译的 Java 21 源码。
2. 不省略任何必要的方法、导入或内部类型。
3. 只使用 JDK 标准库。
4. 不改变题目指定的公开 API。
5. 简要解释采用的同步机制和关键并发不变量。

请独立完成实现，不需要提供其他替代设计。
````