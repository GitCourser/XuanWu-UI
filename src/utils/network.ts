/**
 * 网络相关工具函数
 */

/**
 * 检查是否为回环地址或内网地址
 * @param hostname 主机名或IP地址
 * @returns 是否为内网地址
 */
export const isLocalOrPrivateAddress = (hostname: string): boolean => {
  // 回环地址
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // IPv4 内网地址段
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Regex);
  
  if (ipv4Match) {
    const [, a, b, c, d] = ipv4Match.map(Number);
    
    // 检查是否为有效IP
    if (a > 255 || b > 255 || c > 255 || d > 255) {
      return false;
    }
    
    // 私有地址段
    // 10.0.0.0/8
    if (a === 10) return true;
    
    // 172.16.0.0/12
    if (a === 172 && b >= 16 && b <= 31) return true;
    
    // 192.168.0.0/16
    if (a === 192 && b === 168) return true;
    
    // 169.254.0.0/16 (链路本地地址)
    if (a === 169 && b === 254) return true;
  }

  // IPv6 内网地址 (简化检查)
  if (hostname.startsWith('fe80:') || hostname.startsWith('fc00:') || hostname.startsWith('fd00:')) {
    return true;
  }

  return false;
};

/**
 * 获取当前访问的主机名
 * @returns 当前主机名
 */
export const getCurrentHostname = (): string => {
  return window.location.hostname;
};