export type ActivityCategory = 'creativity' | 'activity' | 'service';
export type ActivityStatus = 'draft' | 'pending' | 'completed';

export interface CustomizeLayout {
  order: string[];
  visibility: Record<string, boolean>;
}

export interface CustomizeTheme {
  primary?: string;
  secondary?: string;
  accent?: string;
  radius?: number;
  dark?: boolean;
}

export interface CustomizeContent {
  hero_title?: string;
  hero_subtitle?: string;
  hero_description?: string;
  hero_months?: number;
  hero_image_url?: string | null;
  hero_image_path?: string | null;
  hero_image_checksum?: string | null;
  hero_image_updated_at?: string | null;
  [key: string]: unknown;
}

export interface CustomizeSection {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface CustomizeSettings {
  layout: CustomizeLayout | null;
  theme: CustomizeTheme | null;
  content: CustomizeContent | null;
  customSections: CustomizeSection[];
}

export interface HeroImageDescriptor {
  url: string | null;
  path: string | null;
  checksum: string | null;
  updatedAt: string | null;
  source: 'storage' | 'external' | 'legacy' | null;
  width?: number | null;
  height?: number | null;
  mimeType?: string | null;
}

export interface ActivityAssetDTO {
  id: string;
  activityId: string;
  url: string;
  path: string;
  mimeType: string;
  checksum: string | null;
  size: number | null;
  createdAt: string;
  signedUrlExpiresAt?: string | null;
}

export interface ActivityDTO {
  id: string;
  studentId: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  status: ActivityStatus;
  startDate: string | null;
  endDate: string | null;
  hours: number;
  learningOutcomes: string[];
  headerImageUrl: string | null;
  headerImagePath: string | null;
  headerImageChecksum: string | null;
  createdAt: string;
  updatedAt: string;
  assets: ActivityAssetDTO[];
}

export interface ActivityMutationPayload {
  id?: string;
  title: string;
  description?: string | null;
  category: ActivityCategory;
  status: ActivityStatus;
  startDate?: string | null;
  endDate?: string | null;
  hours?: number;
  learningOutcomes?: string[];
  headerImageUrl?: string | null;
}

export interface MutationResult<T> {
  data: T;
  revalidated?: string[];
}

export interface ApiErrorShape {
  error: string;
  details?: string;
  code?: string;
}
