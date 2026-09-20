---
title: 算法｜今天上午写215题三路QuickSelect，一点总结
date: 2026-09-20 11:26:07
categories:
  - 算法
tags:
  - Quick Select
---
基本思路就是把数组划分为四个区间：
- low ~ lt-1: < pivot
- lt ~ i-1: = pivot
- i ~ gt: 未知区
- gt+1 ~ high: > pivot

然后保证未知区一定缩水：
```markdown
nums[i] < pivot
-> 左边收走
-> i++
-> 未知区左边收缩

nums[i] == pivot
-> 中间收走
-> i++
-> 未知区左边收缩

nums[i] > pivot 
-> 右边收走
-> gt--
-> 未知区右边收缩
```
最后[i,gt]像是两头不断被啃掉的待处理池。

但是非得规定未知区就是[i,gt]吗？
当然不是。我们还可以把未知区规定成[lt,i]，这样只需要从右往左检查。

然后循环不变量变成：
- low ~ lt-1: < pivot
- lt ~ i: 未知区
- i+1 ~ gt: = pivot
- gt+1 ~ high: > pivot

这时候i从右往左走。代码也可以写成镜像版本：
```Java
int lt = low;
int i = high;
int gt = high;

while(lt <= i){
    if(nums[i] > pivot){
        swap(nums,i,gt);
        gt--;
        i--;
    }else if(nums[i] < pivot){
        swap(nums,i,lt);
        lt++;
        // 这个地方i不动，因为左边换过去的东西还没有检查
    }else{
        i--;
    }
}
```
这时候这题的经典坑，就反过来了。原始版本是`nums[i]>pivot`，从`gt`换过来的是未知元素，所以i不动。我们镜像版本`nums[i] < pivot`从`lt`换过来的是未知元素，所以i不动。
详细点做个对比：
```markdown
原始版本（左 → 右）：

小元素 ← 已知区换回来
→ i 可以走

大元素 ← 未知区右端换回来
→ i 不能走
```
镜像版本：
```markdown
右 → 左：

大元素 ← 已知区换回来
→ i 可以走

小元素 ← 未知区左端换回来
→ i 不能走
```
所以这题重点是：必须先定义每一个区间代表什么，然后每一次交换都不能破坏这个定义。
重新定义的时候，需要做到两件事：
1. 每一轮处理之后，这几个区域的定义依然成立
2. 未知区域每一轮至少缩小一个元素，最终一定归零。

简单总结：指针的位置不是算法真理，区间含义+循环不变量才是算法真理。
