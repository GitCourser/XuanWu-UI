/**
 * 任务相关API服务
 */

export interface TaskData {
  name: string;
  times: string[];
  workdir: string;
  exec: string;
  enable: boolean;
}

export interface BatchAddRequest {
  tasks: TaskData[];
}

export interface BatchAddResponse {
  code: number;
  message: string;
  data: {
    success: string[];
    failed: Array<{
      task: TaskData;
      error: string;
    }>;
    total: number;
    success_count: number;
    failed_count: number;
  };
}

/**
 * 批量添加任务
 * @param tasks 任务列表
 * @returns Promise<BatchAddResponse>
 */
export const batchAddTasks = async (tasks: TaskData[]): Promise<BatchAddResponse> => {
  const response = await fetch('/api/cron/batch-add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tasks }),
  });
  
  return await response.json();
};

/**
 * 获取任务列表
 * @returns Promise<any>
 */
export const getTaskList = async (): Promise<any> => {
  const response = await fetch('/api/cron/list');
  return await response.json();
};