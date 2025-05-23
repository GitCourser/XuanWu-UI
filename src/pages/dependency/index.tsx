import { createSignal, onMount } from 'solid-js';

// 从文件中删除指定内容
const removeFromFile = async (path: string, contentToRemove: string) => {
  try {
    // 读取现有内容
    const response = await fetch(`/api/file/content?path=${path}`);
    const data = await response.json();
    
    if (data.code === 0 && data.data) {
      // 将内容分割成数组并删除指定项
      const items = data.data.split(' ').filter((item: string) => item !== contentToRemove);
      
      // 用空格重新连接并保存
      await fetch('/api/file/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path,
          content: items.join(' ')
        }),
      });
    }
  } catch (err) {
    console.error('删除依赖记录失败:', err);
  }
};

// 追加内容到文件
const appendToFile = async (path: string, newContent: string) => {
  try {
    // 读取现有内容
    const response = await fetch(`/api/file/content?path=${path}`);
    const data = await response.json();
    
    // 准备新内容
    let finalContent = newContent;
    if (data.code === 0 && data.data) {
      // 如果文件有内容,添加空格
      finalContent = `${data.data} ${newContent}`;
    }
    
    // 保存文件
    await fetch('/api/file/edit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        content: finalContent
      }),
    });
  } catch (err) {
    console.error('记录依赖失败:', err);
  }
};

const DependencyPage = () => {
  const [npmRegistry, setNpmRegistry] = createSignal('');
  const [pipRegistry, setPipRegistry] = createSignal('');
  const [npmPackage, setNpmPackage] = createSignal('');
  const [pipPackage, setPipPackage] = createSignal('');
  const [installLog, setInstallLog] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal('');
  const [npmPlaceholder, setNpmPlaceholder] = createSignal('加载中...');
  const [pipPlaceholder, setPipPlaceholder] = createSignal('加载中...');

  // 初始化获取当前源配置
  onMount(async () => {
    try {
      // 获取pip源
      const pipResponse = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'getpip',
          exec: 'pip config get global.index-url',
          workdir: '',
        }),
      });
      const pipData = await pipResponse.json();
      if (pipData.code === 0 && pipData.data.output) {
        // 提取第一行作为源地址
        const pipUrl = pipData.data.output.split('\n')[0];
        setPipPlaceholder(pipUrl || '请输入PIP源地址');
      }

      // 获取npm源
      const npmResponse = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'getnpm',
          exec: 'npm config get registry',
          workdir: '',
        }),
      });
      const npmData = await npmResponse.json();
      if (npmData.code === 0 && npmData.data.output) {
        // 提取第一行作为源地址
        const npmUrl = npmData.data.output.split('\n')[0];
        setNpmPlaceholder(npmUrl || '请输入NPM源地址');
      }
    } catch (err) {
      console.error('获取源配置失败:', err);
    }
  });

  // 应用源设置
  const handleApplyRegistry = async (type: 'npm' | 'pip') => {
    try {
      setLoading(true);
      setError('');
      setInstallLog('正在执行...');

      const registry = type === 'npm' ? npmRegistry() : pipRegistry();
      const cmd = type === 'npm'
        ? `npm config set registry ${registry}`
        : `pip config set global.index-url ${registry}`;

      const response = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `set${type}`,
          exec: cmd,
          workdir: '',
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setInstallLog(data.data.output);
        if (type === 'npm') {
          setNpmPlaceholder(registry);
          setNpmRegistry('');
        } else {
          setPipPlaceholder(registry);
          setPipRegistry('');
        }
      } else {
        setError(data.message);
        setInstallLog(data.message);
      }
    } catch (err) {
      setError('设置源失败');
      setInstallLog('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 安装包
  const handleInstallPackage = async (type: 'npm' | 'pip', isUninstall = false) => {
    const packageName = type === 'npm' ? npmPackage() : pipPackage();
    if (!packageName) {
      setError('请输入包名');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setInstallLog('正在执行...');

      const cmd = type === 'npm'
        ? `npm ${isUninstall ? 'uninstall -g' : 'install -g --no-cache'} ${packageName}`
        : `pip ${isUninstall ? 'uninstall -y' : 'install --no-cache-dir'} ${packageName}`;

      const response = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${isUninstall ? 'uninstall' : 'install'}${type}`,
          exec: cmd,
          workdir: '',
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setInstallLog(data.data.output);
        
        // 安装成功且不是卸载操作时,记录到文件
        if (!isUninstall) {
          if (type === 'npm') {
            await appendToFile('npm.txt', packageName);
            setNpmPackage('');
          } else {
            await appendToFile('pip.txt', packageName);
            setPipPackage('');
          }
        } else {
          // 卸载成功时从记录中删除
          if (type === 'npm') {
            await removeFromFile('npm.txt', packageName);
            setNpmPackage('');
          } else {
            await removeFromFile('pip.txt', packageName);
            setPipPackage('');
          }
        }
      } else {
        setError(data.message);
        setInstallLog(data.message);
      }
    } catch (err) {
      setError(isUninstall ? '卸载失败' : '安装失败');
      setInstallLog('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 查看已安装的包列表
  const handleListPackages = async (type: 'npm' | 'pip') => {
    try {
      setLoading(true);
      setError('');
      setInstallLog('正在获取包列表...');

      const cmd = type === 'npm'
        ? 'npm list -g --depth=0'
        : 'pip list';

      const response = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `list${type}`,
          exec: cmd,
          workdir: '',
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setInstallLog(data.data.output);
      } else {
        setError(data.message);
        setInstallLog(data.message);
      }
    } catch (err) {
      setError('获取包列表失败');
      setInstallLog('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 class="text-2xl font-bold mb-6">依赖管理</h2>

      {error() && (
        <div class="mb-4 text-sm text-destructive">
          {error()}
        </div>
      )}

      <div class={`flex flex-col ${error() ? 'h-[calc(100vh-12rem)]' : 'h-[calc(100vh-7rem)]'}`}>
        <div class="shrink-0 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 左侧：PIP相关 */}
            <div class="space-y-6">
              {/* PIP源设置 */}
              <div>
                <label class="block text-sm font-medium mb-2">PIP 源</label>
                <div class="flex space-x-2">
                  <input
                    type="text"
                    value={pipRegistry()}
                    onInput={(e) => setPipRegistry(e.currentTarget.value)}
                    placeholder={pipPlaceholder()}
                    class="input-base flex-1"
                  />
                  <button
                    onClick={() => handleApplyRegistry('pip')}
                    disabled={loading()}
                    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    应用
                  </button>
                </div>
              </div>

              {/* Python 包 */}
              <div>
                <label class="block text-sm font-medium mb-2">Python 包</label>
                <div class="flex space-x-2">
                  <input
                    type="text"
                    value={pipPackage()}
                    onInput={(e) => setPipPackage(e.currentTarget.value)}
                    placeholder="输入包名"
                    class="input-base flex-1"
                  />
                  <button
                    onClick={() => handleInstallPackage('pip')}
                    disabled={loading()}
                    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    安装
                  </button>
                  <button
                    onClick={() => handleInstallPackage('pip', true)}
                    disabled={loading()}
                    class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
                  >
                    卸载
                  </button>
                  <button
                    onClick={() => handleListPackages('pip')}
                    disabled={loading()}
                    class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
                  >
                    查看
                  </button>
                </div>
              </div>
            </div>

            {/* 右侧：NPM相关 */}
            <div class="space-y-6">
              {/* NPM源设置 */}
              <div>
                <label class="block text-sm font-medium mb-2">NPM 源</label>
                <div class="flex space-x-2">
                  <input
                    type="text"
                    value={npmRegistry()}
                    onInput={(e) => setNpmRegistry(e.currentTarget.value)}
                    placeholder={npmPlaceholder()}
                    class="input-base flex-1"
                  />
                  <button
                    onClick={() => handleApplyRegistry('npm')}
                    disabled={loading()}
                    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    应用
                  </button>
                </div>
              </div>

              {/* Node.js 包 */}
              <div>
                <label class="block text-sm font-medium mb-2">Node.js 包</label>
                <div class="flex space-x-2">
                  <input
                    type="text"
                    value={npmPackage()}
                    onInput={(e) => setNpmPackage(e.currentTarget.value)}
                    placeholder="输入包名"
                    class="input-base flex-1"
                  />
                  <button
                    onClick={() => handleInstallPackage('npm')}
                    disabled={loading()}
                    class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    安装
                  </button>
                  <button
                    onClick={() => handleInstallPackage('npm', true)}
                    disabled={loading()}
                    class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50"
                  >
                    卸载
                  </button>
                  <button
                    onClick={() => handleListPackages('npm')}
                    disabled={loading()}
                    class="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50"
                  >
                    查看
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 安装日志 */}
        <div class="flex-1 flex flex-col min-h-0">
          <label class="shrink-0 block text-sm font-medium mb-2">安装日志</label>
          <pre class="flex-1 p-4 bg-card border border-border rounded-lg font-mono text-sm whitespace-pre-wrap overflow-auto">
            {installLog() || '暂无日志'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DependencyPage;
