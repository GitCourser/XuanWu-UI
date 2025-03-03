import { createSignal, createEffect } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { sha256 } from '../../utils/crypto';

interface Profile {
  username: string;
  cookie_expire_days: number;
  log_clean_days: number;
}

const SettingsPage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = createSignal<Profile>({
    username: '',
    cookie_expire_days: 30,
    log_clean_days: 7,
  });
  const [formValues, setFormValues] = createSignal<Partial<Profile & { password: string }>>({});
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal('');
  const [oldPassword, setOldPassword] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');

  // 加载配置
  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.code === 0) {
        setProfile(data.data.profile);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    // 验证密码
    if (password() && password() !== confirmPassword()) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password() && !oldPassword()) {
      setError('修改密码时必须输入旧密码');
      return;
    }

    try {
      setSaving(true);
      setError('');

      // 只提交有值的参数
      const payload: any = {};
      if (formValues().username) payload.username = formValues().username;
      if (formValues().cookie_expire_days) payload.cookie_expire_days = formValues().cookie_expire_days;
      if (formValues().log_clean_days) payload.log_clean_days = formValues().log_clean_days;
      if (password()) {
        payload.password = await sha256(password());
        payload.old_password = await sha256(oldPassword());
      }

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.code !== 0) {
        setError(data.message);
      } else {
        // 如果修改了用户名或密码，跳转到登录页
        if (payload.username || payload.password) {
          navigate('/login');
        }
      }
    } catch (err) {
      setError('保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 首次加载
  createEffect(() => {
    loadProfile();
  });

  return (
    <div>
      <h2 class="text-2xl font-bold mb-6">系统设置</h2>

      {/* 错误提示 */}
      {error() && (
        <div class="mb-4 p-4 bg-destructive/10 text-destructive rounded-md">
          {error()}
        </div>
      )}

      <div class="max-w-2xl bg-card rounded-lg shadow p-6">
        {loading() ? (
          <div class="text-center text-muted-foreground">
            加载中...
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-6">
            {/* 用户名 */}
            <div>
              <label class="block text-sm font-medium mb-2">用户名</label>
              <input
                type="text"
                onInput={(e) => setFormValues({ ...formValues(), username: e.currentTarget.value })}
                placeholder={profile().username}
                class="input-base w-full"
              />
            </div>

            {/* 旧密码 */}
            <div>
              <label class="block text-sm font-medium mb-2">旧密码</label>
              <input
                type="password"
                value={oldPassword()}
                onInput={(e) => setOldPassword(e.currentTarget.value)}
                placeholder="修改密码时必填"
                class="input-base w-full"
              />
            </div>

            {/* 新密码 */}
            <div>
              <label class="block text-sm font-medium mb-2">新密码</label>
              <input
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder="留空表示不修改"
                class="input-base w-full"
              />
            </div>

            {/* 确认密码 */}
            <div>
              <label class="block text-sm font-medium mb-2">确认密码</label>
              <input
                type="password"
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                placeholder="再次输入新密码"
                class="input-base w-full"
              />
            </div>

            {/* Cookie有效期 */}
            <div>
              <label class="block text-sm font-medium mb-2">Cookie有效期（天）</label>
              <input
                type="number"
                min="1"
                max="365"
                onInput={(e) => setFormValues({ ...formValues(), cookie_expire_days: parseInt(e.currentTarget.value) })}
                placeholder={profile().cookie_expire_days.toString()}
                class="input-base w-full"
              />
            </div>

            {/* 日志清理时间 */}
            <div>
              <label class="block text-sm font-medium mb-2">日志清理时间（天）</label>
              <input
                type="number"
                min="1"
                max="365"
                onInput={(e) => setFormValues({ ...formValues(), log_clean_days: parseInt(e.currentTarget.value) })}
                placeholder={profile().log_clean_days.toString()}
                class="input-base w-full"
              />
            </div>

            {/* 保存按钮 */}
            <div class="flex justify-end">
              <button
                type="submit"
                disabled={saving()}
                class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {saving() ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default SettingsPage; 