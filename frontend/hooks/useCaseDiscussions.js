import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Custom hook to fetch case discussions from backend API.
 * @param {string} caseId - ID of the medical case.
 */
export const useGetDiscussions = (caseId) => {
  return useQuery({
    queryKey: ['discussions', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      const res = await api.get(`/cases/${caseId}`);
      return res.data?.data?.case?.comments || [];
    },
    enabled: Boolean(caseId),
  });
};

/**
 * Custom hook to add a new discussion/comment with Optimistic UI updates.
 * @param {string} caseId - ID of the medical case.
 */
export const useAddDiscussion = (caseId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newComment) => {
      const res = await api.post(`/cases/${caseId}/comments`, newComment);
      return res.data;
    },

    // Optimistic UI updates
    onMutate: async (newComment) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['discussions', caseId] });

      // Snapshot the previous discussions value
      const previousDiscussions = queryClient.getQueryData(['discussions', caseId]);

      // Optimistically update the cache with the new comment
      queryClient.setQueryData(['discussions', caseId], (old = []) => {
        const optimisticComment = {
          _id: `temp-${Date.now()}`,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          isOptimistic: true,
          ...newComment,
        };
        return Array.isArray(old) ? [...old, optimisticComment] : [optimisticComment];
      });

      // Return context containing snapshot for rollback on error
      return { previousDiscussions };
    },

    // If the mutation fails, roll back to the snapshotted state
    onError: (err, newComment, context) => {
      if (context?.previousDiscussions) {
        queryClient.setQueryData(['discussions', caseId], context.previousDiscussions);
      }
    },

    // Always refetch after error or success to ensure cache matches server state
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions', caseId] });
    },
  });
};
