import { useQuery } from '@tanstack/react-query';
import { fetchMenuCategories, fetchMenuItems, getCurrentUser } from './api';

function useApiQuery(queryKey, queryFn, options = {}) {
  return useQuery({
    queryKey,
    queryFn: async () => await queryFn(),
    ...options,
  });
}

export const queryKeys = {
  me: ['auth', 'me'],
  menu: {
    categories: ['menu', 'categories'],
    items: (params) => ['menu', 'items', JSON.stringify(params)],
  },
};

export function useMenuCategories(options = {}) {
  return useApiQuery(queryKeys.menu.categories, fetchMenuCategories, { staleTime: 15000, ...options });
}

export function useMenuItems(params = {}, options = {}) {
  return useApiQuery(queryKeys.menu.items(params), () => fetchMenuItems(params), options);
}

export function useCurrentUser(options = {}) {
  return useApiQuery(queryKeys.me, getCurrentUser, options);
}