+++
title = "04 主题配置 (theme.toml)"
date = 2025-09-19
description = "详细介绍 theme.toml 文件中主题特定的配置选项"
weight = 0

[extra]
+++

# 主题配置文档 (theme.toml)

`theme.toml` 文件包含了 jiaxiang.wang 主题的所有特定配置选项。这些配置控制着网站的外观、功能和行为。本文档将详细介绍每个配置部分。

## 1. 站点基本设置

### 1.1 站点信息

```toml
[extra.site]
seo = "一个博客网站，基于 https://github.com/iWangJiaxiang/zola-theme-wondershine 主题构建"
logo = "/img/logo.webp"
favicon = "/img/logo.webp"
default_cover = "/img/default-cover.webp"
email = "mail@example.com"
start_year = "2024"
```

- `seo`: SEO 描述，用于搜索引擎优化
- `logo`: 网站 Logo 图片路径
- `favicon`: 网站图标路径
- `default_cover`: 文章默认封面图片
- `email`: 网站联系邮箱
- `start_year`: 建站年份，用于版权信息

### 1.2 备案信息

```toml
compliance_icp = "ICP"
# compliance_security = "鲁公网安备 xxxxxxxx 号"
# compliance_security_link = "https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=xxxxxx"
```

- `compliance_icp`: ICP 备案号
- `compliance_security`: 公安备案号（可选）
- `compliance_security_link`: 公安备案链接（可选）

### 1.3 作者信息

```toml
[extra.site.author]
avatar = "/img/logo.webp"
about_image = "/img/logo.webp"
mbti = 'enfp'
```

- `avatar`: 作者头像
- `about_image`: 关于页面的横版图片
- `mbti`: MBTI 性格类型

## 2. 分析统计

### 2.1 页面统计

```toml
[extra.site.analytics]
stat_api = "https://stat-api-url"
```

### 2.2 Umami 监控

```toml
[extra.site.analytics.umami]
enable = false
domain = "your.domain.com"
remote_url = "https:/stat-api-ur"
id = "74859602-4481-4cb3-bad0-4e1fd9d23d24"
js = "/path/to/script.js"
track_external_link = true
```

- `enable`: 是否启用 Umami 监控
- `domain`: 监控的域名
- `remote_url`: Umami 服务地址
- `id`: 网站 ID
- `js`: JavaScript 文件地址
- `track_external_link`: 是否追踪外部链接

### 2.3 MS Clarity 监控

```toml
[extra.site.analytics.clarity]
enable = true
id = ""
```

- `enable`: 是否启用 Clarity 监控
- `id`: Clarity 网站 ID

## 3. 功能库配置

### 3.1 数学公式

```toml
[extra.lib]
katex = true
```

- `katex`: 是否启用 KaTeX 数学公式渲染

### 3.2 订阅配置

```toml
[extra.feed]
full_content_in_feed = false

[extra.feed.follow]
# feed_id = "1234567890"
# user_id = "1234567890"
```

- `full_content_in_feed`: RSS 中是否显示文章全文
- `feed_id` / `user_id`: follow.is 验证源配置

## 4. 导航配置

### 4.1 菜单控制

```toml
[extra.nav]
pc_left_menu = true
phone_left_menu = true
phone_menu = true
```

- `pc_left_menu`: PC 端左侧菜单
- `phone_left_menu`: 移动端左侧菜单
- `phone_menu`: 移动端主菜单

### 4.2 导航栏右侧

```toml
[extra.nav.right]
travelling = false
article = true
dark_mode = true
console_enable = true
search = false
search_engine = "algolia"
```

- `travelling`: 开往按钮
- `article`: 随机文章按钮
- `dark_mode`: 主题切换按钮
- `console_enable`: 控制台按钮
- `search`: 搜索功能
- `search_engine`: 搜索引擎类型

### 4.3 搜索引擎配置

**Meilisearch 搜索：**
```toml
[extra.search.meilisearch]
host = ""
key = ""
index_name = ""
```

**Algolia 搜索：**
```toml
[extra.search.algolia]
app_id = ""
app_key = ""
index_name = ""
```

## 5. 顶部设置

### 5.1 基本设置

```toml
[extra.top]
moment = false
recent_top = true
```

- `moment`: 瞬间说说功能
- `recent_top`: 顶部 Banner 显示

### 5.2 首页第一屏

```toml
[extra.top.above]
enable = false
typed = []
enable_typed_random = false
enable_above_video = false
index_video = ""
index_img = ""
phone_index_img = ""
```

- `enable`: 是否启用第一屏
- `typed`: 打字机显示的文字数组
- `enable_typed_random`: 随机文字
- `enable_above_video`: 视频背景
- `index_video`: 视频地址
- `index_img`: PC 端背景图
- `phone_index_img`: 移动端背景图

### 5.3 全局背景

```toml
[extra.top.global_background]
enable = false
enable_above_video = false
img = ""
video = ""
```

- `enable`: 全局透明背景图
- `enable_above_video`: 全局背景视频
- `img`: 背景图片地址
- `video`: 背景视频地址

### 5.4 Banner 配置

**左侧内容：**
```toml
[extra.top.banner_left]
title_big = "<div class=\"banners-title-big\">jiaxiang.wang</div>"
title_small = "<br><a href=\"#\">点击访问开源代码仓库</a>"

[[extra.top.banner_left.category_groups]]
title = "推荐"
icon = "icon-book"
url = "/tags/featured"
colors = { light_one = "#358bff", light_two = "#15c6ff", dark_one = "#0653b8", dark_two = "#2fcbff" }
```

**右侧内容：**
```toml
[extra.top.banner_right.today_recommend]
enable = true

[extra.top.banner_right.recommend_post]
type = "custom"
max_posts = 6
```

## 6. 布局设置

### 6.1 导航设置

```toml
[extra.layout.navs]
nav = "category"
nav_category = []
nav_tag = []
nav_custom_url = []
nav_more = "categories"
nav_more_custom_url = ""
```

- `nav`: 导航条显示内容类型
- `nav_category`: 自定义分类列表
- `nav_tag`: 自定义标签列表
- `nav_custom_url`: 自定义路径列表
- `nav_more`: 更多按钮显示内容
- `nav_more_custom_url`: 更多按钮自定义地址

### 6.2 文章布局

```toml
[extra.layout.post]
columns = "col2"
cover_position = "top"
```

- `columns`: 文章布局列数（col1/col2/col3）
- `cover_position`: 封面位置（top/left/right/alternate）

### 6.3 卡片效果

```toml
[extra.layout.card]
polish_effect = false
hover_animation = true
shadow_effect = true
```

- `polish_effect`: 擦亮效果
- `hover_animation`: 悬停动画
- `shadow_effect`: 阴影效果

## 7. 侧边栏配置

### 7.1 基本设置

```toml
[extra.sidebar]
location = "right-aside"
recent_posts_count = 4
category_quantity = 0
tag_quantity = 6
archives_quantity = 0
tags_switch = true
archive_switch = false
```

- `location`: 侧边栏位置（hide-aside/right-aside/left-aside）
- `recent_posts_count`: 最新文章数量
- `category_quantity`: 分类数量（小于 0 显示全部）
- `tag_quantity`: 标签数量
- `archives_quantity`: 归档数量
- `tags_switch`: 标签按钮开关
- `archive_switch`: 归档按钮开关

### 7.2 小部件配置

```toml
[extra.sidebar.widgets]
indexWidget = [
    { widget = "profile" },
    { widget = "wechat" },
    { widget = "comments" },
    { widget = "recent-posts" },
    { widget = "categories" },
    { widget = "tags" },
]

postWidget = [
    { widget = "profile" },
    { widget = "wechat" },
    { widget = "toc" },
    { widget = "comments" },
    { widget = "recent-posts" },
    { widget = "categories" },
]
```

可用小部件类型：
- `profile`: 个人卡片
- `wechat`: 公众号
- `power`: 爱发电赞助
- `steam`: Steam 卡片
- `music`: 音乐卡片
- `friend-link`: 通讯录
- `recent-posts`: 最新文章
- `visit-posts`: 热门文章
- `comments`: 最新评论
- `categories`: 文章分类
- `tags`: 文章标签
- `toc`: 目录
- `stat`: 统计
- `tags-stat`: 标签&归档&统计
- `adbox`: 广告区域
- `custom_html`: 自定义

### 7.3 个人卡片

```toml
[extra.sidebar.profile]
profile_style = "one"
background_img = "/img/sidebar/profile.webp"
profile_desc = "为创造者而生的开源 Zola 主题~"
socialMedia = [
    { icon = "icon-github", name = "GitHub", url = "https://github.com/..." },
]
```

### 7.4 公众号卡片

```toml
[extra.sidebar.wechat]
color = "#07C160"
wechatImg = "/img/wechat/gzh_cover.avif"
url = "/subscribe"
wechatImgFace = "/img/wechat/qr-green.avif"
wechatImgBack = "/img/wechat/qr-white.avif"
```

## 8. 页脚配置

### 8.1 基本设置

```toml
[extra.footer]
enable = true
footer_banner_padding = 1
dingyue = true
theme = true
about = true
icp_icon = true
gongwangan = true
copyright = true
feedback = true
feedback_url = "mailto:mail@example.com"
```

### 8.2 云服务商

```toml
yunzhichi_list = ""
yunzhichi_url = ""
yunzhichi_url_link = ""
```

支持的云服务商：
- `upyun_cloud`: 又拍云
- `aliyun_cloud`: 阿里云
- `tencent_cloud`: 腾讯云
- `huawei_cloud`: 华为云
- `custom_cloud`: 自定义

### 8.3 社交媒体

```toml
[extra.footer.social_media]
img_enable = true

[[extra.footer.social_media.left]]
option_social_data = "icon"
icon = "icon-envelope"
name = "Mail"
url = "mailto:mail@example.com"

[[extra.footer.social_media.right]]
option_social_data = "icon"
icon = "icon-github"
name = "Github"
url = "https://github.com/..."
```

## 9. 文章配置

### 9.1 基本设置

```toml
[extra.post]
dynamicBackground = true
opacity = true
recommendQuantity = "two"
copyrightsStyle = "one"
update_time = true
```

- `dynamicBackground`: 动态主色
- `opacity`: 目录模糊效果
- `recommendQuantity`: 阅读建议数量（two/six）
- `copyrightsStyle`: 版权样式（default/one）
- `update_time`: 显示最后更新时间

### 9.2 文章摘要

```toml
[extra.post.abstract]
enable = true
gpt_name = "本地"
mode = "local"
switch_btn = false
btn_link = ""
random_num = 3
basic_word_count = 1000
key = "xxxx"
referers = "https://xx.xx/"
```

- `enable`: 是否启用摘要
- `gpt_name`: 摘要服务名称
- `mode`: 摘要模式（local/tianli）
- `switch_btn`: 显示切换按钮
- `random_num`: 随机次数
- `basic_word_count`: 最低字符数
- `key`: API 密钥
- `referers`: 博客地址

### 9.3 版权声明

```toml
[extra.post.copyrights]
enable = true
copy_info = false
content = """
本文是原创文章，采用 <a target="_blank" href="/copyright">CC BY-NC-ND 4.0</a> 协议
"""
reprintContent = """
本文是转载文章，版权归原作者所有。
"""
```

## 10. 评论系统

### 10.1 基本设置

```toml
[extra.comments]
enable = false
system = "twikoo"
lazy_load = false
```

- `enable`: 全局评论开关
- `system`: 评论系统类型（twikoo/artalk/waline）
- `lazy_load`: 懒加载

### 10.2 Twikoo 配置

```toml
[extra.comments.twikoo]
enable = true
env_id = 'https://your-api-url'
js_url = "https://cdn.jsdelivr.net/npm/twikoo@1.6.39/dist/twikoo.all.min.js"
```

### 10.3 评论弹幕

```toml
[extra.comments.barrage]
enable = true
max_barrage = 1
barrage_time = 4000
mail_md5 = ""
```

## 11. 样式设置

### 11.1 主题配色

```toml
[extra.style]
color_scheme = "system"
theme_light_skin = "#425AEF"
theme_dark_skin = "#f2b94b"
universe = true
font_family = "PingFang SC"
```

- `color_scheme`: 颜色方案（system/dark/light）
- `theme_light_skin`: 亮色主题基色
- `theme_dark_skin`: 暗色主题基色
- `universe`: 深色模式粒子效果
- `font_family`: 全局字体

### 11.2 繁简转换

```toml
[extra.style.translate]
enable = true
default_encoding = 2
```

- `enable`: 启用繁简转换
- `default_encoding`: 默认编码（1: 繁体，2: 简体）

## 12. 代码块设置

```toml
[extra.code]
enable = true
enable_title = true
enable_hr = true
enable_line = true
enable_copy = true
enable_expander = true
enable_height_limit = false
height_limit = 300
theme_light = "one-dark"
theme_dark = "one-dark"
```

- `enable`: 启用代码块
- `enable_title`: 启用标题
- `enable_hr`: 启用分割线
- `enable_line`: 启用行号
- `enable_copy`: 启用复制
- `enable_expander`: 启用折叠
- `enable_height_limit`: 启用高度限制
- `height_limit`: 高度限制值
- `theme_light`: 亮色主题
- `theme_dark`: 暗色主题

## 13. 工具配置

### 13.1 右键菜单

```toml
[extra.tool]
keyboard = true

[extra.tool.right_menu]
enable = true
right_side_enable = true
readmode = true
```

### 13.2 音乐播放器

```toml
[extra.tool.nav_music]
enable = false
id = "xxxxxx"
```

## 14. 配置建议

### 14.1 性能优化

- 关闭不需要的功能以提高加载速度
- 合理设置图片格式和大小
- 选择合适的搜索引擎

### 14.2 SEO 优化

- 填写完整的站点信息
- 配置合适的默认封面
- 启用站点地图和 RSS

### 14.3 用户体验

- 根据内容类型选择合适的布局
- 配置合理的侧边栏小部件
- 启用必要的交互功能

## 15. 下一步

配置完成后，您可以：

1. 查看 [数据配置文档](./05%20data-config.md) 设置菜单和内容
2. 阅读 [高级配置指南](./06%20advanced.md) 进行深度自定义
3. 参考示例配置进行个性化调整