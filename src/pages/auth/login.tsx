import { createSignal } from 'solid-js';
import { auth } from '../../stores/auth';
import { useTheme } from '../../stores/theme';
import { sha256 } from '../../utils/crypto';

const Login = () => {
  const { isDark, toggleTheme } = useTheme();
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [error, setError] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');

    try {
      console.log('开始登录流程');
      if (!username() || !password()) {
        setError('用户名和密码不能为空');
        return;
      }

      console.log('开始密码加密');
      let hashedPassword;
      try {
        hashedPassword = await sha256(password());
        console.log('密码加密完成');
      } catch (encryptError) {
        console.error('密码加密失败:', encryptError);
        setError('系统错误，请刷新页面重试');
        return;
      }
      
      console.log('准备发送登录请求');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username(),
          password: hashedPassword,
        }),
      });

      console.log('收到响应');
      const data = await response.json();
      if (data.code === 0) {
        console.log('登录成功');
        auth.login(data.data.token);
        window.location.href = '/';
      } else {
        console.log('登录失败:', data.message);
        setError(data.message || '登录失败');
      }
    } catch (err) {
      console.error('登录过程出错:', err);
      setError('网络错误，请稍后重试');
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center bg-background">
      <div class="w-full max-w-md">
        <div class="flex justify-end mb-4">
          <button
            onClick={toggleTheme}
            class="p-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground"
            title={isDark() ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark() ? '🌙' : '☀️'}
          </button>
        </div>
        <div class="bg-card border border-border shadow-lg rounded-lg">
          <div class="px-8 py-6 bg-secondary/50 rounded-t-lg border-b border-border">
            <h2 class="text-2xl font-bold text-center text-card-foreground">玄武系统登录</h2>
          </div>
          
          <form onSubmit={handleSubmit} class="px-8 py-6">
            <div class="mb-4">
              <label class="block text-card-foreground text-sm font-bold mb-2" for="username">
                用户名
              </label>
              <input
                class="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
              />
            </div>
            
            <div class="mb-6">
              <label class="block text-card-foreground text-sm font-bold mb-2" for="password">
                密码
              </label>
              <input
                class="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
            </div>
            
            {error() && (
              <div class="mb-4 text-destructive text-sm text-center">
                {error()}
              </div>
            )}
            
            <div class="flex items-center justify-center">
              <button
                class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                type="submit"
              >
                登录
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 