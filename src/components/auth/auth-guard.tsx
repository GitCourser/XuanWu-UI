import { Component, JSX } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, Show, createRoot } from 'solid-js';

interface Props {
  children: JSX.Element;
}

const AuthGuard: Component<Props> = (props) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = createSignal<boolean | null>(null);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check');
      const data = await response.json();
      const isAuth = data.code === 0;
      setIsAuthenticated(isAuth);

      if (!isAuth) {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    }
  };

  createRoot(() => {
    createEffect(() => {
      checkAuth();
    });
  });

  return (
    <Show when={isAuthenticated()} fallback={<div>正在检查登录状态...</div>}>
      {props.children}
    </Show>
  );
};

export default AuthGuard;