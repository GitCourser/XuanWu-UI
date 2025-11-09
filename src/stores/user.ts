import { createSignal } from 'solid-js';

export interface Profile {
  username: string;
  cookie_expire_days?: number;
  log_clean_days?: number;
}

export interface UserData {
  profile: Profile;
  version: string;
  is_windows: boolean;
}

const [profile, setProfile] = createSignal<Profile>({ username: '' });
const [version, setVersion] = createSignal('');
const [isWindows, setIsWindows] = createSignal(false);
const [isLoading, setIsLoading] = createSignal(false);
const [isLoaded, setIsLoaded] = createSignal(false);

let loadPromise: Promise<void> | null = null;

const loadProfile = async () => {
  // 如果已经在加载中，返回现有的 Promise
  if (loadPromise) {
    return loadPromise;
  }

  // 如果已经加载过，直接返回
  if (isLoaded()) {
    return Promise.resolve();
  }

  setIsLoading(true);
  
  loadPromise = (async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      if (data.code === 0) {
        setProfile(data.data.profile);
        setVersion(data.data.version);
        setIsWindows(data.data.is_windows);
        setIsLoaded(true);
      } else {
        throw new Error('Failed to load profile');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      throw err;
    } finally {
      setIsLoading(false);
      loadPromise = null;
    }
  })();

  return loadPromise;
};

const clearProfile = () => {
  setProfile({ username: '' });
  setVersion('');
  setIsWindows(false);
  setIsLoaded(false);
  loadPromise = null;
};

export const useUser = () => {
  return {
    profile,
    version,
    isWindows,
    isLoading,
    isLoaded,
    loadProfile,
    clearProfile,
  };
};
