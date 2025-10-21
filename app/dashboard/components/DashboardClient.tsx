'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ActivityDTO, ReviewRequestDTO } from '../../../lib/api/types';
import { createSupabaseBrowserClient } from '../../../lib/supabaseBrowser';
import ActivityCard from './ActivityCard';
import ActivityModal from './ActivityModal';
import { useToast } from './ToastProvider';
import { useReviewRequests } from '../hooks/useReviewRequests';

interface DashboardClientProps {
  studentId: string;
}

interface ActivitiesResponse {
  activities: ActivityDTO[];
}

export default function DashboardClient({ studentId }: DashboardClientProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { pushToast } = useToast();
  const [activities, setActivities] = useState<ActivityDTO[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      try {
        setLoadingActivities(true);
        const response = await fetch('/api/activities', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }
        const payload = (await response.json()) as ActivitiesResponse;
        if (!active) {
          return;
        }
        setActivities(payload.activities ?? []);
      } catch (error) {
        console.error('Failed to load activities', error);
        if (active) {
          pushToast({ message: 'Unable to load activities. Please try again.', variant: 'error' });
        }
      } finally {
        if (active) {
          setLoadingActivities(false);
        }
      }
    }

    loadActivities();

    return () => {
      active = false;
    };
  }, [pushToast]);

  const { requestsByActivity, isLoading: loadingRequests, isMutating, requestVerification } = useReviewRequests({
    supabase,
    studentId,
    notify: (variant, message) => pushToast({ variant, message }),
  });

  const selectedActivity = selectedActivityId
    ? activities.find((activity) => activity.id === selectedActivityId) ?? null
    : null;
  const selectedReviewRequest: ReviewRequestDTO | null =
    selectedActivity && requestsByActivity[selectedActivity.id]
      ? requestsByActivity[selectedActivity.id]
      : null;

  const handleRequestVerification = async () => {
    if (!selectedActivity) {
      return;
    }
    await requestVerification(selectedActivity.id);
  };

  return (
    <section className="section" aria-labelledby="dashboard-title">
      <div className="container" style={{ maxWidth: '960px' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 id="dashboard-title" className="section-title">
            CAS Activities
          </h1>
          <p className="section-subtitle">
            Track your CAS experiences and request coordinator verification when you are ready.
          </p>
        </header>

        {loadingActivities ? (
          <div className="card" role="status" aria-live="polite">
            <p>Loading activities…</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="card empty-state">
            <p>You have not added any activities yet.</p>
            <p>Add an activity to request your first verification.</p>
          </div>
        ) : (
          <div className="activities-grid">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                reviewRequest={requestsByActivity[activity.id]}
                onSelect={setSelectedActivityId}
              />
            ))}
          </div>
        )}
      </div>

      <ActivityModal
        activity={selectedActivity}
        reviewRequest={selectedReviewRequest}
        isOpen={Boolean(selectedActivity)}
        onClose={() => setSelectedActivityId(null)}
        onRequestVerification={handleRequestVerification}
        requestDisabled={
          !selectedActivity ||
          loadingRequests ||
          (selectedActivity ? isMutating(selectedActivity.id) : false) ||
          Boolean(selectedReviewRequest && selectedReviewRequest.status === 'pending')
        }
      />
    </section>
  );
}
