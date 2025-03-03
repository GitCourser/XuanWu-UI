import { Component, createEffect } from 'solid-js';
import { useNavigate, useLocation, RouteSectionProps } from '@solidjs/router';

const AuthGuard: Component<RouteSectionProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.code !== 0) {
        navigate('/login', { replace: true });
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