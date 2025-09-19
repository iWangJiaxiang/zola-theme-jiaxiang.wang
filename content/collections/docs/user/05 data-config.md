+++
title = "05 数据配置 (data.toml)"
date = 2025-09-19
description = "详细介绍 data.toml 文件中的数据配置和菜单设置"
weight = 0

[extra]
+++

# 数据配置文档 (data.toml)

`data.toml` 文件是主题的数据配置文件，主要用于定义网站的菜单结构、导航链接、社交媒体链接等静态数据。本文档将详细介绍各个配置部分。

## 1. 主导航菜单

### 1.1 基本菜单结构

```toml
[[menu.main]]
name = "首页"
url = "/"
weight = 1

[[menu.main]]
name = "文章"
url = "/posts/"
weight = 2

[[menu.main]]
name = "分类"
url = "/categories/"
weight = 3

[[menu.main]]
name = "标签"
url = "/tags/"
weight = 4

[[menu.main]]
name = "关于"
url = "/about/"
weight = 5
```

### 1.2 菜单配置说明

- `name`: 菜单显示名称
- `url`: 菜单链接地址
- `weight`: 菜单排序权重（数字越小越靠前）

### 1.3 下拉子菜单

```toml
[[menu.main]]
name = "文档"
url = "/docs/"
weight = 6

  [[menu.main.children]]
  name = "用户指南"
  url = "/docs/user/"
  
  [[menu.main.children]]
  name = "开发文档"
  url = "/docs/dev/"
  
  [[menu.main.children]]
  name = "API 参考"
  url = "/docs/api/"
```

### 1.4 外部链接菜单

```toml
[[menu.main]]
name = "GitHub"
url = "https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang"
weight = 7
external = true
```

- `external`: 标记为外部链接，会在新窗口打开

## 2. 页脚菜单

### 2.1 页脚链接组

```toml
[[menu.footer]]
name = "快速链接"
weight = 1

  [[menu.footer.links]]
  name = "首页"
  url = "/"
  
  [[menu.footer.links]]
  name = "文章归档"
  url = "/archives/"
  
  [[menu.footer.links]]
  name = "站点地图"
  url = "/sitemap.xml"

[[menu.footer]]
name = "友情链接"
weight = 2

  [[menu.footer.links]]
  name = "Zola 官网"
  url = "https://www.getzola.org/"
  external = true
  
  [[menu.footer.links]]
  name = "主题仓库"
  url = "https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang"
  external = true
```

### 2.2 法律信息

```toml
[[menu.footer]]
name = "法律信息"
weight = 3

  [[menu.footer.links]]
  name = "隐私政策"
  url = "/privacy/"
  
  [[menu.footer.links]]
  name = "使用条款"
  url = "/terms/"
  
  [[menu.footer.links]]
  name = "版权声明"
  url = "/copyright/"
```

## 3. 社交媒体配置

### 3.1 社交媒体链接

```toml
[social]
github = "https://github.com/username"
twitter = "https://twitter.com/username"
weibo = "https://weibo.com/username"
email = "mailto:your@email.com"
rss = "/atom.xml"
```

### 3.2 支持的社交平台

常用社交平台配置：

```toml
[social]
# 代码托管
github = "https://github.com/username"
gitlab = "https://gitlab.com/username"
gitee = "https://gitee.com/username"

# 社交媒体
twitter = "https://twitter.com/username"
weibo = "https://weibo.com/username"
zhihu = "https://www.zhihu.com/people/username"
douban = "https://www.douban.com/people/username"

# 专业平台
linkedin = "https://www.linkedin.com/in/username"
stackoverflow = "https://stackoverflow.com/users/userid"

# 通讯工具
telegram = "https://t.me/username"
wechat = "your-wechat-id"
qq = "your-qq-number"

# 内容平台
youtube = "https://www.youtube.com/channel/channelid"
bilibili = "https://space.bilibili.com/userid"
juejin = "https://juejin.cn/user/userid"

# 其他
email = "mailto:your@email.com"
rss = "/atom.xml"
website = "https://your-website.com"
```

## 4. 友情链接配置

### 4.1 友链数据结构

```toml
[[friends]]
name = "朋友的博客"
url = "https://friend-blog.com"
avatar = "https://friend-blog.com/avatar.jpg"
description = "一个很棒的技术博客"
category = "技术博客"

[[friends]]
name = "设计师朋友"
url = "https://designer-friend.com"
avatar = "https://designer-friend.com/avatar.jpg"
description = "专注 UI/UX 设计"
category = "设计"

[[friends]]
name = "开源项目"
url = "https://awesome-project.com"
avatar = "https://awesome-project.com/logo.png"
description = "一个实用的开源工具"
category = "开源项目"
```

### 4.2 友链分类

```toml
[friends_categories]
"技术博客" = { color = "#3498db", icon = "icon-code" }
"设计" = { color = "#e74c3c", icon = "icon-palette" }
"开源项目" = { color = "#2ecc71", icon = "icon-github" }
"工具网站" = { color = "#f39c12", icon = "icon-tool" }
```

- `color`: 分类标签颜色
- `icon`: 分类图标（使用 iconfont 图标）

## 5. 项目展示配置

### 5.1 项目数据

```toml
[[projects]]
name = "项目名称"
description = "项目简短描述"
url = "https://project-url.com"
github = "https://github.com/username/project"
image = "/img/projects/project-cover.jpg"
tags = ["Vue.js", "TypeScript", "Node.js"]
featured = true
status = "active"

[[projects]]
name = "另一个项目"
description = "另一个项目的描述"
url = "https://another-project.com"
github = "https://github.com/username/another-project"
image = "/img/projects/another-cover.jpg"
tags = ["React", "Python", "Docker"]
featured = false
status = "completed"
```

### 5.2 项目字段说明

- `name`: 项目名称
- `description`: 项目描述
- `url`: 项目演示地址
- `github`: GitHub 仓库地址
- `image`: 项目封面图片
- `tags`: 技术标签数组
- `featured`: 是否为精选项目
- `status`: 项目状态（active/completed/archived）

## 6. 技能配置

### 6.1 技能数据

```toml
[[skills]]
category = "前端开发"
items = [
  { name = "HTML/CSS", level = 90 },
  { name = "JavaScript", level = 85 },
  { name = "Vue.js", level = 80 },
  { name = "React", level = 75 },
  { name = "TypeScript", level = 70 }
]

[[skills]]
category = "后端开发"
items = [
  { name = "Python", level = 85 },
  { name = "Node.js", level = 80 },
  { name = "Go", level = 70 },
  { name = "Java", level = 65 }
]

[[skills]]
category = "工具与平台"
items = [
  { name = "Git", level = 90 },
  { name = "Docker", level = 80 },
  { name = "Linux", level = 75 },
  { name = "AWS", level = 60 }
]
```

### 6.2 技能等级说明

- `level`: 技能熟练度（0-100）
  - 90-100: 专家级
  - 80-89: 熟练
  - 70-79: 中等
  - 60-69: 初级
  - 0-59: 入门

## 7. 时间线配置

### 7.1 经历时间线

```toml
[[timeline]]
date = "2024-01"
title = "加入新公司"
description = "担任高级前端工程师"
type = "work"
icon = "icon-briefcase"

[[timeline]]
date = "2023-06"
title = "开源项目发布"
description = "发布了一个实用的开源工具"
type = "project"
icon = "icon-github"

[[timeline]]
date = "2023-01"
title = "技术博客启动"
description = "开始写技术博客，分享学习心得"
type = "blog"
icon = "icon-edit"
```

### 7.2 时间线类型

- `work`: 工作经历
- `education`: 教育经历
- `project`: 项目经历
- `blog`: 博客里程碑
- `award`: 获奖经历
- `other`: 其他

## 8. 统计数据配置

### 8.1 网站统计

```toml
[stats]
posts_count = 0  # 自动计算
categories_count = 0  # 自动计算
tags_count = 0  # 自动计算
words_count = 0  # 自动计算
visitors_count = 1000  # 手动设置
```

### 8.2 个人统计

```toml
[personal_stats]
coding_years = 5
projects_completed = 20
github_stars = 500
blog_views = 10000
```

## 9. 配置示例

### 9.1 完整的 data.toml 示例

```toml
# 主导航菜单
[[menu.main]]
name = "首页"
url = "/"
weight = 1

[[menu.main]]
name = "文章"
url = "/posts/"
weight = 2

[[menu.main]]
name = "项目"
url = "/projects/"
weight = 3

[[menu.main]]
name = "关于"
url = "/about/"
weight = 4

# 社交媒体
[social]
github = "https://github.com/username"
email = "mailto:your@email.com"
rss = "/atom.xml"

# 友情链接
[[friends]]
name = "朋友博客"
url = "https://friend.com"
avatar = "/img/friends/friend.jpg"
description = "技术分享"
category = "技术博客"

# 项目展示
[[projects]]
name = "我的项目"
description = "项目描述"
url = "https://project.com"
github = "https://github.com/username/project"
image = "/img/projects/project.jpg"
tags = ["Vue.js", "TypeScript"]
featured = true
status = "active"
```

## 10. 配置建议

### 10.1 菜单设计

- 保持菜单结构简洁明了
- 合理设置菜单权重排序
- 外部链接标记 `external = true`

### 10.2 数据维护

- 定期更新友情链接状态
- 及时更新项目信息
- 保持社交媒体链接有效

### 10.3 性能考虑

- 友链数量不宜过多（建议 20 个以内）
- 项目展示控制在合理范围
- 图片使用适当的格式和大小

## 11. 常见问题

### 11.1 菜单不显示

检查以下配置：
- 确认 `weight` 设置正确
- 检查 URL 路径是否存在
- 验证 TOML 语法是否正确

### 11.2 友链显示异常

可能的原因：
- 头像链接失效
- 分类配置缺失
- 数据格式错误

### 11.3 社交图标不显示

解决方法：
- 检查图标名称是否正确
- 确认图标库是否加载
- 验证链接地址格式

## 12. 下一步

配置完成后，您可以：

1. 查看 [高级配置指南](./06%20advanced.md) 进行深度自定义
2. 参考主题示例进行个性化调整
3. 定期维护和更新数据配置