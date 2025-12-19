import fs from 'fs';
import path from 'path';

// 目标目录
const targetDir = './static/dist/css';

/**
 * 递归遍历目录并清理 CSS 文件
 * @param {string} dirPath - 当前遍历的文件夹路径
 */
function cleanDirectory(dirPath) {
  // 检查目录是否存在
  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️  目录不存在: ${dirPath}`);
    return;
  }

  // 读取目录下的所有项目
  const items = fs.readdirSync(dirPath);

  items.forEach(item => {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 如果是文件夹，递归进入
      cleanDirectory(fullPath);
    } else if (path.extname(item) === '.css') {
      // 如果是 CSS 文件，执行清理
      removeLicenseHeader(fullPath);
    }
  });
}

/**
 * 读取文件，移除头部注释，并写回
 * @param {string} filePath - 文件完整路径
 */
function removeLicenseHeader(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // 正则解释：
    // ^        : 匹配文件开头
    // \/\*!    : 匹配 /*! (版权注释通常以此开头)
    // [\s\S]*? : 非贪婪匹配任意字符（包括换行）
    // \*\/     : 匹配注释结尾 */
    // \s* : 匹配注释后紧跟的空白字符（换行符等）
    const regex = /^\/\*![\s\S]*?\*\/\s*/;

    // 检查是否有匹配，避免对没有注释的文件进行无用的写入
    if (regex.test(content)) {
      const newContent = content.replace(regex, '');
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ 已清理: ${filePath}`);
    } else {
      // console.log(`⚪ 跳过 (无头): ${filePath}`);
    }
  } catch (err) {
    console.error(`❌ 处理失败: ${filePath}`, err);
  }
}

// --- 开始执行 ---
console.log(`🚀 开始清理目录: ${targetDir}`);
cleanDirectory(targetDir);
console.log(`✨ 全部完成!`);