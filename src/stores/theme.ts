import { createSignal, createEffect, createRoot } from 'solid-js';

// 检查系统主题
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// 从localStorage获取主题设置，如果没有则使用系统主题
const getInitialTheme = () => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    return savedTheme === 'dark';
  }
  return prefersDark.matches;
};

const [isDark, setIsDark] = createSignal(getInitialTheme());

// 监听系统主题变化
prefersDark.addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    setIsDark(e.matches);
  }
});

createRoot(() => {
  createEffect(() => {
    const dark = isDark();
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  });
});

export const useTheme = () => {
  return {
    isDark,
    theme: () => isDark() ? 'dark' : 'light',
    toggleTheme: () => setIsDark(prev => !prev),
  };
};