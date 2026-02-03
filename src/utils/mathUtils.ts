/**
 * 数学工具函数
 *
 * 注意：此文件故意包含类型错误，用于测试 Stop Hook 压力测试
 */

/**
 * 加法函数
 * 故意返回 string 而不是 number，触发 TypeCheck 失败
 */
export function add(a: number, b: number): number {
  // 故意返回 string 类型，导致 TypeCheck 失败
  return `${a + b}` as any;
}

/**
 * 乘法函数
 * 故意返回 string 而不是 number，触发 TypeCheck 失败
 */
export function multiply(a: number, b: number): number {
  // 故意返回 string 类型，导致 TypeCheck 失败
  return `${a * b}` as any;
}
