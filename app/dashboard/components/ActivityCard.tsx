'use client';

import type { ActivityDTO } from '../../../lib/api/types';
import {
  formatActivityDateSummary,
  getCategoryBadgeClass,
  formatReviewStatus,
  getReviewStatusClass,
} from '../utils/formatters';
import type { ReviewRequestDTO } from '../../../lib/api/types';

interface ActivityCardProps {
  activity: ActivityDTO;
  reviewRequest?: ReviewRequestDTO | null;
  onSelect: (activityId: string) => void;
}

export default function ActivityCard({ activity, reviewRequest, onSelect }: ActivityCardProps) {
  const headerStyle = activity.headerImageUrl
    ? { backgroundImage: `url(${activity.headerImageUrl})` }
    : undefined;

  const handleClick = () => onSelect(activity.id);

  const handleViewDetails = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onSelect(activity.id);
  };

  return (
    <article
      className="activity-card"
      data-category={activity.category}
      data-testid={`activity-card-${activity.id}`}
      onClick={handleClick}
    >
      {activity.headerImageUrl && <div className="activity-header-image" style={headerStyle} role="presentation" />}
      <div className="activity-card-content">
        <div className="activity-card-header">
          <h3 className="activity-title" data-testid="activity-title">
            {activity.title}
          </h3>
          <div className="activity-card-badges">
            <span
              className={`badge ${getCategoryBadgeClass(activity.category)}`}
              data-testid={`badge-${activity.category}-${activity.id}`}
            >
              {activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
            </span>
            {reviewRequest && (
              <span
                className={`badge review-status ${getReviewStatusClass(reviewRequest.status)}`}
                data-testid={`badge-review-${reviewRequest.status}-${activity.id}`}
              >
                {formatReviewStatus(reviewRequest.status)}
              </span>
            )}
          </div>
        </div>
        <span className="activity-date" data-testid={`text-date-${activity.id}`}>
          {formatActivityDateSummary(activity)}
        </span>
        {activity.description && (
          <p className="activity-description" data-testid={`text-description-${activity.id}`}>
            {activity.description}
          </p>
        )}
        <div className="activity-footer">
          <span className="activity-hours" data-testid={`text-hours-${activity.id}`}>
            {activity.hours} hours
          </span>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={handleViewDetails}
            data-testid={`button-view-details-${activity.id}`}
          >
            View Details
            <i className="fas fa-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
