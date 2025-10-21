'use client';

import { useEffect, useMemo } from 'react';
import type { ActivityDTO, ReviewRequestDTO } from '../../../lib/api/types';
import {
  formatActivityDateDetail,
  formatFullDate,
  formatReviewStatus,
  getCategoryBadgeClass,
  getReviewStatusClass,
  mapLearningOutcome,
} from '../utils/formatters';

interface ActivityModalProps {
  activity: ActivityDTO | null;
  reviewRequest: ReviewRequestDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestVerification: () => Promise<void>;
  requestDisabled: boolean;
}

function renderStars(rating: number | null) {
  if (!rating || rating <= 0) {
    return <span data-testid="text-rating-detail">Not rated</span>;
  }

  const rounded = Math.round(rating);
  return (
    <div className="rating-display" data-testid="text-rating-detail">
      {Array.from({ length: 5 }).map((_, index) => (
        <i
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className={`fas fa-star${index < rounded ? '' : ' inactive'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function ReviewStatusPanel({ request }: { request: ReviewRequestDTO | null }) {
  if (!request) {
    return null;
  }
  return (
    <div className="detail-item review-status-panel">
      <i className="fas fa-shield-check" aria-hidden="true" />
      <div className="detail-item-content">
        <p>Verification Status</p>
        <span className={`badge review-status ${getReviewStatusClass(request.status)}`}>
          {formatReviewStatus(request.status)}
        </span>
        <span className="detail-helper">
          Updated {formatFullDate(request.updatedAt)}
        </span>
        {request.assessorNotes && (
          <p className="detail-notes">
            {request.assessorNotes}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ActivityModal({
  activity,
  reviewRequest,
  isOpen,
  onClose,
  onRequestVerification,
  requestDisabled,
}: ActivityModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [isOpen, onClose]);

  const outcomes = useMemo(() => {
    if (!activity) {
      return [];
    }
    return (activity.learningOutcomes ?? [])
      .map((value, index) => {
        const { label, aria } = mapLearningOutcome(value);
        return { label, aria, id: `${activity.id}-outcome-${index}` };
      })
      .filter((entry) => entry.label);
  }, [activity]);

  if (!isOpen || !activity) {
    return null;
  }

  const handleOuterClick = () => onClose();
  const handleInnerClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="modal show" role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" onClick={handleOuterClick}>
      <div className="modal-content" data-testid="dialog-activity-detail" onClick={handleInnerClick}>
        <div className="modal-header">
          <h3 id="activity-detail-title" data-testid="text-dialog-title">
            Activity Details
          </h3>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Close activity details">
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        <div className="activity-detail-grid">
          <div className="activity-detail-main">
            <div className="activity-detail-header">
              <div className="activity-badges">
                <span className={`badge ${getCategoryBadgeClass(activity.category)}`} data-testid={`badge-${activity.category}`}>
                  {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                </span>
                <span className="badge" data-testid={`badge-${activity.status}`}>
                  {activity.status}
                </span>
              </div>
              <h1 className="activity-detail-title" data-testid="text-activity-title">
                {activity.title}
              </h1>
              {activity.description && (
                <p className="activity-detail-description" data-testid="text-activity-description">
                  {activity.description}
                </p>
              )}
            </div>

            {activity.challengeDescription && (
              <div className="challenge-section">
                <h3>Challenge Faced</h3>
                <p data-testid="text-challenge-description">{activity.challengeDescription}</p>
              </div>
            )}

            <div className="learning-outcomes-section">
              <h3>Learning Outcomes</h3>
              {outcomes.length > 0 ? (
                <div className="learning-outcomes-tags">
                  {outcomes.map((outcome) => (
                    <span key={outcome.id} className="badge" data-testid={`badge-outcome-${outcome.id}`} aria-label={outcome.aria}>
                      {outcome.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p data-testid="text-no-outcomes">No learning outcomes recorded for this activity.</p>
              )}
            </div>
          </div>

          <aside className="activity-sidebar">
            <div className="card">
              <h3>Activity Details</h3>
              <div className="detail-item">
                <i className="fas fa-calendar" aria-hidden="true" />
                <div className="detail-item-content">
                  <p>{activity.endDate ? 'Dates' : 'Date'}</p>
                  <span data-testid="text-start-date">{formatActivityDateDetail(activity)}</span>
                </div>
              </div>
              <div className="detail-item">
                <i className="fas fa-clock" aria-hidden="true" />
                <div className="detail-item-content">
                  <p>Total Hours</p>
                  <span data-testid="text-total-hours">{activity.hours} hours</span>
                </div>
              </div>
              <div className="detail-item">
                <i className="fas fa-tag" aria-hidden="true" />
                <div className="detail-item-content">
                  <p>Category</p>
                  <span data-testid="text-category">
                    {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                  </span>
                </div>
              </div>
              <div className="detail-item">
                <i className="fas fa-star" aria-hidden="true" />
                <div className="detail-item-content">
                  <p>Enjoyment</p>
                  {renderStars(activity.rating)}
                </div>
              </div>
              <div className="detail-item">
                <i className="fas fa-mountain" aria-hidden="true" />
                <div className="detail-item-content">
                  <p>Difficulty</p>
                  <span data-testid="text-difficulty-detail">
                    {typeof activity.difficulty === 'number' && Number.isFinite(activity.difficulty)
                      ? `${activity.difficulty}/10`
                      : 'Not recorded'}
                  </span>
                </div>
              </div>

              <ReviewStatusPanel request={reviewRequest} />

              <div className="detail-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={onRequestVerification}
                  disabled={requestDisabled}
                  data-testid="button-request-verification"
                >
                  <i className="fas fa-paper-plane" aria-hidden="true" />
                  {reviewRequest?.status === 'pending' ? 'Request Pending' : 'Request Verification'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
