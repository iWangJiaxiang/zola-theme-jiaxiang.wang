+++
title = "03 测试"
date = 2025-09-18
description = """
"""
weight = 0

[extra]

+++

为了确保渲染效果的一致性，我们需要在本地运行博客并使用 [BackstopJS](https://github.com/garris/BackstopJS) 进行测试。

安装 BackstopJS：

```bash
npm install -g backstopjs
```

安装playwright

```bash
npx playwright install
```

生成测试用的参考截图：

```bash
backstop reference
```

测试：

```bash
backstop test
```

测试后会打开一个浏览器窗口，显示测试结果。如果测试结果显示有差异，需要检查渲染效果是否符合预期。如果符合预期，需要更新参考截图。

接受测试结果：

```bash
backstop approve
````
