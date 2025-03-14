import { onMount } from 'solid-js';

/**
 * Monaco编辑器预加载组件
 * 在应用启动时预加载Monaco编辑器所需的资源
 */
const MonacoPreloader = () => {
  onMount(() => {
    // 预加载Monaco编辑器
    const preloadMonaco = async () => {
      try {
        // 动态导入Monaco编辑器
        // 这里使用any类型避免类型错误
        await (import('solid-monaco') as any);
        console.log('Monaco编辑器预加载完成');
      } catch (error) {
        console.error('Monaco编辑器预加载失败:', error);
      }
    };

    // 使用requestIdleCallback在浏览器空闲时加载
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        preloadMonaco();
      });
    } else {
      // 如果浏览器不支持requestIdleCallback，则使用setTimeout延迟加载
      setTimeout(preloadMonaco, 1000);
    }
  });

  return null;
};

export default MonacoPreloader;