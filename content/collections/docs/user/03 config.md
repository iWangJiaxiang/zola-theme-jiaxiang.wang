+++
title = "03 基础配置 (config.toml)"
date = 2025-09-19
description = "详细介绍 config.toml 文件的各项配置选项"
weight = 0

[extra]
+++

# 基础配置文档 (config.toml)

`config.toml` 是 Zola 的主配置文件，包含了站点的基本设置和 Zola 引擎的配置选项。本文档将详细介绍每个配置项的作用和使用方法。

## 1. 基本站点信息

### 1.1 站点标题和描述

```toml
title = "zola-theme-wondershine"
author = "zola-theme-wondershine"
description = "为创造者而生的开源 Zola 主题，地址 https://github.com/iWangJiaxiang/zola-theme-wondershine"
```

- `title`: 网站标题，显示在浏览器标签页和搜索结果中
- `author`: 默认作者名称，用于页面和 RSS 订阅
- `description`: 网站描述，用于 SEO 和社交媒体分享

### 1.2 站点 URL 配置

```toml
base_url = "/"
default_language = "en"
```

- `base_url`: 网站的基础 URL，部署时需要修改为实际域名
- `default_language`: 默认语言代码，影响 RSS 订阅和 HTML lang 属性

## 2. 构建配置

### 2.1 输出设置

```toml
output_dir = "public"
preserve_dotfiles_in_output = false
```

- `output_dir`: 构建输出目录，默认为 `public`
- `preserve_dotfiles_in_output`: 是否保留输出目录中的点文件

### 2.2 资源处理

```toml
compile_sass = false
minify_html = true
hard_link_static = false
```

- `compile_sass`: 是否编译 Sass 文件（主题已包含编译后的 CSS）
- `minify_html`: 是否压缩 HTML 输出
- `hard_link_static`: 是否对静态文件使用硬链接

### 2.3 忽略文件

```toml
ignored_content = []
ignored_static = []
```

- `ignored_content`: 忽略的内容文件模式
- `ignored_static`: 忽略的静态文件模式

## 3. 订阅和站点地图

### 3.1 RSS/Atom 订阅

```toml
generate_feeds = true
feed_filenames = ["atom.xml", "rss.xml"]
# feed_limit = 20
```

- `generate_feeds`: 是否生成订阅文件
- `feed_filenames`: 订阅文件名列表
- `feed_limit`: 订阅中包含的文章数量限制（可选）

### 3.2 站点地图和机器人

```toml
generate_sitemap = true
generate_robots_txt = true
```

- `generate_sitemap`: 是否生成 sitemap.xml
- `generate_robots_txt`: 是否生成 robots.txt

## 4. 分类系统

### 4.1 分类配置

```toml
taxonomies = [
    { name = "tags", feed = true, paginate_by = 10, display_name = "标签" },
    { name = "categories", paginate_by = 5, display_name = "分类" },
]
```

配置选项说明：
- `name`: 分类的内部名称，用于 URL 和模板
- `feed`: 是否为该分类生成单独的订阅文件
- `paginate_by`: 分类页面的分页数量
- `display_name`: 显示名称，用于前端展示

## 5. Markdown 配置

### 5.1 代码高亮

```toml
[markdown]
highlight_code = false  # 使用 Prism.js 而非内置高亮
extra_syntaxes_and_themes = []
```

- `highlight_code`: 是否启用内置代码高亮（主题使用 Prism.js）
- `extra_syntaxes_and_themes`: 额外的语法高亮文件

### 5.2 内容处理

```toml
render_emoji = true
external_links_target_blank = true
external_links_no_follow = true
external_links_no_referrer = false
smart_punctuation = false
lazy_async_image = true
bottom_footnotes = true
```

- `render_emoji`: 是否渲染 emoji 表情符号
- `external_links_target_blank`: 外部链接是否在新标签页打开
- `external_links_no_follow`: 外部链接是否添加 `rel="nofollow"`
- `external_links_no_referrer`: 外部链接是否添加 `rel="noreferrer"`
- `smart_punctuation`: 是否启用智能标点符号
- `lazy_async_image`: 是否为图片添加懒加载属性
- `bottom_footnotes`: 脚注是否显示在页面底部

## 6. 链接检查

### 6.1 链接检查配置

```toml
[link_checker]
skip_prefixes = ["http://[2001:db8::]/"]
skip_anchor_prefixes = ["https://caniuse.com/"]
internal_level = "warn"
external_level = "warn"
```

- `skip_prefixes`: 跳过检查的 URL 前缀
- `skip_anchor_prefixes`: 跳过锚点检查的 URL 前缀
- `internal_level`: 内部链接问题的处理级别（error/warn）
- `external_level`: 外部链接问题的处理级别（error/warn）

## 7. URL 生成策略

### 7.1 Slug 化配置

```toml
[slugify]
paths = "safe"
taxonomies = "on"
anchors = "on"
paths_keep_dates = false
```

- `paths`: 路径 slug 化策略
- `taxonomies`: 分类 slug 化策略
- `anchors`: 锚点 slug 化策略
- `paths_keep_dates`: 是否在路径中保留日期前缀

## 8. 搜索配置

### 8.1 搜索索引

```toml
build_search_index = false

[search]
include_title = true
include_description = false
include_date = false
include_path = false
include_content = true
# truncate_content_length = 100
index_format = "elasticlunr_javascript"
```

- `build_search_index`: 是否构建搜索索引
- `include_title`: 索引中是否包含标题
- `include_description`: 索引中是否包含描述
- `include_date`: 索引中是否包含日期
- `include_path`: 索引中是否包含路径
- `include_content`: 索引中是否包含内容
- `truncate_content_length`: 内容截断长度
- `index_format`: 搜索索引格式

## 9. 多语言支持

### 9.1 翻译配置

```toml
[translations]
# 在此添加默认语言的翻译

[languages]
# 在此配置其他语言
# [languages.zh]
# title = "我的中文站点"
```

## 10. 主题特定配置

主题的详细配置在 `[extra]` 部分，这些配置将在 [主题配置文档](./04%20theme-config.md) 中详细介绍。

```toml
[extra]
# 主题特定配置
# 详见 theme.toml 配置文档
```

## 11. 常用配置示例

### 11.1 开发环境配置

```toml
base_url = "http://127.0.0.1:1111"
minify_html = false
```

### 11.2 生产环境配置

```toml
base_url = "https://yourdomain.com"
minify_html = true
generate_feeds = true
generate_sitemap = true
```

### 11.3 多语言站点配置

```toml
default_language = "zh"

[languages.en]
title = "My English Site"
generate_feeds = true

[languages.zh]
title = "我的中文站点"
generate_feeds = true
```

## 12. 配置验证

### 12.1 检查配置

使用以下命令检查配置是否正确：

```bash
zola check
```

### 12.2 常见配置错误

1. **base_url 格式错误**：必须以 `http://` 或 `https://` 开头
2. **分类名称冲突**：不同分类不能使用相同的 `name`
3. **文件路径错误**：确保引用的文件路径存在

## 13. 性能优化建议

### 13.1 构建性能

```toml
# 开发时关闭压缩以提高构建速度
minify_html = false

# 生产环境启用压缩
minify_html = true
```

### 13.2 搜索性能

```toml
# 限制搜索内容长度
[search]
truncate_content_length = 200
```

## 14. 下一步

配置完成后，您可以：

1. 查看 [主题配置文档](./04%20theme-config.md) 了解主题特定设置
2. 参考 [数据配置文档](./05%20data-config.md) 设置菜单和内容
3. 阅读 [高级配置指南](./06%20advanced.md) 进行深度自定义

## 15. 配置模板

以下是一个完整的 `config.toml` 配置模板：

```toml
title = "我的博客"
author = "作者名称"
description = "博客描述"
base_url = "https://yourdomain.com"
default_language = "zh"

output_dir = "public"
compile_sass = false
minify_html = true
generate_feeds = true
feed_filenames = ["atom.xml", "rss.xml"]
generate_sitemap = true
generate_robots_txt = true

taxonomies = [
    { name = "tags", feed = true, paginate_by = 10, display_name = "标签" },
    { name = "categories", paginate_by = 5, display_name = "分类" },
]

[markdown]
highlight_code = false
render_emoji = true
external_links_target_blank = true
external_links_no_follow = true
lazy_async_image = true
bottom_footnotes = true

[extra]
# 主题配置在此处添加
```