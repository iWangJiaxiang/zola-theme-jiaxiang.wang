# 提高效率的工具

## 脚本`png-2-webp.sh`

该脚本能够将给定目录的所有png文件转换为webp格式，同时支持自定义宽度和高度，可用于优化友链页面图片大小，用于通过js动态获取图片的场景

## 命令格式

> 如果将本主题安装到你的 zola 博客内，需要修改脚本路径为指向主题文件夹的相对路径，如`./tools/png-2-webp.sh`该为`./themes/zola-theme-wondershine/tools/png-2-webp.sh`。下同。

```bash
./tools/png-2-webp.sh <目录：默认当前目录> <宽度：默认200> <高度：默认120> <质量：默认75>
```

## 使用方法

1. 安装所有依赖（Windows系统下推荐使用 WSL 环境进行安装）

```bash
sudo apt-get install webp
```

2. 以处理`./static/img/friends`目录下的所有png文件为例（优化友链页面图片大小，用于通过js动态获取图片的场景，此时无法使用 zola 的原生图像处理方法）

```bash
./tools/png-2-webp.sh ./static/img/friends
```