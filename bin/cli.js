#!/usr/bin/env node
const { Command } = require('commander');
const replaceDeepCopy = require('../src/index');
const path = require('path');
const fs = require('fs');

// 安全获取版本号
let version = '0.0.0';
try {
  const pkgPath = path.join(__dirname, '../package.json');
  const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(pkgContent);
  version = pkg.version || '0.0.0';
} catch (error) {
  console.error('警告: 无法获取版本号', error.message);
}

const program = new Command();

program
  .name('replace-deep-copy')
  .description('Replace JSON.parse(JSON.stringify()) with structuredClone in JS files')
  .version(version, '-v, --version', '显示版本号')
  .argument('<directory>', '要处理的目录路径')
  .option('-d, --dry-run', '模拟运行而不实际修改文件')
  .option('--verbose', '显示详细输出')
  .action((directory, options) => {
    try {
      // 解析目录路径
      const absPath = path.resolve(directory);
      
      // 检查目录是否存在
      if (!fs.existsSync(absPath)) {
        console.error(`错误: 目录 "${absPath}" 不存在`);
        process.exit(1);
      }
      
      // 检查是否是目录
      const stats = fs.statSync(absPath);
      if (!stats.isDirectory()) {
        console.error(`错误: "${absPath}" 不是目录`);
        process.exit(1);
      }
      
      // 执行替换操作
      replaceDeepCopy(absPath, options)
        .then(({ totalReplacements, filesChanged }) => {
          if (options.dryRun) {
            console.log(`\n模拟运行完成。将会在 ${filesChanged} 个文件中进行 ${totalReplacements} 处替换。`);
          } else {
            console.log(`\n成功！在 ${filesChanged} 个文件中进行了 ${totalReplacements} 处替换。`);
          }
        })
        .catch(err => {
          console.error('错误:', err.message);
          if (options.verbose) {
            console.error(err.stack);
          }
          process.exit(1);
        });
    } catch (error) {
      console.error('错误:', error.message);
      process.exit(1);
    }
  });

// 处理无参数情况
if (process.argv.length < 3) {
  program.help();
}

program.parse(process.argv);