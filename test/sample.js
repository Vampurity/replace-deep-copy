// 测试样例
const original = { a: 1, b: { c: 2 } };

// 需要被替换的
const cloned1 = structuredClone(original);
const cloned2 = structuredClone(original);

// 函数中的使用
function deepCopy(obj) {
  return structuredClone(obj);
}

// 不应被替换的
const stringified = JSON.stringify(original);
const parsed = JSON.parse(stringified);