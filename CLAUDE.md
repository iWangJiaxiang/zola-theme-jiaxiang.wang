# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Overview

This is a Zola theme called "Wonder Shine" (formerly "zola-theme-jiaxiang.wang") that provides a modern, feature-rich blogging experience. The theme is built with Tailwind CSS for styling and includes various optimizations for performance.

## Key Architecture Components

### CSS Architecture
- Uses Tailwind CSS v4 for styling
- CSS is split into multiple files for different pages/components:
  - `global.css` - Global styles
  - `base.css` - Base styles
  - `index.css` - Home page styles
  - `post.css` - Post page styles
  - `about.css` - About page styles
  - `archive.css` - Archive page styles
  - `equipment.css` - Equipment page styles
  - `friend.css` - Friends page styles
  - `collection.css` - Collection page styles
  - `taxonomy.css` - Taxonomy page styles
  - `wechat.css` - WeChat page styles
  - `404.css` - 404 page styles
- The build process compiles these CSS files using Tailwind CLI
- CSS optimization is performed through PurgeCSS and Critical CSS extraction

### Build Process
- Uses Tailwind CLI to compile CSS from source files
- The `package.json` contains npm scripts for building CSS:
  - `css:build` - Builds all CSS files
  - `css:watch` - Watches and rebuilds CSS files on changes
  - `css:optimize` - Cleans CSS files (removes license headers)
- Uses `scripts/clean-css.js` for removing license headers from CSS files
- Uses `scripts/build-optimize.js` for PurgeCSS and Critical CSS optimization

### Theme Features
- Supports multiple comment systems (Twikoo, Artalk, Waline)
- Search functionality (Algolia, MeiliSearch)
- Markdown support with Katex and Prism code highlighting
- Random article access, right-click menu, Pjax
- AVIF image format support
- ICP and 公安备案 support
- Responsive design with Tailwind's utility classes
- Custom animations and transitions

## Development Commands

### Building CSS
```bash
# Build all CSS files
npm run css:build

# Watch and rebuild CSS on changes
npm run css:watch

# Optimize CSS (clean license headers)
npm run css:optimize
```

### Development Server
```bash
# Start development server
npm run server
# or
zola serve
```

### CSS Optimization
The theme includes optimization scripts that:
1. Remove license headers from CSS files
2. Use PurgeCSS to remove unused CSS
3. Extract Critical CSS for faster first render
4. Inline critical CSS for main pages and async load full CSS

## File Structure Notes

- `src/css/` - Source CSS files organized by page/component
- `static/dist/css/` - Compiled CSS files output directory
- `scripts/` - Build and optimization scripts
- `tailwind.config.js` - Tailwind CSS configuration
- `package.json` - Build scripts and dependencies