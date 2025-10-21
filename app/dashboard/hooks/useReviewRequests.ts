'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { ReviewRequestDTO, ReviewRequestStatus } from '../../../lib/api/types';

interface ReviewRequestRow {
  id: string;
  activity_id: string;
  student_id: string;
  status: ReviewRequestStatus;
  assessor_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UseReviewRequestsOptions {
  supabase: SupabaseClient;
  studentId: string;
  notify?: (variant: 'success' | 'error' | 'info', message: string) => void;
}

interface UseReviewRequestsResult {
  requestsByActivity: Record<string, ReviewRequestDTO>;
  isLoading: boolean;
  isMutating: (activityId: string) => boolean;
  requestVerification: (activityId: string) => Promise<void>;
}

function mapRow(row: ReviewRequestRow): ReviewRequestDTO {
  return {
    id: row.id,
    activityId: row.activity_id,
    studentId: row.student_id,
    status: row.status,
    assessorNotes: row.assessor_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useReviewRequests({ supabase, studentId, notify }: UseReviewRequestsOptions): UseReviewRequestsResult {
  const [requests, setRequests] = useState<Record<string, ReviewRequestDTO>>({});
  const [loading, setLoading] = useState(true);
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      setLoading(true);
      const { data, error } = await supabase.from('review_requests').select('*').eq('student_id', studentId);

      if (!active) {
        return;
      }

      if (error) {
        console.error('Failed to load review requests', error);
        notify?.('error', 'Unable to load verification requests.');
        setLoading(false);
        return;
      }

      const mapped = ((data ?? []) as ReviewRequestRow[]).reduce<Record<string, ReviewRequestDTO>>((acc, row) => {
        const dto = mapRow(row);
        acc[dto.activityId] = dto;
        return acc;
      }, {});
      setRequests(mapped);
      setLoading(false);
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, [supabase, studentId, notify]);

  useEffect(() => {
    const channel = supabase
      .channel(`review-requests-${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'review_requests',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as ReviewRequestRow | null;
            if (oldRow) {
              setRequests((current) => {
                if (!current[oldRow.activity_id]) {
                  return current;
                }
                const next = { ...current };
                delete next[oldRow.activity_id];
                return next;
              });
            }
            return;
          }

          const newRow = payload.new as ReviewRequestRow | null;
          if (!newRow) {
            return;
          }

          setRequests((current) => ({
            ...current,
            [newRow.activity_id]: mapRow(newRow),
          }));

          if (payload.eventType === 'UPDATE') {
            const previous = payload.old as ReviewRequestRow | null;
            if (previous && previous.status !== newRow.status) {
              if (newRow.status === 'approved') {
                notify?.('success', 'Your activity request was approved.');
              } else if (newRow.status === 'rejected') {
                notify?.(
                  'error',
                  newRow.assessor_notes
                    ? `Request rejected: ${newRow.assessor_notes}`
                    : 'Your review request needs updates.'
                );
              } else if (newRow.status === 'pending' && previous.status !== 'pending') {
                notify?.('info', 'Verification request resubmitted.');
              }
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Supabase channel error for review_requests');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, studentId, notify]);

  const isMutating = useCallback((activityId: string) => mutatingIds.has(activityId), [mutatingIds]);

  const requestVerification = useCallback(
    async (activityId: string) => {
      if (!activityId) {
        notify?.('error', 'Missing activity identifier.');
        return;
      }

      setMutatingIds((current) => {
        const next = new Set(current);
        next.add(activityId);
        return next;
      });

      const finish = () =>
        setMutatingIds((current) => {
          const next = new Set(current);
          next.delete(activityId);
          return next;
        });

      try {
        const existing = requests[activityId];

        if (existing && existing.status === 'pending') {
          notify?.('info', 'This activity already has a pending verification request.');
          return;
        }

        let error: PostgrestError | null = null;
        let row: ReviewRequestRow | null = null;

        if (existing) {
          const result = await supabase
            .from('review_requests')
            .update({ status: 'pending', assessor_notes: null })
            .eq('id', existing.id)
            .select()
            .single();

          error = result.error;
          row = (result.data as ReviewRequestRow) ?? null;
        } else {
          const result = await supabase
            .from('review_requests')
            .insert({ activity_id: activityId, student_id: studentId })
            .select()
            .single();

          error = result.error;
          row = (result.data as ReviewRequestRow) ?? null;
        }

        if (error || !row) {
          console.error('Failed to request verification', error);
          notify?.('error', 'Unable to request verification. Please try again.');
          return;
        }

        setRequests((current) => ({
          ...current,
          [activityId]: mapRow(row),
        }));

        notify?.('success', 'Verification request submitted.');
      } finally {
        finish();
      }
    },
    [requests, supabase, studentId, notify]
  );

  return useMemo(
    () => ({
      requestsByActivity: requests,
      isLoading: loading,
      isMutating,
      requestVerification,
    }),
    [requests, loading, isMutating, requestVerification]
  );
}
