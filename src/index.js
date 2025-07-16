const fs = require('fs').promises;
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const { globby } = require('globby');

async function replaceDeepCopy(directory, options = {}) {
  const { dryRun = false, verbose = false } = options;
  
  // 获取所有JS文件
  const files = await globby([`${directory}/**/*.js`]);
  let totalReplacements = 0;
  let filesChanged = 0;

  if (verbose) {
    console.log(`Found ${files.length} JS files to process`);
  }

  for (const file of files) {
    try {
      const code = await fs.readFile(file, 'utf-8');
      let replacements = 0;
      
      // 解析AST
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx'],
        allowReturnOutsideFunction: true,
        tokens: true
      });

      // 遍历AST查找替换目标
      traverse(ast, {
        CallExpression(path) {
          const { node } = path;
          
          // 检查是否是JSON.parse(JSON.stringify(...))
          if (node.callee.object?.name === 'JSON' && 
              node.callee.property?.name === 'parse' &&
              node.arguments[0]?.callee?.object?.name === 'JSON' &&
              node.arguments[0]?.callee?.property?.name === 'stringify') {
            
            const cloneTarget = node.arguments[0].arguments[0];
            
            // 创建新的structuredClone节点
            const newNode = {
              type: 'CallExpression',
              callee: { 
                type: 'Identifier', 
                name: 'structuredClone',
                loc: node.callee.loc
              },
              arguments: [cloneTarget]
            };
            
            path.replaceWith(newNode);
            replacements++;
            totalReplacements++;
            
            if (verbose) {
              console.log(`Found replacement at ${file}:${node.loc.start.line}`);
            }
          }
        }
      });

      // 生成新代码
      const output = generator(ast, {
        retainLines: true,
        comments: true,
        compact: false,
        concise: false
      });
      
      const newCode = output.code;

      // 检查代码是否实际改变
      if (newCode !== code) {
        // 生成新代码并写回文件
        if (!dryRun) {
          await fs.writeFile(file, newCode);
          filesChanged++;
          console.log(`[REPLACED] ${file} (${replacements} replacements)`);
        } else {
          console.log(`[DRY RUN] ${file} (${replacements} replacements)`);
        }
      } else if (replacements > 0) {
        console.warn(`[WARNING] Found ${replacements} replacements in ${file} but generated code is unchanged!`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
      if (verbose) {
        console.error(error.stack);
      }
    }
  }
  
  console.log(`\nTotal files processed: ${files.length}`);
  console.log(`Total replacements made: ${totalReplacements}`);
  console.log(`Files changed: ${filesChanged}`);
  return { totalReplacements, filesChanged };
}

module.exports = replaceDeepCopy;