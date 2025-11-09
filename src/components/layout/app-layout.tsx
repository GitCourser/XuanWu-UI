import { A, useLocation, useNavigate } from '@solidjs/router';
import { createSignal, Show, type Component, onMount } from 'solid-js';
import { useTheme } from '../../stores/theme';
import { useUser } from '../../stores/user';
import pkg from '../../../package.json';
import MonacoPreloader from '../monaco-preloader';

const menuItems = [
  { path: '/task', label: '任务管理', icon: '📋' },
  { path: '/file', label: '文件管理', icon: '📁' },
  { path: '/dependency', label: '依赖管理', icon: '📦' },
  { path: '/environment', label: '环境变量', icon: '⚙️' },
  { path: '/settings', label: '系统设置', icon: '🔧' },
];

interface Props {
  children?: any;
}

const AppLayout: Component<Props> = (props) => {
  const [isMenuOpen, setIsMenuOpen] = createSignal(false);
  const [showUserMenu, setShowUserMenu] = createSignal(false);
  const [isMobileView, setIsMobileView] = createSignal(false);
  const { isDark, toggleTheme } = useTheme();
  const { profile, version, clearProfile } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout');
      const data = await response.json();
      if (data.code === 0) {
        clearProfile();
        navigate('/login');
      }
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  onMount(() => {
    // 检测是否为移动端视图
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => window.removeEventListener('resize', checkMobileView);
  });

  const MenuItem = (props: { path: string; label: string; icon: string }) => (
    <A
      href={props.path}
      class={`flex items-center justify-center space-x-3 px-4 py-3 rounded-lg transition-colors text-base ${
        isActive(props.path)
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted'
      }`}
    >
      <span class="w-6 text-center">{props.icon}</span>
      <span>{props.label}</span>
    </A>
  );

  return (
    <div class="min-h-screen bg-background">
      {/* PC端布局 */}
      <Show when={!isMobileView()}>
      <div class="flex">
        {/* 左侧边栏 */}
        <aside class="w-64 min-h-screen bg-card border-r border-border">
          <div class="flex flex-col h-full p-4">
            {/* Logo */}
            <div class="mb-8 flex justify-center">
              <img src="/logo.png" alt="Logo" class="h-16" />
            </div>

            {/* 菜单 */}
            <nav class="flex-1 space-y-2">
              {menuItems
                // .filter(item => item.path !== '/environment' || !isWindows())
                .map((item) => (
                  <MenuItem {...item} />
                ))}
            </nav>

            {/* 版本信息 */}
            <div class="mt-auto space-y-2 mb-4 text-sm text-muted-foreground text-center">
              <div><a href="https://github.com/GitCourser/xuanwu-ui" target="_blank">前端：v{pkg.version}</a></div>
              <div><a href="https://github.com/GitCourser/xuanwu" target="_blank">后端：v{version()}</a></div>
            </div>

            {/* 底部功能区 */}
            <div class="flex items-center px-2 py-1">
              <button
                onClick={toggleTheme}
                class="p-2 rounded-lg hover:bg-muted"
                title={isDark() ? '切换到亮色模式' : '切换到暗色模式'}
              >
                {isDark() ? '🌙' : '☀️'}
              </button>

              <div class="relative flex-1">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu())}
                  class="w-full px-3 py-2 rounded-lg hover:bg-muted text-sm text-center ml-2"
                >
                  {profile().username}
                </button>

                <Show when={showUserMenu()}>
                  <div class="absolute bottom-full right-2 mb-1 w-[calc(100%-16px)] bg-popover border border-border rounded-lg shadow-lg">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      class="w-full px-3 py-2 text-sm text-center hover:bg-muted rounded-lg text-destructive"
                    >
                      退出
                    </button>
                  </div>
                </Show>
              </div>
            </div>
          </div>
        </aside>

        {/* 右侧内容 */}
        <main class="flex-1">
          <div class="p-6">
            {props.children}
          </div>
        </main>
      </div>
      </Show>

      {/* 移动端布局 */}
      <Show when={isMobileView()}>
      <div>
        {/* 顶部导航栏 */}
        <header class="h-16 border-b border-border px-4 flex items-center justify-between">
          <img src="/logo.png" alt="Logo" class="h-6" />
          <div class="flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              class="p-2 hover:bg-muted rounded-lg"
            >
              {isDark() ? '🌙' : '☀️'}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen())}
              class="p-2 hover:bg-muted rounded-lg"
            >
              {isMenuOpen() ? '✕' : '☰'}
            </button>
          </div>
        </header>

        {/* 移动端菜单 */}
        <Show when={isMenuOpen()}>
          <div class="fixed inset-0 bg-background z-50">
            <div class="p-4">
              <div class="flex justify-end mb-4">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  class="p-2 hover:bg-muted rounded-lg"
                >
                  ✕
                </button>
              </div>
              <nav class="space-y-2">
                {menuItems
                  // .filter(item => item.path !== '/environment' || !isWindows())
                  .map((item) => (
                    <A
                      href={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      class={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </A>
                  ))}
              </nav>
              <div class="mt-8 space-y-4">
                <div class="text-sm text-muted-foreground text-center">
                  <a href="https://github.com/GitCourser/xuanwu-ui" target="_blank">前端：v{pkg.version}</a><br/>
                  <a href="https://github.com/GitCourser/xuanwu" target="_blank">后端：v{version()}</a>
                </div>
                <div class="flex items-center justify-between p-2">
                  <span class="text-sm">admin</span>
                  <button onClick={handleLogout} class="text-sm text-destructive hover:text-destructive/90">
                    退出
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* 页面内容 */}
        <main class="p-4">
          {props.children}
        </main>
      </div>
      </Show>
      {/* Monaco编辑器预加载 */}
      <MonacoPreloader />
    </div>
  );
};

export default AppLayout;