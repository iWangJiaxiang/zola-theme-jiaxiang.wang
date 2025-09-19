+++
title = "06 高级配置"
date = 2025-09-19
description = "深入了解 jiaxiang.wang 主题的高级配置选项，包括自定义样式、JavaScript 功能、SEO 优化等。"
weight = 0
+++

# 高级配置与自定义指南

本文档将介绍 jiaxiang.wang 主题的高级配置选项和自定义方法，帮助您打造独特的个人网站。

## 1. 自定义样式

### 1.1 CSS 变量自定义

主题使用 CSS 变量系统，您可以通过覆盖变量来自定义样式：

```css
/* 在 static/css/custom.css 中添加 */
:root {
  /* 主色调 */
  --primary-color: #425AEF;
  --secondary-color: #f2b94b;
  
  /* 字体 */
  --font-family: "PingFang SC", "Helvetica Neue", Arial, sans-serif;
  --font-size-base: 16px;
  --line-height-base: 1.6;
  
  /* 间距 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* 圆角 */
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;
  
  /* 阴影 */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

### 1.2 暗色模式自定义

```css
[data-theme="dark"] {
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
  --border-color: #333;
  --card-bg: #2d2d2d;
}
```

### 1.3 响应式断点

```css
/* 移动端 */
@media (max-width: 768px) {
  :root {
    --font-size-base: 14px;
    --spacing-md: 0.75rem;
  }
}

/* 平板端 */
@media (min-width: 769px) and (max-width: 1024px) {
  :root {
    --font-size-base: 15px;
  }
}

/* 桌面端 */
@media (min-width: 1025px) {
  :root {
    --font-size-base: 16px;
  }
}
```

## 2. 自定义 JavaScript

### 2.1 添加自定义脚本

在 `static/js/custom.js` 中添加自定义功能：

```javascript
// 自定义初始化函数
function initCustomFeatures() {
  // 添加平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // 添加图片懒加载
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', initCustomFeatures);
```

### 2.2 主题切换增强

```javascript
// 增强主题切换功能
function enhanceThemeToggle() {
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      // 添加切换动画
      document.body.style.transition = 'background-color 0.3s ease';
      
      // 保存用户偏好
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('preferred-theme', newTheme);
    });
  }
}
```

## 3. 模板自定义

### 3.1 创建自定义页面模板

在 `templates/` 目录下创建自定义模板：

```jinja2
<!-- templates/custom-page.html -->
{% extends "base.html" %}

{% block title %}{{ page.title }} - {{ config.title }}{% endblock %}

{% block content %}
<div class="custom-page">
  <header class="page-header">
    <h1>{{ page.title }}</h1>
    {% if page.description %}
    <p class="page-description">{{ page.description }}</p>
    {% endif %}
  </header>
  
  <main class="page-content">
    {{ page.content | safe }}
  </main>
  
  {% if page.extra.show_toc %}
  <aside class="page-toc">
    {{ page.toc | safe }}
  </aside>
  {% endif %}
</div>
{% endblock %}
```

### 3.2 自定义短代码 (Shortcodes)

在 `templates/shortcodes/` 目录下创建短代码：

```jinja2
<!-- templates/shortcodes/note.html -->
<div class="note note-{{ type | default(value="info") }}">
  <div class="note-icon">
    {% if type == "warning" %}
    <i class="icon-warning"></i>
    {% elif type == "error" %}
    <i class="icon-error"></i>
    {% elif type == "success" %}
    <i class="icon-success"></i>
    {% else %}
    <i class="icon-info"></i>
    {% endif %}
  </div>
  <div class="note-content">
    {{ body | markdown | safe }}
  </div>
</div>
```

使用方法：

```md
{{/* note(type="warning") */}}
这是一个警告提示框。
{{ end }}
```

### 3.3 自定义文章布局

```jinja2
<!-- templates/post-custom.html -->
{% extends "base.html" %}

{% block content %}
<article class="post-custom">
  <!-- 自定义文章头部 -->
  <header class="post-header-custom">
    <div class="post-meta-custom">
      <time datetime="{{/* page.date /*}}">{{/* page.date | date(format="%Y-%m-%d") /*}}</time>
      {% if page.taxonomies.categories %}
      <span class="post-categories">
        {% for category in page.taxonomies.categories %}
        <a href="{{ get_taxonomy_url(kind="categories", name=category) }}">{{ category }}</a>
        {% endfor %}
      </span>
      {% endif %}
    </div>
    <h1 class="post-title-custom">{{ page.title }}</h1>
  </header>
  
  <!-- 自定义文章内容 -->
  <div class="post-content-custom">
    {{ page.content | safe }}
  </div>
  
  <!-- 自定义文章底部 -->
  <footer class="post-footer-custom">
    {% if page.taxonomies.tags %}
    <div class="post-tags">
      {% for tag in page.taxonomies.tags %}
      <a href="{{ get_taxonomy_url(kind="tags", name=tag) }}" class="tag">{{ tag }}</a>
      {% endfor %}
    </div>
    {% endif %}
  </footer>
</article>
{% endblock %}
```

## 4. 性能优化

### 4.1 图片优化

```toml
# config.toml 中的图片处理配置
[extra.image_processing]
# 启用图片处理
enable = true

# 图片质量设置
quality = 85

# 生成不同尺寸的图片
sizes = [400, 800, 1200]

# 图片格式转换
format = "webp"

# 懒加载设置
lazy_loading = true
```

### 4.2 CSS 和 JS 优化

```toml
# config.toml 中的资源优化
[extra.assets]
# 启用资源压缩
minify_css = true
minify_js = true

# 启用资源合并
combine_css = true
combine_js = true

# 启用 CDN
cdn_enable = true
cdn_url = "https://cdn.example.com"
```

### 4.3 缓存策略

```jinja2
<!-- 在 base.html 中添加缓存头 -->
{% block head %}
<meta http-equiv="Cache-Control" content="public, max-age=31536000">
<meta http-equiv="Expires" content="{{/* "now" | date(format="%a, %d %b %Y %H:%M:%S GMT") /*}}">
{% endblock %}
```

## 5. SEO 优化

### 5.1 结构化数据

```jinja2
<!-- 在文章模板中添加结构化数据 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{/* page.title /*}}",
  "description": "{{/* page.description | default(value=page.summary) /*}}",
  "author": {
    "@type": "Person",
    "name": "{{ config.extra.author.name }}"
  },
  "datePublished": "{{/* page.date | date(format="%Y-%m-%d") /*}}",
  "dateModified": "{{/* page.updated | default(value=page.date) | date(format="%Y-%m-%d") /*}}",
  "image": "{{/* page.extra.cover | default(value=config.extra.default_cover) /*}}",
  "url": "{{/* page.permalink /*}}"
}
</script>
```

### 5.2 Open Graph 标签

```jinja2
<!-- 在 head 中添加 Open Graph 标签 -->
<meta property="og:title" content="{{ page.title | default(value=config.title) }}">
<meta property="og:description" content="{{ page.description | default(value=config.description) }}">
<meta property="og:image" content="{{ page.extra.cover | default(value=config.extra.default_cover) }}">
<meta property="og:url" content="{{ page.permalink | default(value=config.base_url) }}">
<meta property="og:type" content="{% if page %}article{% else %}website{% endif %}">
<meta property="og:site_name" content="{{ config.title }}">
```

### 5.3 Twitter Cards

```jinja2
<!-- Twitter Cards 标签 -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{ page.title | default(value=config.title) }}">
<meta name="twitter:description" content="{{ page.description | default(value=config.description) }}">
<meta name="twitter:image" content="{{ page.extra.cover | default(value=config.extra.default_cover) }}">
{% if config.extra.twitter_username %}
<meta name="twitter:creator" content="@{{ config.extra.twitter_username }}">
{% endif %}
```

## 6. 多语言支持

### 6.1 语言配置

```toml
# config.toml 中的多语言配置
default_language = "zh"

[languages.zh]
title = "我的博客"
description = "中文博客描述"

[languages.en]
title = "My Blog"
description = "English blog description"
```

### 6.2 语言切换器

```jinja2
<!-- 在导航栏中添加语言切换器 -->
<div class="language-switcher">
  {% for lang_code, lang_config in config.languages %}
  <a href="{{ lang_config.base_url | default(value="/") }}" 
     class="lang-link {% if lang_code == config.default_language %}active{% endif %}">
    {{ lang_code | upper }}
  </a>
  {% endfor %}
</div>
```

## 7. 自定义功能

### 7.1 阅读进度条

```javascript
// 添加阅读进度条
function initReadingProgress() {
  const progressBar = document.createElement('div');
  progressBar.className = 'reading-progress';
  document.body.appendChild(progressBar);
  
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (scrollTop / docHeight) * 100;
    progressBar.style.width = scrollPercent + '%';
  });
}
```

```css
/* 阅读进度条样式 */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 3px;
  background: var(--primary-color);
  z-index: 1000;
  transition: width 0.3s ease;
}
```

### 7.2 返回顶部按钮

```javascript
// 返回顶部功能
function initBackToTop() {
  const backToTop = document.createElement('button');
  backToTop.className = 'back-to-top';
  backToTop.innerHTML = '<i class="icon-arrow-up"></i>';
  backToTop.setAttribute('aria-label', '返回顶部');
  document.body.appendChild(backToTop);
  
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      backToTop.classList.add('show');
    } else {
      backToTop.classList.remove('show');
    }
  });
  
  backToTop.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}
```

### 7.3 代码复制功能

```javascript
// 代码块复制功能
function initCodeCopy() {
  document.querySelectorAll('pre code').forEach(codeBlock => {
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-code';
    copyButton.innerHTML = '<i class="icon-copy"></i>';
    copyButton.setAttribute('aria-label', '复制代码');
    
    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(codeBlock.textContent).then(() => {
        copyButton.innerHTML = '<i class="icon-check"></i>';
        setTimeout(() => {
          copyButton.innerHTML = '<i class="icon-copy"></i>';
        }, 2000);
      });
    });
    
    codeBlock.parentNode.appendChild(copyButton);
  });
}
```

## 8. 部署优化

### 8.1 构建优化

```bash
# 生产环境构建命令
zola build --base-url https://your-domain.com

# 启用压缩
zola build --base-url https://your-domain.com --output-dir public --minify-html
```

### 8.2 服务器配置

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/your/site/public;
    index index.html;
    
    # 启用 Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # 设置缓存头
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # HTML 文件缓存
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # 404 页面
    error_page 404 /404.html;
}
```

### 8.3 CDN 配置

```toml
# config.toml 中的 CDN 配置
[extra.cdn]
enable = true
domain = "https://cdn.your-domain.com"

# 静态资源 CDN
css_cdn = "https://cdn.your-domain.com/css/"
js_cdn = "https://cdn.your-domain.com/js/"
img_cdn = "https://cdn.your-domain.com/img/"
```

## 9. 调试和测试

### 9.1 本地调试

```bash
# 启用详细日志
RUST_LOG=debug zola serve

# 指定端口
zola serve --port 8080

# 监听所有接口
zola serve --interface 0.0.0.0
```

### 9.2 性能测试

使用工具测试网站性能：

- **Lighthouse**: 综合性能评估
- **PageSpeed Insights**: Google 页面速度测试
- **GTmetrix**: 详细性能分析
- **WebPageTest**: 多地点性能测试

### 9.3 SEO 检查

- **Google Search Console**: 搜索表现监控
- **Bing Webmaster Tools**: Bing 搜索优化
- **Schema.org Validator**: 结构化数据验证

## 10. 故障排除

### 10.1 常见问题

**构建失败：**
- 检查 TOML 语法错误
- 验证模板语法
- 确认文件路径正确

**样式不生效：**
- 检查 CSS 文件路径
- 验证选择器优先级
- 清除浏览器缓存

**JavaScript 错误：**
- 查看浏览器控制台
- 检查脚本加载顺序
- 验证 DOM 元素存在

### 10.2 调试技巧

```javascript
// 添加调试信息
console.log('Theme version:', '{{ config.extra.theme_version }}');
console.log('Build time:', '{{/* now() */}}');
console.log('Environment:', '{{/* get_env(name="ZOLA_ENV") /*}}');
```

## 11. 贡献和反馈

如果您在使用过程中遇到问题或有改进建议，欢迎：

1. 提交 [GitHub Issues](https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang/issues)
2. 发起 [Pull Request](https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang/pulls)
3. 参与 [讨论区](https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang/discussions)

## 12. 下一步

完成高级配置后，您可以：

1. 定期更新主题版本
2. 监控网站性能和 SEO 表现
3. 根据用户反馈持续优化
4. 探索更多自定义可能性