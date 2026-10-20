---
title: 技术手记｜我写加密工具类，又踩新坑，把pepper当message传入了
date: 2026-02-08 20:15:05
categories:
  - 技术手记
tags:
  - 加密
  - SHA256
  - pepper
  - HMAC
---
错误版本：SHA256(input + pepper)

这个版本错误有二：
1. `input + pepper`在密码学上是自制协议，有长度拓展，歧义风险
2. 语义不清：pepper是密钥，不能当成message的一部分

正确版本：HMAC(key = pepper, message = input)，在Java里就是HmacSHA256

另，其他bug：
1. `@Autowire`不能注入static
2. `new Security()`会绕过Spring，可以改为构造器注入

这种写法的使用场景：
1. 登录校验
2. token派生（服务端不可伪造token）
3. 签名校验
4. 内部安全字段







