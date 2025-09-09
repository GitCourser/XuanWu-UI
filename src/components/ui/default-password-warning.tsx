import { Dialog } from '@kobalte/core';
import { useNavigate } from '@solidjs/router';

interface DefaultPasswordWarningProps {
  open: boolean;
}

/**
 * 默认密码警告弹窗组件
 * 当检测到使用默认密码且不是内网访问时显示
 * 这个弹窗是强制性的，用户只能点击按钮跳转到设置页面
 */
const DefaultPasswordWarning = (props: DefaultPasswordWarningProps) => {
  const navigate = useNavigate();

  const handleGoToSettings = () => {
    navigate('/settings');
  };

  return (
    <Dialog.Root open={props.open}>
      <Dialog.Portal>
        {/* 背景遮罩 - 不可点击关闭 */}
        <Dialog.Overlay class="fixed inset-0 bg-black/80 z-50" />
        
        {/* 弹窗内容 */}
        <Dialog.Content class="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background p-8 rounded-lg shadow-2xl w-[90vw] max-w-md z-50 border-2 border-destructive">
          {/* 警告图标 */}
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <svg class="w-8 h-8 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>

          {/* 标题 */}
          <Dialog.Title class="text-xl font-bold text-center mb-4 text-destructive">
            安全警告
          </Dialog.Title>

          {/* 内容 */}
          <Dialog.Description class="text-center mb-6 text-muted-foreground leading-relaxed">
            <p class="mb-3">
              检测到您正在使用默认的用户名和密码访问系统。
            </p>
            <p class="mb-3">
              为了您的系统安全，<strong class="text-foreground">必须立即修改默认密码</strong>。
            </p>
            <p class="text-sm text-destructive">
              为了更安全，用户名也可修改。
            </p>
          </Dialog.Description>

          {/* 按钮 */}
          <div class="flex justify-center">
            <button
              onClick={handleGoToSettings}
              class="px-6 py-3 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 font-medium transition-colors"
            >
              立即修改密码
            </button>
          </div>

          {/* 提示文字 */}
          <p class="text-xs text-center text-muted-foreground mt-4">
            点击按钮将跳转到系统设置页面进行密码修改
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default DefaultPasswordWarning;