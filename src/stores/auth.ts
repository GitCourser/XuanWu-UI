import { createSignal } from 'solid-js';

// 从localStorage初始化登录状态
const [isAuthenticated, setIsAuthenticated] = createSignal(!!localStorage.getItem('token'));

export const auth = {
  isAuthenticated,
  login: (token: string) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  },
  logout: () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  },
  getToken: () => localStorage.getItem('token'),
}; 