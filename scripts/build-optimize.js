import { PurgeCSS } from 'purgecss';
import { generate as generateCritical } from 'critical';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 配置：你的 SSG 输出目录（通常是 public, dist, 或 _site）
const BUILD_DIR = 'public'; 
// 你的原始 CSS 文件路径（相对于输出目录）
const CSS_FILE = '/dist/css/global.css'; 

async function optimize() {
    console.log('🚀 开始 CSS 优化流程...');

    // --- 阶段 1: PurgeCSS (全局瘦身) ---
    // 目标：生成一个包含所有页面所需样式的最小化 CSS 文件
    console.log('Step 1: 正在执行 PurgeCSS 瘦身...');
    
    const purgeResult = await new PurgeCSS().purge({
        content: [`${BUILD_DIR}/**/*.html`, `${BUILD_DIR}/**/*.js`], // 扫描所有 HTML 和 JS
        css: [`${BUILD_DIR}/${CSS_FILE}`],
        safelist: {
            standard: [
                /^pjax-/,       // 保留 pjax 相关类名
                'active',       // 保留常见的动态类名
                'is-open',
                /^nprogress/    // 保留顶部进度条样式
            ],
            deep: [],
            greedy: []
        }
    });

    // 覆盖原始的大体积 CSS 文件
    const optimizedCss = purgeResult[0].css;
    fs.writeFileSync(`${BUILD_DIR}/${CSS_FILE}`, optimizedCss);
    console.log(`✅ CSS 文件已瘦身，新大小: ${(optimizedCss.length / 1024).toFixed(2)} KB`);

    // --- 阶段 2: Critical CSS (首屏内联) ---
    // 目标：为每个 HTML 页面内联它的首屏样式，并异步加载主 CSS
    console.log('Step 2: 正在提取 Critical CSS...');

    // 获取所有 HTML 文件
    const htmlFiles = glob.sync(`${BUILD_DIR}/**/*.html`);

    for (const file of htmlFiles) {
        try {
            // 使用 critical 库处理 html
            const { html } = await generateCritical({
                base: BUILD_DIR,
                src: path.relative(BUILD_DIR, file),
                // inline 选项配置，使用 swap 策略实现异步加载
                inline: {
                    strategy: 'swap', // 自动把 <link> 改成 rel="preload" (异步加载)
                },
                extract: false, // 注意：这里不要 extract，保留完整 CSS 给 Pjax 使用
                width: 1300,
                height: 900,
            });

            fs.writeFileSync(file, html);
            console.log(`   - 已处理: ${path.relative(BUILD_DIR, file)}`);
        } catch (error) {
            console.error(`   - 处理失败: ${file}`, error);
        }
    }

    console.log('🎉 所有优化完成！');
}

optimize();