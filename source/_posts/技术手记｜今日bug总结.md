---
title: 技术手记｜今日bug总结
date: 2026-02-07 19:09:24
categories:
  - 技术手记
tags:
  - bugfix
  - NPE
  - FileNotFound
  - Amqp
  - Docker
  - rabbitMq
---
今日bug日志，测试的时候出现的，都是小bug。
1. 启动项目报AmqpError，一看是没开RabbitMq
2. 报FileNotFound，发现是Lua脚本地址写错，错的原因是redisLuaConfig里，新lua注册的时候copy了老lua的代码，改了之后，目录记错了，文件名凭印象写，写错了。
3. 报NPE，是HMAC的pepper为空，pepper是靠Security Bean注册的，没想到Security这bean注册了，但方法没返回值。所以返回pepper为空。
4. Lua脚本if语句没写end。
