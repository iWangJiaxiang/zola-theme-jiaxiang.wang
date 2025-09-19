+++
title = "02 工具部署"
date = 2025-09-19
description = "详细介绍如何安装 Zola 并部署 jiaxiang.wang 主题"
weight = 0

[extra]
+++

# 工具部署指南

本文档将详细介绍如何安装 Zola 静态站点生成器并部署 jiaxiang.wang 主题。

## 1. 安装 Zola

### 1.1 系统要求

- 操作系统：Windows、macOS、Linux
- 磁盘空间：至少 50MB 可用空间
- 网络连接：用于下载依赖和主题

### 1.2 安装方法

#### macOS

**方法一：使用 Homebrew（推荐）**
```bash
brew install zola
```

**方法二：下载预编译二进制文件**
1. 访问 [Zola 发布页面](https://github.com/getzola/zola/releases)
2. 下载适合 macOS 的最新版本
3. 解压并将 `zola` 可执行文件移动到 `/usr/local/bin/`

#### Windows

**方法一：使用 Chocolatey**
```powershell
choco install zola
```

**方法二：使用 Scoop**
```powershell
scoop install zola
```

**方法三：下载预编译二进制文件**
1. 访问 [Zola 发布页面](https://github.com/getzola/zola/releases)
2. 下载 Windows 版本的 zip 文件
3. 解压并将 `zola.exe` 添加到系统 PATH

#### Linux

**Ubuntu/Debian：**
```bash
# 添加官方仓库
curl -s https://api.github.com/repos/getzola/zola/releases/latest \
| grep browser_download_url \
| grep x86_64-unknown-linux-gnu \
| cut -d '"' -f 4 \
| wget -qi -

# 解压并安装
tar -xzf zola-*.tar.gz
sudo mv zola /usr/local/bin/
```

**Arch Linux：**
```bash
pacman -S zola
```

### 1.3 验证安装

安装完成后，在终端运行以下命令验证安装：

```bash
zola --version
```

如果显示版本号，说明安装成功。

## 2. 获取主题

### 2.1 方法一：克隆主题仓库（推荐用于主题开发）

```bash
git clone --depth=1 https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang.git
cd zola-theme-jiaxiang.wang
```

### 2.2 方法二：创建新项目并安装主题（推荐用于新站点）

如果您想创建一个全新的站点并使用本主题，可以按照以下步骤操作：

#### 2.2.1 创建新的 Zola 项目

```bash
# 创建新项目
zola init my-blog
cd my-blog
```

在初始化过程中，Zola 会询问几个问题：
- **What is the URL of your site?** - 输入您的网站 URL（如 `https://yourdomain.com`）
- **Do you want to enable Sass compilation?** - 选择 `Y`（推荐）
- **Do you want to enable syntax highlighting?** - 选择 `Y`（推荐）
- **Do you want to build a search index of the content?** - 选择 `Y`（推荐）

#### 2.2.2 下载并安装主题

```bash
# 在项目根目录创建 themes 目录
mkdir themes
cd themes

# 克隆主题到 themes 目录
git clone https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang.git jiaxiang-wang
cd ..
```

#### 2.2.3 配置主题

1. **复制主题配置文件**：
```bash
# 复制主题的配置文件到项目根目录
cp themes/jiaxiang-wang/config.toml config.toml
cp themes/jiaxiang-wang/theme.toml theme.toml
cp themes/jiaxiang-wang/data.toml data.toml
```

2. **修改 config.toml**：
在 `config.toml` 文件中添加或修改主题配置：
```toml
theme = "jiaxiang-wang"
```

3. **复制示例内容**（可选）：
```bash
# 复制主题的示例内容
cp -r themes/jiaxiang-wang/content/* content/
```

#### 2.2.4 项目结构

完成上述步骤后，您的项目结构应该如下：

```bash
my-blog/
├── config.toml          # 主配置文件
├── theme.toml           # 主题配置文件
├── data.toml            # 数据配置文件
├── content/             # 您的内容目录
├── static/              # 您的静态资源
├── themes/              # 主题目录
│   └── jiaxiang-wang/   # 本主题
└── public/              # 构建输出目录（构建后生成）
```

### 2.3 目录结构说明

**方法一（克隆主题仓库）** 完成后，您将看到以下目录结构：

```bash
zola-theme-jiaxiang.wang/
├── config.toml          # 主配置文件
├── theme.toml           # 主题配置文件
├── data.toml            # 数据配置文件
├── content/             # 内容目录
│   ├── articles/        # 文章
│   ├── collections/     # 合集/知识库
│   └── pages/           # 页面
├── static/              # 静态资源
├── templates/           # 模板文件
└── tools/               # 工具脚本
```

**方法二（新项目安装主题）** 的目录结构已在上面 2.2.4 节中说明。

### 2.4 验证主题安装

无论使用哪种方法，都可以通过以下命令验证主题是否正确安装：

```bash
# 检查主题配置
zola check

# 启动开发服务器测试
zola serve
```

如果没有错误信息，说明主题安装成功。

## 3. 本地开发

### 3.1 启动开发服务器

**方法一（直接在主题目录）**：
```bash
zola serve
```

**方法二（在新项目目录）**：
```bash
# 确保在项目根目录（包含 config.toml 的目录）
zola serve
```

默认情况下，开发服务器将在 `http://127.0.0.1:1111` 启动。

### 3.2 开发服务器选项

```bash
# 指定端口
zola serve --port 8080

# 指定绑定地址
zola serve --interface 0.0.0.0

# 自动打开浏览器
zola serve --open

# 启用草稿模式
zola serve --drafts
```

### 3.3 实时预览

Zola 支持热重载，当您修改文件时，浏览器会自动刷新显示最新内容。

## 4. 构建生产版本

### 4.1 构建命令

```bash
zola build
```

构建完成后，静态文件将生成在 `public/` 目录中。

### 4.2 构建选项

```bash
# 指定输出目录
zola build --output-dir dist

# 指定基础 URL
zola build --base-url https://yourdomain.com

# 启用草稿模式
zola build --drafts
```

## 5. 部署到生产环境

### 5.1 静态文件托管

构建完成后，您可以将 `public/` 目录中的文件部署到任何静态文件托管服务：

- **Netlify**：直接拖拽 `public/` 目录到 Netlify
- **Vercel**：连接 GitHub 仓库并配置构建命令
- **GitHub Pages**：使用 GitHub Actions 自动部署
- **Cloudflare Pages**：连接仓库并设置构建配置

### 5.2 服务器部署

如果您有自己的服务器，可以使用以下方法：

```bash
# 使用 rsync 同步文件
rsync -avz --delete public/ user@server:/var/www/html/

# 使用 scp 复制文件
scp -r public/* user@server:/var/www/html/
```

### 5.3 Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM nginx:alpine
COPY public/ /usr/share/nginx/html/
EXPOSE 80
```

构建和运行：

```bash
docker build -t my-blog .
docker run -p 80:80 my-blog
```

## 6. 常见问题

### 6.1 端口被占用

如果默认端口 1111 被占用，使用 `--port` 参数指定其他端口：

```bash
zola serve --port 3000
```

### 6.2 权限问题

在 Linux/macOS 上，如果遇到权限问题，可能需要使用 `sudo`：

```bash
sudo mv zola /usr/local/bin/
```

### 6.3 构建失败

检查以下常见问题：
- 确保所有必需的配置文件存在
- 检查 Markdown 文件的 front matter 格式
- 验证模板文件语法

### 6.4 样式不显示

确保：
- 静态文件路径正确
- `base_url` 配置正确
- CSS 文件存在于 `static/` 目录

## 7. 下一步

部署完成后，您可以：

1. 阅读 [配置说明文档](./03%20config.md) 了解详细配置选项
2. 查看 [主题配置文档](./04%20theme-config.md) 自定义主题外观
3. 参考 [数据配置文档](./05%20data-config.md) 设置菜单和内容

## 8. 获取帮助

如果在部署过程中遇到问题，可以：

- 查看 [Zola 官方文档](https://www.getzola.org/documentation/)
- 访问 [主题 GitHub 仓库](https://github.com/iWangJiaxiang/zola-theme-jiaxiang.wang) 提交 Issue
- 参考主题的示例配置文件