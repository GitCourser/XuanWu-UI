import { createSignal, createEffect, Component, onMount } from 'solid-js';
import { MonacoEditor } from 'solid-monaco';
import { configureMonaco, getDefaultEditorOptions, setEditorTheme, getEditorTheme } from '../../utils/monaco-utils';
import { useTheme } from '../../stores/theme';

const EnvironmentPage: Component = () => {
  const [content, setContent] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const { isDark } = useTheme();
  const [successMessage, setSuccessMessage] = createSignal('');

  // 初始化Monaco配置
  onMount(() => {
    configureMonaco();
  });

  // 加载环境变量
  const loadEnvironment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/file/content?path=Env.sh');
      const data = await response.json();
      if (data.code === 0) {
        setContent(data.data);
      } else if (data.message === '文件不存在') {
        setContent('# Linux 环境变量示例:\n# export MY_VAR=my_value\n# export MY_VAR2="my value with space"\n# 变量名前关键字"export ", 等号前后不要有空格, 变量值中有空格的要用引号\n');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('加载环境变量失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存环境变量
  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/file/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: 'Env.sh',
          content: content()
        }),
      });

      const data = await response.json();
      if (data.code !== 0) {
        setError(data.message);
      } else {
        setSuccessMessage('保存成功');
      }
    } catch (err) {
      setError('保存失败');
    } finally {
      setSaving(false);
    }
  };

  // 首次加载
  createEffect(() => {
    loadEnvironment();
  });

  const handleEditorMount = (monaco: any) => {
    setEditorTheme(monaco, isDark());
  };

  return (
    <div>
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-2xl font-bold">环境变量</h2>
        <button
          onClick={handleSave}
          disabled={loading() || saving()}
          class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {saving() ? '保存中...' : '保存'}
        </button>
      </div>

      {/* 消息提示 */}
      <div>
        {successMessage() && (
          <div class="mb-4 p-4 bg-green-500/10 text-green-600 rounded-md">
            {successMessage()}
          </div>
        )}
        {error() && (
          <div class="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
            {error()}
          </div>
        )}
      </div>

      {/* 编辑器 */}
      <div class={`flex-1 bg-card rounded-lg shadow overflow-hidden ${successMessage() || error() ? 'h-[calc(100vh-12rem)]' : 'h-[calc(100vh-7rem)]'}`}>
        {loading() ? (
          <div class="p-8 text-center text-muted-foreground">
            加载中...
          </div>
        ) : (
          <MonacoEditor
            value={content()}
            onChange={(value) => setContent(value)}
            language="shell"
            theme={getEditorTheme(isDark())}
            options={getDefaultEditorOptions(false)}
            onMount={handleEditorMount}
          />
        )}
      </div>
    </div>
  );
};

export default EnvironmentPage;
