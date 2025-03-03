import { Router, Route } from '@solidjs/router';
import { lazy } from 'solid-js';
import './styles/globals.css';
import AuthGuard from './components/auth/AuthGuard';

// 布局
const AppLayout = lazy(() => import('./components/layout/app-layout'));

// 页面
const LoginPage = lazy(() => import('./pages/auth/login'));
const TaskPage = lazy(() => import('./pages/task'));
const FilePage = lazy(() => import('./pages/file'));
const DependencyPage = lazy(() => import('./pages/dependency'));
const EnvironmentPage = lazy(() => import('./pages/environment'));
const SettingsPage = lazy(() => import('./pages/settings'));
const NotFoundPage = lazy(() => import('./pages/not-found'));

function App() {
  return (
    <Router>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={AppLayout}>
        <Route path="/" component={AuthGuard}>
          <Route path="/" component={TaskPage} />
          <Route path="/task" component={TaskPage} />
          <Route path="/file" component={FilePage} />
          <Route path="/dependency" component={DependencyPage} />
          <Route path="/environment" component={EnvironmentPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/*all" component={NotFoundPage} />
        </Route>
      </Route>
    </Router>
  );
}

export default App;
