/**
 * 认证相关API服务
 */

/**
 * 检查是否使用默认用户名密码
 * @returns Promise<boolean> 是否为默认密码
 */
export const checkDefaultPassword = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/check-default');
    const data = await response.json();
    if (data.code === 0) {
      return data.data.is_default;
    }
    return false;
  } catch (error) {
    console.error('检查默认密码失败:', error);
    return false;
  }
};