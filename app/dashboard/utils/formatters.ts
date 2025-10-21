import type { ActivityDTO, ReviewRequestStatus } from '../../../lib/api/types';

const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short' };
const FULL_DATE_OPTIONS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
const DATE_FALLBACK_LABEL = 'Date TBD';

interface LearningOutcomePreset {
  value: string;
  code: string;
  label: string;
}

const LEARNING_OUTCOME_PRESETS: LearningOutcomePreset[] = [
  { value: 'LO1', code: 'LO1', label: 'Identify strengths and develop areas for growth' },
  { value: 'LO2', code: 'LO2', label: 'Demonstrate that challenges have been undertaken' },
  { value: 'LO3', code: 'LO3', label: 'Initiate and plan a CAS experience' },
  { value: 'LO4', code: 'LO4', label: 'Show commitment and perseverance' },
  { value: 'LO5', code: 'LO5', label: 'Demonstrate collaborative skills' },
  { value: 'LO6', code: 'LO6', label: 'Engage with issues of global significance' },
  { value: 'LO7', code: 'LO7', label: 'Recognise and consider the ethics of choices' },
];

function parseDateString(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', SHORT_DATE_OPTIONS);
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString('en-US', FULL_DATE_OPTIONS);
}

function formatDateRange(start: string | null, end: string | null, formatter: (date: Date) => string) {
  const startDate = parseDateString(start);
  const endDate = parseDateString(end);

  if (startDate && endDate) {
    const sameDay = startDate.toISOString().slice(0, 10) === endDate.toISOString().slice(0, 10);
    if (sameDay) {
      return formatter(startDate);
    }
    return `${formatter(startDate)} – ${formatter(endDate)}`;
  }

  if (startDate) {
    return formatter(startDate);
  }

  if (endDate) {
    return `Ends ${formatter(endDate)}`;
  }

  return DATE_FALLBACK_LABEL;
}

export function formatActivityDateSummary(activity: ActivityDTO) {
  return formatDateRange(activity.startDate, activity.endDate, formatShortDate);
}

export function formatActivityDateDetail(activity: ActivityDTO) {
  return formatDateRange(activity.startDate, activity.endDate, formatLongDate);
}

export function formatFullDate(value: string | null) {
  const parsed = parseDateString(value);
  if (!parsed) {
    return DATE_FALLBACK_LABEL;
  }
  return formatLongDate(parsed);
}

export function getCategoryBadgeClass(category: ActivityDTO['category']) {
  switch (category) {
    case 'creativity':
    case 'activity':
    case 'service':
      return category;
    default:
      return 'creativity';
  }
}

export function mapLearningOutcome(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { label: '', aria: '' };
  }
  const preset = LEARNING_OUTCOME_PRESETS.find((option) => option.value === trimmed);
  if (preset) {
    const label = `${preset.code} • ${preset.label}`;
    return { label, aria: `${preset.code}: ${preset.label}` };
  }
  return { label: trimmed, aria: trimmed };
}

export function formatReviewStatus(status: ReviewRequestStatus) {
  switch (status) {
    case 'pending':
      return 'Pending review';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Needs changes';
    default:
      return status;
  }
}

export function getReviewStatusClass(status: ReviewRequestStatus) {
  switch (status) {
    case 'approved':
      return 'status-approved';
    case 'rejected':
      return 'status-rejected';
    default:
      return 'status-pending';
  }
}
