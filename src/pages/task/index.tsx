import { createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { useTheme } from '../../stores/theme';
import { Dialog } from '@kobalte/core';
import { onCleanup } from 'solid-js';
import { MonacoEditor } from 'solid-monaco';
import { configureMonaco, getDefaultEditorOptions, setEditorTheme, getEditorTheme } from '../../utils/monaco-utils';

interface Task {
  id: string;
  name: string;
  exec: string;
  times: string[];
  next: string;
  enable: boolean;
  status: string;
  workdir: string;
}

interface TaskFormData {
  name: string;
  exec: string;
  times: string[];
  workdir: string;
  enable: boolean;
}

const TASK_ITEM_HEIGHT = 64; // 单个任务项的高度（包含间距）
const OTHER_SPACE = 180; // 预留给其他UI元素的空间（头部、分页器等）

const TaskPage = () => {
  const [tasks, setTasks] = createSignal<Task[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [currentPage, setCurrentPage] = createSignal(1);
  const [pageSize, setPageSize] = createSignal(13);
  const [totalPages, setTotalPages] = createSignal(1);
  const [isDialogOpen, setIsDialogOpen] = createSignal(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = createSignal(false);
  const [logContent, setLogContent] = createSignal('');
  const [currentTaskName, setCurrentTaskName] = createSignal('');
  const [editingTask, setEditingTask] = createSignal<TaskFormData | null>(null);
  const [formError, setFormError] = createSignal('');
  const [isNewTask, setIsNewTask] = createSignal(false);
  const [inputKeys, setInputKeys] = createSignal<number[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = createSignal(false);
  const [taskToDelete, setTaskToDelete] = createSignal<Task | null>(null);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = createSignal(false);
  const [customTask, setCustomTask] = createSignal<{name: string, exec: string, workdir: string}>({
    name: '',
    exec: '',
    workdir: ''
  });
  const { theme, isDark } = useTheme();

  // 初始化Monaco配置
  onMount(() => {
    configureMonaco();
  });

  // 计算最佳显示数量
  const calculatePageSize = () => {
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - OTHER_SPACE;
    const optimalSize = Math.floor(availableHeight / TASK_ITEM_HEIGHT);
    return Math.max(5, optimalSize); // 确保至少显示5条
  };

  // 监听窗口大小变化
  createEffect(() => {
    const handleResize = () => {
      setPageSize(calculatePageSize());
    };
    
    // 初始计算
    handleResize();
    
    window.addEventListener('resize', handleResize);
    onCleanup(() => {
      window.removeEventListener('resize', handleResize);
    });
  });

  // 加载任务列表
  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cron/list');
      const data = await response.json();
      if (data.code === 0 && data.data) {
        setTasks(data.data);
        setTotalPages(Math.ceil(data.data.length / pageSize()));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 验证cron表达式
  const validateCron = (cron: string): boolean => {
    // 支持5段式、6段式和描述符
    const cronRegex = /^(@(annually|yearly|monthly|weekly|daily|midnight|hourly))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)*\d+|\d+(-\d+)?|\*\/\d+|\*)( |$)){5,6})$/;
    return cronRegex.test(cron.trim());
  };

  // 处理任务表单提交
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const task = editingTask();
    if (!task) return;

    // 验证cron表达式
    for (const time of task.times) {
      if (!validateCron(time)) {
        setFormError('无效的定时表达式');
        return;
      }
    }

    try {
      const url = task.name ? '/api/cron/update' : '/api/cron/add';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      });
      const data = await response.json();
      if (data.code === 0) {
        setIsDialogOpen(false);
        loadTasks(); // 重新加载任务列表
      } else {
        setFormError(data.message);
      }
    } catch (err) {
      setFormError('保存任务失败');
    }
  };

  // 处理任务操作
  const handleTaskAction = async (action: string, task: Task) => {
    if (action === 'delete') {
      setTaskToDelete(task);
      setIsDeleteDialogOpen(true);
      return;
    }

    try {
      const response = await fetch(`/api/cron/${action}?name=${encodeURIComponent(task.name)}`);
      const data = await response.json();
      if (data.code === 0) {
        loadTasks(); // 重新加载任务列表
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`${action}任务失败`);
    }
  };

  // 确认删除任务
  const confirmDelete = async () => {
    const task = taskToDelete();
    if (!task) return;

    try {
      const response = await fetch(`/api/cron/delete?name=${encodeURIComponent(task.name)}`);
      const data = await response.json();
      if (data.code === 0) {
        loadTasks(); // 重新加载任务列表
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('删除任务失败');
    } finally {
      setIsDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  // 处理自定义任务执行
  const handleCustomExecute = async () => {
    try {
      setLogContent('正在执行...');
      setIsLogDialogOpen(true);
      setCurrentTaskName(customTask().name);
      
      const response = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customTask()),
      });
      const data = await response.json();
      if (data.code === 0) {
        setLogContent(data.data.output || '无输出');
      } else {
        setError(data.message);
        setIsLogDialogOpen(false);
      }
    } catch (err) {
      setError(`执行任务失败`);
      setIsLogDialogOpen(false);
    } finally {
      setIsCustomDialogOpen(false);
      setCustomTask({ name: '', exec: '', workdir: '' });
    }
  };

  // 执行任务操作
  const handleTaskExecute = async (task: Task) => {
    try {
      setLogContent('正在执行...');
      setIsLogDialogOpen(true);
      setCurrentTaskName(task.name);
      
      const response = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: task.name }),
      });
      const data = await response.json();
      if (data.code === 0) {
        setLogContent(data.data.output || '无输出');
      } else {
        setError(data.message);
        setIsLogDialogOpen(false);
      }
    } catch (err) {
      setError(`执行任务失败`);
      setIsLogDialogOpen(false);
    }
  };

  // 加载日志内容
  const loadLogContent = async (taskName: string) => {
    try {
      setCurrentTaskName(taskName);
      const response = await fetch(`/api/file/content?path=logs/${taskName}.log`);
      const data = await response.json();
      if (data.code === 0) {
        setLogContent(data.data);
        setIsLogDialogOpen(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('加载日志失败');
    }
  };

  // 首次加载
  createEffect(() => {
    loadTasks();
  });

  // 获取当前页的任务
  const currentTasks = () => {
    const start = (currentPage() - 1) * pageSize();
    const end = start + pageSize();
    return tasks().slice(start, end);
  };

  // 判断是否为移动端
  const isMobile = () => window.innerWidth < 768;

  // 处理编辑器挂载
  const handleEditorMount = (monaco: any, editor: any) => {
    setEditorTheme(monaco, isDark());
    // editor.trigger("keyboard", "editor.action.goToBottom");
    editor.setScrollPosition({
      scrollTop: editor.getScrollHeight()  // 滚动到最大高度
    });
  };

  return (
    <div>
      {/* 顶部操作栏 */}
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-2xl font-bold">任务管理</h2>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            onClick={() => {
              setIsNewTask(true);
              setEditingTask({ name: '', exec: '', times: [''], workdir: '', enable: true });
              setInputKeys([Date.now()]);
              setIsDialogOpen(true);
            }}
          >
            新建任务
          </button>
          <button
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            onClick={() => {
              setIsCustomDialogOpen(true);
            }}
          >
            自定义执行
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error() && (
        <div class="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
          {error()}
        </div>
      )}

      {/* 任务列表 */}
      <div class="bg-card rounded-lg shadow overflow-hidden">
        <table class="w-full table-fixed">
          <thead>
            <tr class="border-b border-border">
              <th class={`px-6 py-3 text-left text-sm font-medium whitespace-nowrap ${isMobile() ? 'w-[5rem]' : 'w-[4rem]'}`}>名称</th>
              <Show when={!isMobile()}>
                <th class="px-6 py-3 text-left text-sm font-medium whitespace-nowrap w-[5vw]">命令</th>
                <th class="px-6 py-3 text-left text-sm font-medium w-[4.5rem]">定时</th>
                <th class="px-6 py-3 text-left text-sm font-medium whitespace-nowrap w-[3rem]">下次运行</th>
              </Show>
              <th class={`px-6 py-3 text-left text-sm font-medium whitespace-nowrap ${isMobile() ? 'w-[6rem]' : 'w-[7.5rem]'}`}>操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <For each={currentTasks()}>
              {(task) => (
                <tr class="hover:bg-muted/50">
                  <td class="px-6 py-4 text-sm truncate" title={task.name}>
                    <span
                      class={`${
                        task.status === 'running' ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {task.name}
                    </span>
                  </td>
                  <Show when={!isMobile()}>
                    <td class="px-6 py-4 text-sm truncate" title={task.exec}>{task.exec}</td>
                    <td class="px-6 py-4 text-sm whitespace-pre-line">{task.times.join('\n')}</td>
                    <td class="px-6 py-4 text-sm whitespace-nowrap">{task.next}</td>
                  </Show>
                  <td class="px-6 py-4 text-sm whitespace-nowrap">
                    <Show
                      when={!isMobile()}
                      fallback={
                        <div class="flex space-x-2">
                          <button
                            class={`p-2 rounded-full ${
                              task.status === 'running'
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-green-500/10 text-green-500'
                            }`}
                            onClick={() => handleTaskAction(task.enable ? 'disable' : 'enable', task)}
                            title={task.enable ? '禁用' : '启用'}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              class="w-4 h-4"
                              fill="currentColor"
                            >
                              {task.enable ? (
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />  // 暂停图标
                              ) : (
                                <path d="M8 5v14l11-7z" />  // 播放图标
                              )}
                            </svg>
                          </button>
                          <button
                            class={`p-2 rounded-full ${
                              theme() === 'dark'
                                ? 'bg-blue-400/10 text-blue-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                            onClick={() => {
                              setIsNewTask(false);
                              setEditingTask({
                                name: task.name,
                                exec: task.exec,
                                times: task.times,
                                workdir: task.workdir,
                                enable: task.enable,
                              });
                              setInputKeys(task.times.map(() => Date.now()));
                              setIsDialogOpen(true);
                            }}
                            title="修改"
                          >
                            ✏️
                          </button>
                          <button
                            class={`p-2 rounded-full ${
                              theme() === 'dark'
                                ? 'bg-blue-400/10 text-blue-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                            onClick={() => loadLogContent(task.name)}
                            title="日志"
                          >
                            📋
                          </button>
                          <button
                            class={`p-2 rounded-full ${
                              theme() === 'dark'
                                ? 'bg-blue-400/10 text-blue-400'
                                : 'bg-primary/10 text-primary'
                            }`}
                            onClick={() => handleTaskExecute(task)}
                            title="测试"
                          >
                            ▶️
                          </button>
                          <button
                            class="p-2 bg-destructive/10 text-destructive rounded-full"
                            onClick={() => handleTaskAction('delete', task)}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      }
                    >
                      <div class="flex space-x-2">
                        <button
                          class={`px-2 py-1 rounded text-xs ${
                            task.status === 'running'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-green-500/10 text-green-500'
                          }`}
                          onClick={() => handleTaskAction(task.enable ? 'disable' : 'enable', task)}
                        >
                          {task.enable ? '🔴禁用' : '🟢启用'}
                        </button>
                        <button
                          class={`px-2 py-1 rounded text-xs ${
                            theme() === 'dark'
                              ? 'bg-blue-400/10 text-blue-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                          onClick={() => {
                            setIsNewTask(false);
                            setEditingTask({
                              name: task.name,
                              exec: task.exec,
                              times: task.times,
                              workdir: task.workdir,
                              enable: task.enable,
                            });
                            setInputKeys(task.times.map(() => Date.now()));
                            setIsDialogOpen(true);
                          }}
                        >
                          ✏️修改
                        </button>
                        <button
                          class={`px-2 py-1 rounded text-xs ${
                            theme() === 'dark'
                              ? 'bg-blue-400/10 text-blue-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                          onClick={() => loadLogContent(task.name)}
                        >
                          📋日志
                        </button>
                        <button
                          class={`px-2 py-1 rounded text-xs ${
                            theme() === 'dark'
                              ? 'bg-blue-400/10 text-blue-400'
                              : 'bg-primary/10 text-primary'
                          }`}
                          onClick={() => handleTaskExecute(task)}
                        >
                          ▶️测试
                        </button>
                        <button
                          class="px-2 py-1 bg-destructive/10 text-destructive rounded text-xs"
                          onClick={() => handleTaskAction('delete', task)}
                        >
                          🗑️删除
                        </button>
                      </div>
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>

        {/* 加载状态 */}
        {loading() && (
          <div class="p-8 text-center text-muted-foreground">
            加载中...
          </div>
        )}

        {/* 空状态 */}
        {!loading() && tasks().length === 0 && (
          <div class="p-8 text-center text-muted-foreground">
            暂无任务
          </div>
        )}

        {/* 分页 */}
        <Show when={totalPages() > 1}>
          <div class="flex justify-center items-center space-x-2 p-4 border-t border-border">
            <button
              class="px-3 py-1 rounded text-sm disabled:opacity-50"
              disabled={currentPage() === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              上一页
            </button>
            <span class="text-sm">
              {currentPage()} / {totalPages()}
            </span>
            <button
              class="px-3 py-1 rounded text-sm disabled:opacity-50"
              disabled={currentPage() === totalPages()}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              下一页
            </button>
          </div>
        </Show>
      </div>

      {/* 任务表单对话框 */}
      <Dialog.Root open={isDialogOpen()} onOpenChange={setIsDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 bg-black/50" />
          <Dialog.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background p-6 rounded-lg shadow-lg">
            <Dialog.Title class="text-lg font-bold mb-4">
              {isNewTask() ? '新建任务' : '修改任务'}
            </Dialog.Title>
            <form onSubmit={handleSubmit}>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">名称</label>
                  <input
                    type="text"
                    value={editingTask()?.name || ''}
                    disabled={!isNewTask()}
                    onInput={(e) =>
                      setEditingTask({ ...editingTask()!, name: e.currentTarget.value })
                    }
                    class="w-full px-3 py-2 rounded-md border border-border bg-background disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">命令</label>
                  <input
                    type="text"
                    value={editingTask()?.exec || ''}
                    onInput={(e) =>
                      setEditingTask({ ...editingTask()!, exec: e.currentTarget.value })
                    }
                    class="w-full px-3 py-2 rounded-md border border-border bg-background"
                    required
                  />
                  <p class="mt-1 text-xs text-muted-foreground">
                    支持所有命令行的命令，如：<br/>
                    ls，dir，sh test.sh，test.bat，python test.py，node tsst.js<br/>
                    如设置了Linux环境变量，要让脚本能读取，需在命令前加"xw "，如：<br/>
                    xw python test.py，xw node tsst.js
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">工作目录</label>
                  <input
                    type="text"
                    value={editingTask()?.workdir || ''}
                    onInput={(e) =>
                      setEditingTask({ ...editingTask()!, workdir: e.currentTarget.value })
                    }
                    class="w-full px-3 py-2 rounded-md border border-border bg-background"
                  />
                  <p class="mt-1 text-xs text-muted-foreground">
                    默认目录：data/<br/>
                    相对路径：scripts 等于 data/scripts<br/>
                    绝对路径：/etc/config 或 c:/windows/cmd<br/>
                    路径分隔不分系统统一用正斜杠"/"
                  </p>
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">定时表达式</label>
                  <div class="space-y-2">
                    <For each={inputKeys()}>
                      {(key, index) => {
                        const currentValue = editingTask()?.times[index()] || '';
                        return (
                          <div class="flex space-x-2" prop:key={key}>
                            <input
                              type="text"
                              value={currentValue}
                              onInput={(e) => {
                                const newValue = e.currentTarget.value;
                                setEditingTask(prev => {
                                  if (!prev) return prev;
                                  const newTimes = [...prev.times];
                                  newTimes[index()] = newValue;
                                  return { ...prev, times: newTimes };
                                });
                              }}
                              class="flex-1 px-3 py-2 rounded-md border border-border bg-background"
                              required
                            />
                            <div class="flex space-x-2">
                              {index() === inputKeys().length - 1 && (
                                <button
                                  type="button"
                                  class="px-3 py-2 bg-primary text-white rounded-md"
                                  onClick={() => {
                                    setInputKeys(prev => [...prev, Date.now()]);
                                    setEditingTask(prev => ({
                                      ...prev!,
                                      times: [...prev!.times, '']
                                    }));
                                  }}
                                >
                                  +
                                </button>
                              )}
                              {index() > 0 && (
                                <button
                                  type="button"
                                  class="px-3 py-2 bg-destructive text-white rounded-md"
                                  onClick={() => {
                                    setInputKeys(prev => prev.filter((_, i) => i !== index()));
                                    setEditingTask(prev => ({
                                      ...prev!,
                                      times: prev!.times.filter((_, i) => i !== index())
                                    }));
                                  }}
                                >
                                  -
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                  <p class="mt-1 text-xs text-muted-foreground">
                    5 段式（分 时 日 月 周）<br/>
                    6 段式（秒 分 时 日 月 周）<br/>
                    描述符（@midnight、@every 1h30m）
                  </p>
                </div>
              </div>

              {formError() && (
                <div class="mt-4 p-2 text-sm text-destructive bg-destructive/10 rounded">
                  {formError()}
                </div>
              )}

              <div class="mt-6 flex justify-end space-x-2">
                <button
                  type="button"
                  class="px-4 py-2 text-sm"
                  onClick={() => setIsDialogOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-primary text-white rounded-md text-sm"
                >
                  保存
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 删除确认弹窗 */}
      <Dialog.Root open={isDeleteDialogOpen()} onOpenChange={setIsDeleteDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 bg-black/50" />
          <Dialog.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg w-[90vw] max-w-md">
            <Dialog.Title class="text-lg font-bold mb-4">确认删除</Dialog.Title>
            <Dialog.Description class="mb-4">
              确定要删除任务 "{taskToDelete()?.name}" 吗？此操作不可撤销。
            </Dialog.Description>
            <div class="flex justify-end gap-2">
              <button
                class="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/90"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                取消
              </button>
              <button
                class="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90"
                onClick={confirmDelete}
              >
                删除
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 自定义执行弹窗 */}
      <Dialog.Root open={isCustomDialogOpen()} onOpenChange={setIsCustomDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 bg-black/50" />
          <Dialog.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg w-[90vw] max-w-md">
            <Dialog.Title class="text-lg font-bold mb-4">自定义执行</Dialog.Title>
            <form onSubmit={(e) => { e.preventDefault(); handleCustomExecute(); }}>
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium mb-1">任务名称</label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-md border border-border bg-background"
                    value={customTask().name}
                    onInput={(e) => setCustomTask({ ...customTask(), name: e.currentTarget.value })}
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">执行命令</label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-md border border-border bg-background"
                    value={customTask().exec}
                    onInput={(e) => setCustomTask({ ...customTask(), exec: e.currentTarget.value })}
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1">工作目录</label>
                  <input
                    type="text"
                    class="w-full px-3 py-2 rounded-md border border-border bg-background"
                    value={customTask().workdir}
                    onInput={(e) => setCustomTask({ ...customTask(), workdir: e.currentTarget.value })}
                  />
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  class="px-4 py-2 text-sm"
                  onClick={() => setIsCustomDialogOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  class="px-4 py-2 bg-primary text-white rounded-md text-sm"
                >
                  执行
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 日志弹窗 */}
      <Dialog.Root open={isLogDialogOpen()} onOpenChange={setIsLogDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 bg-black/50" />
          <Dialog.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-6 rounded-lg shadow-lg w-[90vw] max-w-3xl max-h-[90vh] overflow-hidden">
            <Dialog.Title class="text-lg font-bold mb-4">{currentTaskName()}</Dialog.Title>
            <div class="h-[65vh] overflow-hidden">
              <MonacoEditor
                value={logContent()}
                language="xwlog"
                theme={getEditorTheme(isDark())}
                options={getDefaultEditorOptions(true)}
                onMount={handleEditorMount}
              />
            </div>
            <div class="flex justify-end mt-4">
              <button
                class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                onClick={() => setIsLogDialogOpen(false)}
              >
                关闭
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default TaskPage; 