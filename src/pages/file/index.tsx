import { createSignal, createEffect, For } from 'solid-js';
import { MonacoEditor } from 'solid-monaco';
import { getLanguageByExtension, getDefaultEditorOptions, setEditorTheme, getEditorTheme } from '../../utils/monaco-utils';
import { useTheme } from '../../stores/theme';

interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  updated_at: string;
  children?: FileItem[];
  expanded?: boolean;
}

interface UploadFailedItem {
  name: string;
  error: string;
}

// 禁用删除的文件列表
const PROTECTED_FILES = [
  'config.json',
  'env.ini',
  'notify.js',
  'notify.py',
  'npm.txt',
  'pip.txt',
  'logs/main.log', 
  'logs/run_temp.log'
];

interface UploadResponse {
  code: number;
  data: {
    success: string[];
    failed: UploadFailedItem[];
  };
}

const FilePage = () => {
  const [files, setFiles] = createSignal<FileItem[]>([]);
  const [currentPath, setCurrentPath] = createSignal('');
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal('');
  const [selectedFile, setSelectedFile] = createSignal<string | null>(null);
  const [fileContent, setFileContent] = createSignal('');
  const [isEditing, setIsEditing] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = createSignal(false);
  const [newFolderName, setNewFolderName] = createSignal('');
  const [isDragging, setIsDragging] = createSignal(false);
  const [newFileName, setNewFileName] = createSignal('');
  const [showRenameDialog, setShowRenameDialog] = createSignal(false);
  const [wordWrap, setWordWrap] = createSignal(localStorage.getItem('editor_word_wrap') === 'true');
  const { isDark } = useTheme();
  const [successMessage, setSuccessMessage] = createSignal('');
  const [isLogDialogOpen, setIsLogDialogOpen] = createSignal(false);
  const [logContent, setLogContent] = createSignal('');
  let fileInputRef: HTMLInputElement | undefined;

  // 处理文件上传
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      const path = currentPath();
      
      // 如果path为空且文件名为config.json，则跳过
      files.forEach(file => {
        if (!path && file.name === 'config.json') {
          return; // 跳过config.json
        }
        formData.append('files[]', file);
      });

      if (path) {
        formData.append('path', path);
      }

      const response = await fetch('/api/file/batch-upload', {
        method: 'POST',
        body: formData
      });

      const data: UploadResponse = await response.json();
      if (data.code === 0) {
        if (data.data.success.length > 0) {
          setSuccessMessage(`上传成功：${data.data.success.join(', ')}`);
        }
        if (data.data.failed && data.data.failed.length > 0) {
          setError(`上传失败：${data.data.failed.map(item => item.name).join(', ')}`);
        }
        loadFiles(currentPath());
      } else {
        setError('上传失败');
      }
    } catch (err) {
      setError('文件上传失败');
    }
  };

  // 处理文件选择
  const handleFileSelect = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      handleFileUpload(Array.from(input.files));
      input.value = ''; // 清空选择，允许重复选择同一文件
    }
  };

  // 加载文件列表
  const loadFiles = async (path: string = '') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/file/list?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      if (data.code === 0) {
        const processedFiles = data.data?.map((file: FileItem) => ({
          ...file,
          expanded: false,
          children: file.is_dir ? [] : undefined
        })) || [];
        if (path === '') {
          setFiles(processedFiles);
        } else {
          // 更新目录树中的子目录
          updateFileTree(files(), path, processedFiles);
          setFiles([...files()]);
        }
        setCurrentPath(path.replace(/\\/g, '/'));
      } else {
        setError('加载文件列表失败');
      }
    } catch (err) {
      setError('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新文件树
  const updateFileTree = (tree: FileItem[], path: string, newChildren: FileItem[]) => {
    for (const file of tree) {
      if (file.path === path) {
        file.children = newChildren;
        file.expanded = true;
        return true;
      }
      if (file.children && updateFileTree(file.children, path, newChildren)) {
        return true;
      }
    }
    return false;
  };

  // 切换目录展开状态
  const toggleDir = async (file: FileItem) => {
    if (file.is_dir) {
      if (!file.expanded || (!file.children || file.children.length === 0)) {
        await loadFiles(file.path);
      } else {
        file.expanded = !file.expanded;
        setFiles([...files()]);
      }
    } else {
      loadFileContent(file.path);
    }
  };

  // 加载文件内容
  const loadFileContent = async (path: string) => {
    try {
      setLoading(true);
      setIsEditing(false);
      const response = await fetch(`/api/file/content?path=${encodeURIComponent(path)}`);
      const data = await response.json();
      if (data.code === 0) {
        setFileContent(data.data);
        setSelectedFile(path.replace(/\\/g, '/'));
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('加载文件内容失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载文件
  const downloadFile = async () => {
    if (!selectedFile()) {
      setError('请先选择一个文件');
      return;
    }

    const filePath = selectedFile() as string;
    if (filePath) {
      window.open(`/api/file/download?path=${encodeURIComponent(filePath)}`, '_blank');
    }
  };

  // 删除文件
  const deleteFile = async (isFolder: boolean = false) => {
    const pathToDelete = isFolder ? currentPath() : selectedFile();
    if (!pathToDelete) {
      setError(isFolder ? '请先选择一个文件夹' : '请先选择一个文件');
      return;
    }

    if (!confirm(`确定要删除${isFolder ? '文件夹' : '文件'} "${pathToDelete}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const parentPath = pathToDelete.split('/').slice(0, -1).join('/');

      const response = await fetch(`/api/file/delete?path=${encodeURIComponent(pathToDelete)}`);
      const data = await response.json();
      if (data.code === 0) {
        // 如果删除的是文件夹，刷新父目录
        // 如果删除的是文件且在当前目录下，刷新当前目录
        if (isFolder) {
          loadFiles(parentPath);
        } else if (pathToDelete.startsWith(currentPath())) {
          loadFiles(currentPath());
        } else {
          loadFiles(parentPath);
        }
        setSelectedFile(null);
        setFileContent('');
      } else {
        setError(isFolder ? '删除文件夹失败' : '删除文件失败');
      }
    } catch (err) {
      setError(isFolder ? '删除文件夹失败' : '删除文件失败');
    }
  };

  // 切换编辑模式
  const toggleEditMode = () => {
    if (!selectedFile()) {
      setError('请先选择一个文件');
      return;
    }
    setIsEditing(!isEditing());
  };

  // 保存文件
  const saveFile = async () => {
    if (!selectedFile()) {
      setError('请先选择一个文件');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const response = await fetch('/api/file/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: selectedFile(),
          content: fileContent()
        }),
      });

      const data = await response.json();
      if (data.code !== 0) {
        setError(data.message);
      } else {
        setIsEditing(false);
      }
    } catch (err) {
      setError('保存文件失败');
    } finally {
      setSaving(false);
    }
  };

  // 创建新文件夹
  const createNewFolder = async () => {
    if (!newFolderName()) {
      setError('请输入文件夹名称');
      return;
    }

    try {
      const folderPath = currentPath() ? `${currentPath()}/${newFolderName()}` : newFolderName();
      const response = await fetch('/api/file/mkdir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: folderPath
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setShowNewFolderDialog(false);
        setNewFolderName('');
        // 刷新当前目录
        loadFiles(currentPath());
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('创建文件夹失败');
    }
  };

  // 渲染文件树节点
  const FileTreeNode = (props: { file: FileItem; level: number }) => {
    return (
      <div style={{ "padding-left": `${props.level * 1.5}rem` }}>
        <div
          class={`p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
            selectedFile() === props.file.path ? 'bg-muted' : ''
          }`}
          onClick={() => toggleDir(props.file)}
        >
          <div class="flex items-center">
            <span class="mr-2">
              {props.file.is_dir
                ? props.file.expanded
                  ? '📂'
                  : '📁'
                : '📄'}
            </span>
            <span class="text-sm">{props.file.name}</span>
          </div>
        </div>
        {props.file.expanded && props.file.children && (
          <For each={props.file.children}>
            {(child) => <FileTreeNode file={child} level={props.level + 1} />}
          </For>
        )}
      </div>
    );
  };

  // 获取当前文件的语言
  const getCurrentLanguage = () => {
    const filePath = selectedFile();
    if (!filePath) return 'plaintext';
    return getLanguageByExtension(filePath);
  };

  // 首次加载
  createEffect(() => {
    loadFiles();
  });

  // 编辑器挂载
  const handleEditorMount = (monaco: any, editor: any) => {
    setEditorTheme(monaco, isDark());
    editor.setScrollPosition({
      scrollTop: editor.getScrollHeight()
    });
  };

  // 判断文件是否可运行
  const isExecutableFile = () => {
    const filePath = selectedFile();
    if (!filePath) return false;
    return /\.(sh|js|py)$/i.test(filePath);
  };

  // 获取执行命令前缀
  const getExecPrefix = (filePath: string) => {
    if (filePath.endsWith('.sh')) return 'sh ';
    if (filePath.endsWith('.js')) return 'node ';
    if (filePath.endsWith('.py')) return 'python ';
    return '';
  };

  // 获取文件所在目录
  const getFileDirectory = (filePath: string) => {
    const parts = filePath.split('/');
    parts.pop(); // 移除文件名
    return parts.join('/');
  };

  // 运行文件
  const handleRunFile = async () => {
    const filePath = selectedFile();
    if (!filePath) return;

    try {
      setLogContent('正在执行...');
      setIsLogDialogOpen(true);

      const fileName = filePath.split('/').pop() || '';
      const execPrefix = getExecPrefix(filePath);
      const workdir = getFileDirectory(filePath);

      const response = await fetch('/api/cron/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fileName.replace(/\.(sh|js|py)$/i, ''),
          exec: execPrefix + fileName,
          workdir: workdir
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setLogContent(data.data.output || data.data.message);
      } else {
        setError(data.message);
        setIsLogDialogOpen(false);
      }
    } catch (err) {
      setError('执行文件失败');
      setIsLogDialogOpen(false);
    }
  };

  // 处理文件拖放
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer?.files || []);
    handleFileUpload(files);
  };

  // 处理拖放相关事件
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  // 复制当前路径
  const copyCurrentPath = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentPath());
      } else {
        const text = currentPath();
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setSuccessMessage('路径已复制到剪贴板');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('复制路径失败: ' + err);
    }
  };

  // 切换自动换行
  const toggleWordWrap = () => {
    const newValue = !wordWrap();
    setWordWrap(newValue);
    localStorage.setItem('editor_word_wrap', String(newValue));
  };

  // 获取编辑器配置
  const getEditorOptions = () => {
    return {
      ...getDefaultEditorOptions(!isEditing()),
      wordWrap: wordWrap() ? 'on' : 'off'
    };
  };

  // 重命名文件夹
  const renameFile = async () => {
    if (!currentPath() || !newFileName()) {
      setError('请先进入文件夹并输入新名称');
      return;
    }

    try {
      const currentFolderPath = currentPath();
      const parentPath = currentFolderPath.substring(0, currentFolderPath.lastIndexOf('/'));
      const newPath = parentPath ? `${parentPath}/${newFileName()}` : newFileName();

      const response = await fetch('/api/file/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: currentFolderPath,
          new_path: newPath
        }),
      });

      const data = await response.json();
      if (data.code === 0) {
        setShowRenameDialog(false);
        setNewFileName('');
        // 重名名成功后加载父目录
        loadFiles(parentPath);
      } else {
        setError(data.message || '重命名失败');
      }
    } catch (err) {
      setError('重命名失败');
    }
  };

  return (
    <div>
      {/* 顶部操作栏 */}
      <div class="mb-6 flex justify-between items-center">
        <h2 class="text-2xl font-bold">文件管理</h2>
        <div class="flex space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            class="hidden"
            multiple
            onChange={handleFileSelect}
          />
          <button
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => fileInputRef?.click()}
          >
            上传文件
          </button>
          <button
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            onClick={() => setShowNewFolderDialog(true)}
          >
            新建目录
          </button>
          {selectedFile() && (
            <>
              <button
                class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                onClick={downloadFile}
              >
                下载
              </button>
              <button
                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                onClick={() => deleteFile(false)}
                disabled={PROTECTED_FILES.includes(selectedFile() || '')}
              >
                删除
              </button>
            </>
          )}
          {currentPath() && (
            <>
              <button
                class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                onClick={() => {
                  setNewFileName(currentPath().split('/').pop() || '');
                  setShowRenameDialog(true);
                }}
                disabled={currentPath() === 'logs'}
              >
                目录改名
              </button>
              <button
                class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                onClick={() => deleteFile(true)}
                disabled={currentPath() === 'logs'}
              >
                删除目录
              </button>
            </>
          )}
        </div>
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

      {/* 文件管理器 */}
      <div class={`grid grid-cols-12 gap-6 ${successMessage() || error() ? 'h-[calc(100vh-12rem)]' : 'h-[calc(100vh-7rem)]'}`}>
        {/* 左侧文件树 */}
        <div
          class={`col-span-4 bg-card rounded-lg shadow overflow-hidden flex flex-col  ${
            isDragging() ? 'ring-2 ring-primary ring-offset-2' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div class="shrink-0 p-4 border-b border-border flex justify-between items-center">
            <div class="flex items-center">
              <button
                class="text-sm text-blue-400 hover:underline"
                onClick={() => loadFiles('')}
              >
                根目录
              </button>
              {currentPath() && (
                <>
                  <span class="mx-2">/</span>
                  <span class="text-sm text-primary-foreground">
                    {currentPath()}
                  </span>
                </>
              )}
            </div>
            {currentPath() && (
              <button
                class="p-2 text-muted-foreground hover:text-primary"
                onClick={copyCurrentPath}
                title="复制当前路径"
              >
                📋
              </button>
            )}
          </div>

          <div class="flex-1 overflow-auto p-4 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/50 [&::-webkit-scrollbar-thumb]:rounded-md">
            {loading() ? (
              <div class="text-center text-muted-foreground">
                加载中...
              </div>
            ) : (
              <div class="space-y-1">
                <For each={files()}>
                  {(file) => <FileTreeNode file={file} level={0} />}
                </For>
              </div>
            )}
          </div>
        </div>

        {/* 右侧文件内容 */}
        <div class="col-span-8 bg-card rounded-lg shadow overflow-hidden flex flex-col">
          {selectedFile() && (
            <div class="shrink-0 p-2 border-b border-border flex justify-between items-center">
              <div class="flex gap-2 items-center flex-1">
                {isExecutableFile() && (
                  <button
                    class="px-3 py-1 text-sm bg-green-500/90 text-white rounded hover:bg-green-500/70"
                    onClick={handleRunFile}
                  >
                    ▶️ 运行
                  </button>
                )}
                <button
                  class="px-3 py-1 text-sm bg-primary/90 text-primary-foreground rounded hover:bg-primary/50"
                  onClick={toggleEditMode}
                >
                  {isEditing() ? '取消' : '编辑'}
                </button>
                {isEditing() && (
                  <button
                    class="px-3 py-1 text-sm bg-primary/90 text-primary-foreground rounded hover:bg-primary/50"
                    onClick={saveFile}
                    disabled={saving()}
                  >
                    {saving() ? '保存中...' : '保存'}
                  </button>
                )}
                <span class="text-sm text-muted-foreground ml-2 truncate">
                  {selectedFile()?.split('/').pop()}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <label class="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    class="sr-only peer"
                    checked={wordWrap()}
                    onChange={toggleWordWrap}
                  />
                  <div class="relative w-11 h-6 bg-muted-foreground/30 peer-checked:bg-primary rounded-full peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  <span class="ms-2 text-sm">自动换行</span>
                </label>
              </div>
            </div>
          )}
          <div class="flex-1 overflow-auto">
            {selectedFile() ? (
              loading() ? (
                <div class="p-8 text-center text-muted-foreground">
                  加载中...
                </div>
              ) : (
                <MonacoEditor
                  value={fileContent()}
                  onChange={(value) => setFileContent(value)}
                  language={getCurrentLanguage()}
                  theme={getEditorTheme(isDark())}
                  options={getEditorOptions()}
                  onMount={handleEditorMount}
                />
              )
            ) : (
              <div class="p-8 text-center text-muted-foreground">
                选择文件查看内容<br/>
                拖放文件到目录树或点击上传按钮上传文件<br/>
                根目录是指玄武程序的数据目录<br/>
                新建与上传路径就是目录树上面显示的打开路径
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新建文件夹对话框 */}
      {showNewFolderDialog() && (
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewFolderDialog(false);
              setNewFolderName('');
            }
          }}
        >
          <div class="bg-background p-6 rounded-lg shadow-lg w-[80vw] max-w-md">
            <h3 class="text-lg font-semibold mb-4">新建文件夹</h3>
            <input
              type="text"
              class="w-full px-3 py-2 rounded-md border border-border bg-background"
              placeholder="请输入文件夹名称"
              value={newFolderName()}
              onInput={(e) => setNewFolderName(e.currentTarget.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  createNewFolder();
                }
              }}
            />
            <div class="flex justify-end gap-2 mt-4">
              <button
                type="submit"
                class="px-4 py-2 bg-primary text-white rounded-md text-sm"
                onClick={createNewFolder}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重命名对话框 */}
      {showRenameDialog() && (
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRenameDialog(false);
              setNewFileName('');
            }
          }}
        >
          <div class="bg-background p-6 rounded-lg shadow-lg w-[80vw] max-w-md">
            <h3 class="text-lg font-semibold mb-4">重命名文件夹</h3>
            <input
              type="text"
              class="w-full px-3 py-2 rounded-md border border-border bg-background"
              placeholder="请输入新名称"
              value={newFileName()}
              onInput={(e) => setNewFileName(e.currentTarget.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  renameFile();
                }
              }}
            />
            <div class="flex justify-end gap-2 mt-4">
              <button
                type="submit"
                class="px-4 py-2 bg-primary text-white rounded-md text-sm"
                onClick={renameFile}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日志弹窗 */}
      {isLogDialogOpen() && (
        <div
          class="fixed inset-0 bg-black/50 flex items-center justify-center"
    
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsLogDialogOpen(false);
            }
          }}
        >
          <div class="bg-background p-6 rounded-lg shadow-lg w-[90vw] max-w-6xl max-h-[90vh] overflow-hidden">
            <h3 class="text-lg font-semibold mb-4">运行结果</h3>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default FilePage;
