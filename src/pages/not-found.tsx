import { A } from '@solidjs/router';

const NotFound = () => {
  return (
    <div class="min-h-screen flex items-center justify-center bg-background">
      <div class="text-center">
        <h1 class="text-6xl font-bold text-primary mb-4">404</h1>
        <p class="text-xl text-muted-foreground mb-8">页面未找到</p>
        <A
          href="/"
          class="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-primary hover:bg-primary/90"
        >
          返回首页
        </A>
      </div>
    </div>
  );
};

export default NotFound; 