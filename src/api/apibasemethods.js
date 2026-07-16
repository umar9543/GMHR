import { useCallback } from "react";

import axios from "axios";

import { useRouter, useSearchParams } from 'src/routes/hooks';
import { APP_API, PATH_AFTER_LOGIN } from "src/config-global";

const apiHandle = axios.create({
  baseURL: APP_API,
});

const Get = (endPoint) => apiHandle.get(endPoint);

const GetById = (endPoint, id) => apiHandle.get(`${endPoint}/${id}`);

const Post = (endPoint, body) => apiHandle.post(endPoint, body);

const Put = (endPoint, body) => apiHandle.put(endPoint, body);

const Delete = (endPoint) => apiHandle.delete(endPoint);






const ACCESS_KEY = 'UserData';

export const getAccessToken = () => {
  const userData = JSON.parse(localStorage.getItem(ACCESS_KEY));
  return userData?.token || null;
};
console.log(getAccessToken())
export const setAccessToken = (token) => {
  const userData = JSON.parse(localStorage.getItem(ACCESS_KEY)) || {};
  userData.token = token;
  localStorage.setItem(ACCESS_KEY, JSON.stringify(userData));
};
export const clearAuth = () => {
  localStorage.removeItem(ACCESS_KEY);
};


async function refreshToken() {
  

  const expiredToken = getAccessToken();
  if (!expiredToken) return null;

  try {
    console.debug('Attempting token refresh with cookies:', document.cookie);

    const res = await fetch('https://192.168.100.37:8080/api/account/refresh-token', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${expiredToken}`
      },
    });

    console.debug('Refresh response headers:', [...res.headers.entries()]);

    if (!res.ok) {
      const error = await res.text();
      console.error('Refresh failed:', res.status, error);
      
      // if (res.status === 401 || res.status === 403) {
      //   clearAuth();
      // }
      return null;
    }

    const data = await res.json();
    if (!data.token) {
      console.error('No token in refresh response');
      return null;
    }

    console.debug('Token refresh successful');
    return data.token;
  } catch (error) {
    console.error('Refresh token network error:', error);
    return null;
  }
}


console.log(refreshToken())

// Custom Hook
export function useAuthFetch() {
  const router  = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');

  const authFetch = useCallback(async (url, options = {}) => {
    const token = getAccessToken();

    let init = {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    };

    let res = await fetch(url, init);

    if (res.status === 401 || res.status === 403) {
      const newToken = await refreshToken();

      if (!newToken) {
       
        router.push(returnTo || PATH_AFTER_LOGIN);
        throw new Error('Authentication expired');
      }

      setAccessToken(newToken);

      init = {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${newToken}`,
        },
      };

      res = await fetch(url, init);
    }

    return res;
  }, [router, returnTo]);

  return authFetch;
}

export { Get, Put, Post, Delete, GetById };