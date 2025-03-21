// 根据文件扩展名获取语言
export const getLanguageByExtension = (filename: string): string => {
  if (!filename) return 'plaintext';

  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'cfg':
    case 'json':
      return 'json';
    case 'js':
    case 'ts':
      return 'javascript';
    case 'py':
      return 'python';
    case 'log':
      return 'xwlog';
    case 'ini':
    case 'env':
      return 'ini';
    case 'md':
      return 'markdown';
    case 'sh':
      return 'shell';
    case 'bat':
    case 'cmd':
      return 'bat';
    case 'ps1':
      return 'powershell';
    case 'xml':
      return 'xml';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
};

// 获取默认编辑器选项
export const getDefaultEditorOptions = (readOnly: boolean = false) => {
  return {
    minimap: { enabled: true },
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    readOnly: readOnly,
    fontSize: 15,
    tabSize: 4,
    locale: 'zh-cn'
  };
};

// 根据系统主题设置编辑器主题
export const setEditorTheme = (monaco: any, isDarkMode: boolean = true) => {
  monaco.editor.setTheme(isDarkMode ? 'vs-dark' : 'vs');
};

// 获取当前主题
export const getEditorTheme = (isDarkMode: boolean = true) => {
  return isDarkMode ? 'vs-dark' : 'vs';
};