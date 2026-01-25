/**
 * P1 轮询循环压力测试
 * 故意包含类型错误以触发 CI 失败
 */

// 故意的类型错误：将 string 赋值给 number
export const testValue: number = "this will fail typecheck";

export function testFunction(): string {
  return testValue; // 类型不匹配
}
