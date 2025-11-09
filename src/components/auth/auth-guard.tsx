import { Component, createEffect } from 'solid-js';
import { useNavigate, useLocation, RouteSectionProps } from '@solidjs/router';
import { useUser } from '../../stores/user';

const AuthGuard: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loadProfile, isLoaded } = useUser();

  const checkAuth = async () => {
    try {
      // 只在未加载时才请求
      if (!isLoaded()) {
        await loadProfile();
      }
    } catch (err) {
      navigate('/login', { replace: true });
    }
  };

  createEffect(() => {
    // 监听路由变化，每次路由变化时检查授权
    if (location.pathname !== '/login') {
      checkAuth();
    }
  });

  return <div class="h-full">{location.pathname !== '/login' && props.children}</div>;
};

export default AuthGuard;