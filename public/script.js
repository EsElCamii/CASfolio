// moved to Next public; Sample data for the CAS portfolio
const sampleData = {
    activities: [
        {
            id: '1',
            title: 'Digital Art Exhibition',
            description: 'Organized and curated a digital art exhibition showcasing student work from our school community.',
            category: 'creativity',
            startDate: '2024-10-01',
            endDate: '2024-11-15',
            hours: 15,
            header_image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
            learningOutcomes: ['Creative Thinking', 'Project Management', 'Communication'],
            status: 'completed',
            createdAt: '2024-10-01T00:00:00.000Z'
        },
        {
            id: '2',
            title: 'Charity Marathon',
            description: 'Participated in a 10K charity run to raise funds for local environmental conservation efforts.',
            category: 'activity',
            startDate: '2024-09-15',
            endDate: '2024-10-20',
            hours: 20,
            header_image_url: 'https://images.unsplash.com/photo-1594737625785-c66858ac7c95?auto=format&fit=crop&w=1200&q=80',
            learningOutcomes: ['Physical Endurance', 'Teamwork', 'Community Engagement'],
            status: 'draft',
            createdAt: '2024-09-15T00:00:00.000Z'
        },
        {
            id: '3',
            title: 'Community Garden Project',
            description: 'Established and maintained a community garden to provide fresh produce for the local food bank.',
            category: 'service',
            startDate: '2024-08-01',
            endDate: null,
            hours: 25,
            header_image_url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
            learningOutcomes: ['Environmental Awareness', 'Community Service', 'Leadership'],
            status: 'draft',
            createdAt: '2024-08-01T00:00:00.000Z'
        }
    ],
    reflections: [
        {
            id: 'r1',
            activityId: '1',
            title: 'Leadership Through Art',
            content: "Organizing the digital art exhibition taught me that leadership isn't just about directing others, but about creating space for everyone's creativity to flourish.",
            createdAt: '2024-11-15T00:00:00.000Z'
        },
        {
            id: 'r2',
            activityId: '2',
            title: 'Physical Challenge and Community Impact',
            content: 'The charity marathon was more than just a physical challenge. It showed me how individual effort can contribute to larger community goals.',
            createdAt: '2024-10-20T00:00:00.000Z'
        }
    ]
};

const TOTAL_REQUIRED_HOURS = 240;
const CATEGORY_TARGET_HOURS = 80;
const MIN_DISPLAY_MONTHS = 1;
const MAX_VALID_MONTHS = 240;

const API_ENDPOINTS = {
    SETTINGS: '/api/profile/settings',
    ACTIVITIES: '/api/activities',
    REFLECTIONS: '/api/reflections',
    HERO_IMAGE: '/api/hero-image'
};

const CACHE_KEYS = {
    ACTIVITIES: 'casfolio_cache_activities_v2',
    REFLECTIONS: 'casfolio_cache_reflections_v2'
};

const LEGACY_STORAGE_KEYS = {
    ACTIVITIES: 'casfolio_activities',
    REFLECTIONS: 'casfolio_reflections'
};

const LEGACY_CUSTOMIZE_KEYS = {
    LAYOUT: 'casfolio_layout',
    THEME: 'casfolio_theme',
    CONTENT: 'casfolio_content',
    CUSTOM_SECTIONS: 'casfolio_custom_sections'
};

const LEGACY_MIGRATION_FLAG = 'casfolio_migration_completed_v2';
const LEGACY_MIGRATION_NOTES_KEY = 'casfolio_migration_notes';

const PORTFOLIO_ONBOARDING_KEY = 'casfolio_portfolio_onboarding';

let currentActivities = [];
let currentReflections = [];
let isOfflineMode = false;
let isAuthenticated = false;

function readCache(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch (error) {
        console.warn('Unable to read cache for', key, error);
        return fallback;
    }
}

function isValidHttpsUrl(value) {
    if (typeof value !== 'string' || value.trim() === '') {
        return false;
    }
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function escapeHtml(value) {
    if (typeof value !== 'string') {
        return '';
    }
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return encodeURI(value);
}

const IMAGE_PLACEHOLDER = '/hero-default.svg';

function renderImageTag(url, alt, className) {
    const safeAlt = escapeHtml(alt || 'Activity image');
    if (isValidHttpsUrl(url)) {
        const safeUrl = escapeAttribute(url);
        return `<img class="${className}" src="${safeUrl}" alt="${safeAlt}" loading="lazy" data-fallback="${IMAGE_PLACEHOLDER}">`;
    }
    return `<img class="${className} is-placeholder" src="${IMAGE_PLACEHOLDER}" alt="${safeAlt}" loading="lazy">`;
}

function attachImageFallbacks(container = document) {
    container.querySelectorAll('img[data-fallback]').forEach((img) => {
        if (img.dataset.placeholderBound === '1') {
            return;
        }
        img.dataset.placeholderBound = '1';
        img.addEventListener('error', () => {
            const fallback = img.dataset.fallback || IMAGE_PLACEHOLDER;
            if (img.dataset.usingFallback === '1') {
                return;
            }
            img.dataset.usingFallback = '1';
            img.classList.add('is-placeholder');
            img.src = fallback;
        });
        img.addEventListener('load', () => {
            const fallback = img.dataset.fallback || IMAGE_PLACEHOLDER;
            const current = img.currentSrc || img.src || '';
            if (img.dataset.usingFallback === '1') {
                if (!current.endsWith(fallback)) {
                    img.dataset.usingFallback = '0';
                    img.classList.remove('is-placeholder');
                }
            } else {
                img.classList.remove('is-placeholder');
            }
        });
    });
}

function normalizeActivity(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const headerImageRaw =
        typeof raw.header_image_url === 'string' ? raw.header_image_url :
        typeof raw.headerImageUrl === 'string' ? raw.headerImageUrl :
        typeof raw.headerImage === 'string' ? raw.headerImage :
        '';
    const headerImageCandidate = typeof headerImageRaw === 'string' ? headerImageRaw.trim() : '';
    const normalizedHeaderUrl = isValidHttpsUrl(headerImageCandidate) ? headerImageCandidate : '';

    const learningOutcomes = Array.isArray(raw.learningOutcomes)
        ? raw.learningOutcomes
        : Array.isArray(raw.learning_outcomes)
            ? raw.learning_outcomes
            : [];

    const galleryImageUrls = Array.isArray(raw.galleryImageUrls)
        ? raw.galleryImageUrls
        : Array.isArray(raw.gallery_image_urls)
            ? raw.gallery_image_urls
            : [];

    const evidenceUrls = Array.isArray(raw.evidenceUrls)
        ? raw.evidenceUrls
        : Array.isArray(raw.evidence_urls)
            ? raw.evidence_urls
            : [];

    const impacts = Array.isArray(raw.impacts) ? raw.impacts : [];

    const activity = {
        id: String(raw.id ?? cryptoRandomId()),
        title: typeof raw.title === 'string' ? raw.title : '',
        description: typeof raw.description === 'string' ? raw.description : '',
        category: typeof raw.category === 'string' ? raw.category : '',
        startDate: typeof raw.startDate === 'string' ? raw.startDate : (typeof raw.start_date === 'string' ? raw.start_date : null),
        endDate: typeof raw.endDate === 'string' ? raw.endDate : (typeof raw.end_date === 'string' ? raw.end_date : null),
        hours: Number.isFinite(Number(raw.hours)) ? Number(raw.hours) : 0,
        status: typeof raw.status === 'string' ? raw.status : 'draft',
        learningOutcomes,
        galleryImageUrls,
        evidenceUrls,
        impacts,
        header_image_url: normalizedHeaderUrl,
        headerImageUrl: normalizedHeaderUrl,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : (typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString())
    };

    return activity;
}

function normalizeReflection(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    return {
        id: String(raw.id ?? cryptoRandomId()),
        activityId:
            typeof raw.activityId === 'string'
                ? raw.activityId
                : typeof raw.activity_id === 'string'
                    ? raw.activity_id
                    : '',
        title: typeof raw.title === 'string' ? raw.title : '',
        content: typeof raw.content === 'string' ? raw.content : '',
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : (typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString()),
    };
}

function cryptoRandomId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2, 11);
}

async function fetchJsonWithStatus(url, options = {}) {
    try {
        const response = await fetch(url, { credentials: 'same-origin', ...options });
        const contentType = response.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
            data = await response.json();
        }
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        return { ok: false, status: 0, error };
    }
}

async function loadActivities() {
    const cached = readCache(CACHE_KEYS.ACTIVITIES, []);
    const result = await fetchJsonWithStatus(API_ENDPOINTS.ACTIVITIES);

    if (result.status === 401) {
        isAuthenticated = false;
        isOfflineMode = false;
        currentActivities = cached.length ? cached : sampleData.activities.map(normalizeActivity).filter(Boolean);
        return;
    }

    if (result.ok && result.data && Array.isArray(result.data.activities)) {
        const mapped = result.data.activities.map(normalizeActivity).filter(Boolean);
        currentActivities = mapped;
        writeCache(CACHE_KEYS.ACTIVITIES, mapped);
        isAuthenticated = true;
        isOfflineMode = false;
        return;
    }

    console.warn('Falling back to cached activities', result.error);
    isOfflineMode = true;
    currentActivities = cached.length ? cached : sampleData.activities.map(normalizeActivity).filter(Boolean);
}

async function loadReflections() {
    const cached = readCache(CACHE_KEYS.REFLECTIONS, []);
    const result = await fetchJsonWithStatus(API_ENDPOINTS.REFLECTIONS);

    if (result.status === 401) {
        isAuthenticated = false;
        currentReflections = cached.length ? cached : sampleData.reflections.map(normalizeReflection).filter(Boolean);
        return;
    }

    if (result.ok && result.data && Array.isArray(result.data.reflections)) {
        const mapped = result.data.reflections.map(normalizeReflection).filter(Boolean);
        currentReflections = mapped;
        writeCache(CACHE_KEYS.REFLECTIONS, mapped);
        isAuthenticated = true;
        return;
    }

    console.warn('Falling back to cached reflections', result.error);
    currentReflections = cached.length ? cached : sampleData.reflections.map(normalizeReflection).filter(Boolean);
}

async function bootstrapData() {
    await Promise.all([loadActivities(), loadReflections()]);
}

async function apiCreateActivity(payload) {
    const result = await fetchJsonWithStatus(API_ENDPOINTS.ACTIVITIES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (result.status === 401) {
        throw new Error('Please sign in to create activities.');
    }

    if (!result.ok || !result.data || !result.data.activity) {
        const message = (result.data && result.data.error) || 'Unable to create activity.';
        throw new Error(message);
    }

    return normalizeActivity(result.data.activity);
}

async function apiUpdateActivity(activityId, payload) {
    const result = await fetchJsonWithStatus(`${API_ENDPOINTS.ACTIVITIES}/${activityId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (result.status === 401) {
        throw new Error('Please sign in to update activities.');
    }

    if (result.status === 404) {
        throw new Error('Activity not found.');
    }

    if (!result.ok || !result.data || !result.data.activity) {
        const message = (result.data && result.data.error) || 'Unable to update activity.';
        throw new Error(message);
    }

    return normalizeActivity(result.data.activity);
}

async function apiDeleteActivity(activityId) {
    const result = await fetchJsonWithStatus(`${API_ENDPOINTS.ACTIVITIES}/${activityId}`, {
        method: 'DELETE',
    });

    if (result.status === 401) {
        throw new Error('Please sign in to delete activities.');
    }

    if (!result.ok && result.status !== 204) {
        const message = (result.data && result.data.error) || 'Unable to delete activity.';
        throw new Error(message);
    }
}

async function apiCreateReflection(payload) {
    const result = await fetchJsonWithStatus(API_ENDPOINTS.REFLECTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (result.status === 401) {
        throw new Error('Please sign in to create reflections.');
    }

    if (!result.ok || !result.data || !result.data.reflection) {
        const message = (result.data && result.data.error) || 'Unable to create reflection.';
        throw new Error(message);
    }

    return normalizeReflection(result.data.reflection);
}

function writeCache(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('Unable to persist cache for', key, error);
    }
}

function readLegacyArray(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Unable to read legacy data for', key, error);
        return [];
    }
}

function readLegacyObject(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return fallback;
        }
        return parsed;
    } catch (error) {
        console.warn('Unable to parse legacy object for', key, error);
        return fallback;
    }
}

// Snapshot the current DOM values so the onboarding form can fall back to what is already rendered
function getPortfolioOnboardingDefaults() {
    const defaults = {};
    const studentName = document.querySelector('[data-testid="text-student-name"]');
    const studentRole = document.querySelector('[data-testid="text-student-role"]');
    const studentSchool = document.querySelector('[data-testid="text-student-school"]');
    const graduationClass = document.querySelector('[data-testid="text-graduation-class"]');
    const studentEmail = document.querySelector('[data-testid="text-student-email"]');
    const casPeriod = document.querySelector('[data-testid="text-cas-period"]');
    const casSummary = document.querySelector('[data-testid="text-cas-summary"]');
    const status = document.querySelector('[data-testid="text-portfolio-verified"]');
    const lastReview = document.querySelector('[data-testid="text-last-review"]');
    const notes = document.querySelector('[data-testid="text-supervisor-comment"]');
    const coordinatorCard = document.getElementById('coordinator-card');
    const supervisorName = document.querySelector('[data-testid="text-supervisor-name"]');
    const supervisorRole = document.querySelector('[data-testid="text-supervisor-role"]');
    const supervisorEmail = document.querySelector('[data-testid="text-supervisor-email"]');
    const supervisorPhone = document.querySelector('[data-testid="text-supervisor-phone"]');

    defaults.student_name = studentName ? studentName.textContent.trim() : '';
    defaults.student_role = studentRole ? studentRole.textContent.trim() : '';
    defaults.student_school = studentSchool ? studentSchool.textContent.trim() : '';
    defaults.graduation_class = graduationClass ? graduationClass.textContent.trim() : '';
    defaults.student_email = studentEmail ? studentEmail.textContent.trim() : '';
    defaults.cas_period = casPeriod ? casPeriod.textContent.replace(/^CAS\s+Period:\s*/i, '').trim() : '';
    defaults.cas_summary = casSummary ? casSummary.textContent.trim() : '';

    const statusText = status ? status.textContent.trim() : '';
    defaults.portfolio_status = mapStatusTextToValue(statusText);

    if (lastReview) {
        const lastReviewText = lastReview.textContent.replace(/^Last reviewed:\s*/i, '').trim();
        const parsedDate = lastReviewText ? new Date(lastReviewText) : null;
        defaults.last_reviewed = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString().split('T')[0] : '';
    } else {
        defaults.last_reviewed = '';
    }

    defaults.verification_notes = notes ? notes.textContent.trim() : '';

    defaults.include_coordinator = coordinatorCard ? !coordinatorCard.hidden : false;
    defaults.coordinator_name = supervisorName ? supervisorName.textContent.trim() : '';
    defaults.coordinator_role = supervisorRole ? supervisorRole.textContent.trim() : '';
    defaults.coordinator_email = supervisorEmail ? supervisorEmail.textContent.trim() : '';
    defaults.coordinator_phone = supervisorPhone ? supervisorPhone.textContent.trim() : '';

    return defaults;
}

// Convert the portfolio card status text into the select option value used by the questionnaire
function mapStatusTextToValue(text) {
    const normalized = (text || '').toLowerCase();
    if (normalized.includes('verified')) return 'verified';
    if (normalized.includes('pending')) return 'pending';
    if (normalized.includes('progress')) return 'in-progress';
    return '';
}

// Convert stored select values back to the friendly labels rendered on the portfolio card
function mapStatusValueToText(value) {
    switch (value) {
        case 'pending':
            return 'Portfolio Pending Review';
        case 'in-progress':
            return 'Portfolio In Progress';
        case 'verified':
            return 'Portfolio Verified';
        default:
            return 'Portfolio Status';
    }
}

// Load the saved questionnaire state, layering it on top of the current DOM defaults if necessary
function getPortfolioOnboardingState() {
    const defaults = getPortfolioOnboardingDefaults();
    try {
        const stored = localStorage.getItem(PORTFOLIO_ONBOARDING_KEY);
        if (!stored) {
            return { completed: false, data: defaults };
        }
        const parsed = JSON.parse(stored);
        return {
            completed: Boolean(parsed && parsed.completed),
            data: parsed && parsed.data ? Object.assign({}, defaults, parsed.data) : defaults
        };
    } catch (error) {
        console.warn('Failed to parse onboarding state, resetting.', error);
        return { completed: false, data: defaults };
    }
}

// Persist the questionnaire draft/completion flag so it survives reloads
function savePortfolioOnboardingState(state) {
    try {
        localStorage.setItem(PORTFOLIO_ONBOARDING_KEY, JSON.stringify(state));
    } catch (error) {
        console.error('Error saving portfolio onboarding state:', error);
    }
}

// Reflect questionnaire answers onto the live portfolio card elements
function applyPortfolioInformation(data) {
    const defaults = getPortfolioOnboardingDefaults();

    function setText(selector, value, fallback) {
        const el = document.querySelector(selector);
        if (!el) return;
        const text = value && value.trim() !== '' ? value.trim() : fallback;
        if (typeof text === 'string') {
            el.textContent = text;
        }
    }

    setText('[data-testid="text-student-name"]', data.student_name, defaults.student_name);
    setText('[data-testid="text-student-role"]', data.student_role, defaults.student_role);
    setText('[data-testid="text-student-school"]', data.student_school, defaults.student_school);
    setText('[data-testid="text-graduation-class"]', data.graduation_class, defaults.graduation_class);
    setText('[data-testid="text-student-email"]', data.student_email, defaults.student_email);

    const casPeriodValue = data.cas_period && data.cas_period.trim() !== '' ? `CAS Period: ${data.cas_period.trim()}` : `CAS Period: ${defaults.cas_period}`;
    setText('[data-testid="text-cas-period"]', casPeriodValue, `CAS Period: ${defaults.cas_period}`);
    setText('[data-testid="text-cas-summary"]', data.cas_summary, defaults.cas_summary);

    const statusText = mapStatusValueToText(data.portfolio_status);
    setText('[data-testid="text-portfolio-verified"]', statusText, mapStatusValueToText(defaults.portfolio_status));

    const reviewEl = document.querySelector('[data-testid="text-last-review"]');
    if (reviewEl) {
        const rawDate = data.last_reviewed && data.last_reviewed.trim() !== '' ? data.last_reviewed : defaults.last_reviewed;
        if (rawDate) {
            const formatted = formatFullDate(rawDate);
            reviewEl.textContent = `Last reviewed: ${formatted}`;
        } else {
            reviewEl.textContent = defaults.last_reviewed ? `Last reviewed: ${formatFullDate(defaults.last_reviewed)}` : 'Last reviewed: —';
        }
    }

    setText('[data-testid="text-supervisor-comment"]', data.verification_notes, defaults.verification_notes);

    const coordinatorCard = document.getElementById('coordinator-card');
    const includeCoordinator = Boolean(data.include_coordinator);
    if (coordinatorCard) {
        const shouldHide = !includeCoordinator && !data.coordinator_name && !data.coordinator_email && !data.coordinator_phone;
        coordinatorCard.hidden = shouldHide;
        coordinatorCard.setAttribute('aria-hidden', shouldHide ? 'true' : 'false');
    }

    if (includeCoordinator) {
        setText('[data-testid="text-supervisor-name"]', data.coordinator_name, defaults.coordinator_name);
        setText('[data-testid="text-supervisor-role"]', data.coordinator_role, defaults.coordinator_role);
        setText('[data-testid="text-supervisor-email"]', data.coordinator_email, defaults.coordinator_email);
        setText('[data-testid="text-supervisor-phone"]', data.coordinator_phone, defaults.coordinator_phone);
    } else if (coordinatorCard) {
        // When hidden, clear aria-hidden line above ensures screen readers skip it
        setText('[data-testid="text-supervisor-name"]', data.coordinator_name || defaults.coordinator_name, defaults.coordinator_name);
        setText('[data-testid="text-supervisor-role"]', data.coordinator_role || defaults.coordinator_role, defaults.coordinator_role);
        setText('[data-testid="text-supervisor-email"]', data.coordinator_email || defaults.coordinator_email, defaults.coordinator_email);
        setText('[data-testid="text-supervisor-phone"]', data.coordinator_phone || defaults.coordinator_phone, defaults.coordinator_phone);
    }
}

// Global state
let currentFilter = 'all';
let learningOutcomes = [];

function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
}

function unlockBodyScroll() {
    if (!document.querySelector('.modal.show')) {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }
}

function updateSelectControlVisualState(select) {
    if (!select) return;
    const value = typeof select.value === 'string' ? select.value.trim() : '';
    select.dataset.value = value === '' ? 'empty' : value;
}

function enhanceSelectControl(select) {
    if (!select) return;
    if (select.dataset.selectEnhanced === '1') {
        updateSelectControlVisualState(select);
        return;
    }
    select.dataset.selectEnhanced = '1';
    updateSelectControlVisualState(select);
    select.addEventListener('change', () => updateSelectControlVisualState(select));
    select.addEventListener('input', () => updateSelectControlVisualState(select));
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
    });
}

function formatFullDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getCategoryColor(category) {
    switch (category) {
        case 'creativity': return 'creativity';
        case 'activity': return 'activity';
        case 'service': return 'service';
        default: return 'creativity';
    }
}

function getCategoryImage(category) {
    switch (category) {
        case 'creativity': return 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400';
        case 'activity': return 'https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400';
        case 'service': return 'https://images.unsplash.com/photo-1593113598332-cd288d649433?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400';
        default: return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400';
    }
}

function getStatusClass(status) {
    switch ((status || '').toLowerCase()) {
        case 'completed':
            return 'completed';
        case 'pending':
            return 'pending';
        default:
            return 'draft';
    }
}

function getStatusLabel(status) {
    switch ((status || '').toLowerCase()) {
        case 'completed':
            return 'Completed';
        case 'pending':
            return 'Pending Review';
        default:
            return 'Draft';
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Derived statistics shown in the hero counters and progress dashboard
function calculateStats() {
    const totalActivities = currentActivities.length;
    const totalHours = currentActivities.reduce((sum, activity) => sum + activity.hours, 0);
    const totalReflections = currentReflections.length;
    
    const categoryStats = {
        creativity: {
            count: currentActivities.filter(a => a.category === 'creativity').length,
            hours: currentActivities.filter(a => a.category === 'creativity').reduce((sum, a) => sum + a.hours, 0)
        },
        activity: {
            count: currentActivities.filter(a => a.category === 'activity').length,
            hours: currentActivities.filter(a => a.category === 'activity').reduce((sum, a) => sum + a.hours, 0)
        },
        service: {
            count: currentActivities.filter(a => a.category === 'service').length,
            hours: currentActivities.filter(a => a.category === 'service').reduce((sum, a) => sum + a.hours, 0)
        }
    };
    
    return {
        totalActivities,
        totalHours,
        totalReflections,
        categoryStats
    };
}

// Smooth scrolling helpers used by the navigation buttons
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Close mobile menu if open
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu.classList.contains('show')) {
        toggleMobileMenu();
    }
}

function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const icon = document.getElementById('mobile-menu-icon');
    
    mobileMenu.classList.toggle('show');
    
    if (mobileMenu.classList.contains('show')) {
        icon.className = 'fas fa-times';
    } else {
        icon.className = 'fas fa-bars';
    }
}

// Quick actions wired to CTA buttons in the hero and gallery
function handleDownload() {
    window.print();
}

function handleShare() {
    if (navigator.share) {
        navigator.share({
            title: 'IB CAS Portfolio',
            text: 'Check out my IB CAS portfolio showcasing my journey through Creativity, Activity, and Service.',
            url: window.location.href,
        });
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// Render functions
function renderHeroStats() {
    const stats = calculateStats();
    document.getElementById('total-activities').textContent = stats.totalActivities + '+';
    document.getElementById('total-hours').textContent = stats.totalHours + '+';
    const monthsEl = document.getElementById('total-months');
    if (monthsEl) {
        const months = calculateDurationMonths();
        let safeMonths = MIN_DISPLAY_MONTHS;
        if (Number.isFinite(months) && months >= MIN_DISPLAY_MONTHS && months <= MAX_VALID_MONTHS) {
            safeMonths = months;
        }
        monthsEl.textContent = safeMonths + '+';
    }
}

// Approximate duration in months based on activities (earliest start → latest end or today)
function calculateDurationMonths() {
    if (currentActivities.length === 0) return 0;
    const starts = currentActivities.map(a => new Date(a.startDate)).filter(d => !isNaN(d));
    const ends = currentActivities.map(a => a.endDate ? new Date(a.endDate) : new Date()).filter(d => !isNaN(d));
    if (starts.length === 0 || ends.length === 0) return 0;
    const minStart = new Date(Math.min.apply(null, starts));
    const maxEnd = new Date(Math.max.apply(null, ends));
    const years = maxEnd.getFullYear() - minStart.getFullYear();
    const months = maxEnd.getMonth() - minStart.getMonth();
    const total = years * 12 + months + (maxEnd.getDate() >= minStart.getDate() ? 0 : -1);
    return Math.max(0, total + 1); // inclusive month rounding
}

function renderCategoriesGrid() {
    const stats = calculateStats();
    const container = document.getElementById('categories-grid');
    
    const categories = [
        {
            id: 'creativity',
            title: 'Creativity',
            description: 'Exploring artistic expression, design thinking, and innovative problem-solving through various creative mediums.',
            icon: 'fas fa-palette',
            stats: stats.categoryStats.creativity,
            progress: Math.min(100, (stats.categoryStats.creativity.hours / CATEGORY_TARGET_HOURS) * 100),
        },
        {
            id: 'activity',
            title: 'Activity',
            description: 'Physical challenges and team sports that promote health, teamwork, and personal endurance.',
            icon: 'fas fa-users',
            stats: stats.categoryStats.activity,
            progress: Math.min(100, (stats.categoryStats.activity.hours / CATEGORY_TARGET_HOURS) * 100),
        },
        {
            id: 'service',
            title: 'Service',
            description: 'Community engagement and volunteer work focused on making a positive impact in society.',
            icon: 'fas fa-heart',
            stats: stats.categoryStats.service,
            progress: Math.min(100, (stats.categoryStats.service.hours / CATEGORY_TARGET_HOURS) * 100),
        },
    ];
    
    container.innerHTML = categories.map(category => `
        <div class="category-card" onclick="scrollToSection('${category.id}')" data-testid="card-${category.id}">
            <div class="category-header">
                <div class="category-icon ${category.id}">
                    <i class="${category.icon}"></i>
                </div>
                <h3 class="category-title" data-testid="text-${category.id}-title">${category.title}</h3>
            </div>
            <p class="category-description" data-testid="text-${category.id}-description">${category.description}</p>
            <div class="category-stats">
                <span>Activities</span>
                <span data-testid="text-${category.id}-count">${category.stats.count}</span>
            </div>
            <div class="category-stats">
                <span>Total Hours</span>
                <span data-testid="text-${category.id}-hours">${category.stats.hours}</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill ${category.id}" 
                     style="width: ${category.progress}%" 
                     data-testid="progress-${category.id}"></div>
            </div>
        </div>
    `).join('');
}

function renderActivitiesGrid() {
    const container = document.getElementById('activities-grid');
    const emptyState = document.getElementById('activities-empty');
    const recentActivities = currentActivities.slice(0, 3);
    
    if (recentActivities.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    emptyState.style.display = 'none';
    
    container.innerHTML = recentActivities.map(activity => renderActivityCard(activity)).join('');
    attachImageFallbacks(container);
}

function renderActivityCard(activity) {
    const statusClass = getStatusClass(activity.status);
    const headerImage = renderImageTag(activity.header_image_url, activity.title, 'activity-header-image');
        
    return `
        <div class="activity-card" data-category="${activity.category}" data-testid="activity-card-${activity.id}" onclick="viewActivityDetail('${activity.id}')">
            ${headerImage}
            <div class="activity-card-content">
                <div class="activity-card-header">
                    <h3 class="activity-title" data-testid="activity-title">${activity.title}</h3>
                    <span class="badge ${getCategoryColor(activity.category)}" data-testid="badge-${activity.category}-${activity.id}">
                        ${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                    </span>
                    <span class="activity-date" data-testid="text-date-${activity.id}">${formatDate(activity.startDate)}</span>
                </div>
                <p class="activity-description" data-testid="text-description-${activity.id}">${activity.description}</p>
                <div class="activity-footer">
                    <span class="activity-hours" data-testid="text-hours-${activity.id}">${activity.hours} hours</span>
                    <span class="activity-status ${statusClass}" data-testid="text-status-${activity.id}">${getStatusLabel(activity.status)}</span>
                    <button class="btn btn-ghost" onclick="event.stopPropagation();" data-testid="button-view-details-${activity.id}">
                        View Details 
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderTimeline() {
    const container = document.getElementById('timeline-list');
    const emptyState = document.getElementById('timeline-empty');
    const timelineActivities = currentActivities.slice(0, 3);
    
    if (timelineActivities.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'block';
    emptyState.style.display = 'none';
    
    container.innerHTML = timelineActivities.map(activity => `
        <div class="timeline-item" data-testid="timeline-item-${activity.id}">
            <div class="timeline-content">
                <div class="timeline-header">
                    <h3 class="timeline-title" data-testid="text-timeline-title-${activity.id}">${activity.title}</h3>
                    <span class="activity-date" data-testid="text-timeline-date-${activity.id}">${formatDate(activity.startDate)}</span>
                </div>
                <div class="timeline-meta">
                    <span class="badge ${getCategoryColor(activity.category)}" data-testid="badge-timeline-${activity.category}-${activity.id}">
                        ${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                    </span>
                    <span class="activity-hours" data-testid="text-timeline-hours-${activity.id}">${activity.hours} hours</span>
                </div>
                <p class="timeline-description" data-testid="text-timeline-description-${activity.id}">${activity.description}</p>
                <button class="btn btn-ghost" onclick="viewActivityDetail('${activity.id}')" data-testid="button-timeline-view-${activity.id}">
                    View Details
                </button>
            </div>
        </div>
    `).join('');
}

function renderProgressDashboard() {
    const stats = calculateStats();
    
    // Update total hours display
    document.getElementById('progress-total-hours').textContent = `Total: ${stats.totalHours}/${TOTAL_REQUIRED_HOURS} hours`;
    
    // Update progress message
    const progressMessage = document.getElementById('progress-message');
    if (stats.totalHours >= TOTAL_REQUIRED_HOURS) {
        progressMessage.textContent = "You've exceeded the minimum requirement! Great work!";
    } else {
        const remaining = TOTAL_REQUIRED_HOURS - stats.totalHours;
        progressMessage.textContent = `${remaining} hours remaining to reach minimum requirement`;
    }
    
    // Render progress categories
    const progressContainer = document.getElementById('progress-categories');
    const categories = [
        { name: 'Creativity', current: stats.categoryStats.creativity.hours, target: CATEGORY_TARGET_HOURS, color: 'creativity' },
        { name: 'Activity', current: stats.categoryStats.activity.hours, target: CATEGORY_TARGET_HOURS, color: 'activity' },
        { name: 'Service', current: stats.categoryStats.service.hours, target: CATEGORY_TARGET_HOURS, color: 'service' }
    ];
    
    progressContainer.innerHTML = categories.map(category => {
        const percentage = Math.min(100, (category.current / category.target) * 100);
        return `
            <div class="progress-category" data-testid="progress-category-${category.name.toLowerCase()}">
                <div class="progress-label">
                    <span class="progress-label-name" data-testid="text-${category.name.toLowerCase()}-label">${category.name}</span>
                    <span class="progress-label-value" data-testid="text-${category.name.toLowerCase()}-hours">${category.current}/${category.target} hours</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${category.color}" 
                         style="width: ${percentage}%" 
                         data-testid="progress-bar-${category.name.toLowerCase()}"></div>
                </div>
            </div>
        `;
    }).join('');
    
    // Render achievements
    const achievementsContainer = document.getElementById('achievements-list');
    const achievements = [
        {
            icon: 'fas fa-star',
            title: "Hours Champion",
            description: "Exceeded all category requirements",
            iconClass: "star"
        },
        {
            icon: 'fas fa-users',
            title: "Community Leader", 
            description: "Led 3+ group activities",
            iconClass: "users"
        },
        {
            icon: 'fas fa-medal',
            title: "Reflection Master",
            description: `${stats.totalReflections}+ detailed reflections`,
            iconClass: "medal"
        }
    ];
    
    achievementsContainer.innerHTML = achievements.map((achievement, index) => `
        <div class="achievement-item" data-testid="achievement-${index}">
            <div class="achievement-icon ${achievement.iconClass}">
                <i class="${achievement.icon}"></i>
            </div>
            <div class="achievement-text">
                <p data-testid="text-achievement-title-${index}">${achievement.title}</p>
                <span data-testid="text-achievement-description-${index}">${achievement.description}</span>
            </div>
        </div>
    `).join('');
}

function renderGallery() {
    const container = document.getElementById('gallery-grid');
    const emptyState = document.getElementById('gallery-empty');
    
    const filteredActivities = currentFilter === 'all' 
        ? currentActivities 
        : currentActivities.filter(activity => activity.category === currentFilter);
    
    if (filteredActivities.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    container.style.display = 'grid';
    emptyState.style.display = 'none';
    
    container.innerHTML = filteredActivities.map(activity => {
        const headerImage = renderImageTag(activity.header_image_url, activity.title, 'activity-image');
        const statusClass = getStatusClass(activity.status);
            
        return `
        <div class="gallery-card" data-testid="gallery-item-${activity.id}">
            <div class="gallery-card-clickable" onclick="viewActivityDetail('${activity.id}')">
                ${headerImage}
                <div class="gallery-content">
                    <div class="gallery-header">
                        <span class="badge ${getCategoryColor(activity.category)}" data-testid="badge-gallery-${activity.category}-${activity.id}">
                            ${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                        </span>
                        <span class="gallery-date" data-testid="text-gallery-date-${activity.id}">${formatDate(activity.startDate)}</span>
                    </div>
                    <h4 class="gallery-title" data-testid="text-gallery-title-${activity.id}">${activity.title}</h4>
                    <p class="gallery-description" data-testid="text-gallery-desc-${activity.id}">${activity.description.substring(0, 80)}${activity.description.length > 80 ? '...' : ''}</p>
                    <div class="gallery-footer">
                        <span class="gallery-hours" data-testid="text-gallery-hours-${activity.id}">${activity.hours} hours</span>
                        <span class="gallery-status ${statusClass}" data-testid="badge-status-${activity.status}-${activity.id}">${getStatusLabel(activity.status)}</span>
                    </div>
                </div>
            </div>
            <div class="gallery-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); closeActivityDetail(); openAddActivityDialog('${activity.id}')" data-testid="button-edit-activity-${activity.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>`;
    }).join('');
    attachImageFallbacks(container);
}

// Filter functions
function filterGallery(filter) {
    currentFilter = filter;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-testid="filter-${filter}"]`).classList.add('active');
    
    renderGallery();
}

// Modal functions
let currentActivityId = null;

function openAddActivityDialog(activityId = null) {
    const modal = document.getElementById('add-activity-modal');
    const form = document.getElementById('add-activity-form');
    const title = document.querySelector('#add-activity-modal h3');
    const submitBtn = document.querySelector('#add-activity-form button[type="submit"]');
    const categorySelect = form ? form.elements['category'] : null;
    const statusSelect = form ? form.elements['status'] : null;

    if (!modal || !form || !title || !submitBtn) return;
    
    // Close any open modals first
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    
    if (activityId) {
        // Edit mode
        currentActivityId = activityId;
        const activity = currentActivities.find(a => a.id === activityId);
        if (activity) {
            form.elements['title'].value = activity.title || '';
            form.elements['category'].value = activity.category || '';
            form.elements['description'].value = activity.description || '';
            form.elements['startDate'].value = activity.startDate || '';
            form.elements['endDate'].value = activity.endDate || '';
            form.elements['hours'].value = activity.hours || '';
            form.elements['status'].value = activity.status || 'draft';

            learningOutcomes = Array.isArray(activity.learningOutcomes)
                ? [...activity.learningOutcomes]
                : [];
            renderLearningOutcomes();

            const imageUrlInput = document.getElementById('header-image-url');
            if (imageUrlInput) {
                const url = activity.header_image_url || '';
                imageUrlInput.value = url;
                showActivityImagePreview(url);
            }

            title.textContent = 'Edit Activity';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Activity';
        }
    } else {
        currentActivityId = null;
        form.reset();
        learningOutcomes = [];
        renderLearningOutcomes();
        clearActivityImagePreview(true);
        title.textContent = 'Add New Activity';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Activity';
    }

    enhanceSelectControl(categorySelect);
    enhanceSelectControl(statusSelect);
    
    modal.classList.add('show');
    lockBodyScroll();
}

function toggleCoordinatorFields(include, fieldsEl) {
    if (!fieldsEl) return;
    if (include) {
        fieldsEl.hidden = false;
    } else {
        fieldsEl.hidden = true;
    }
}

// Pre-fill the questionnaire inputs from whatever data source we currently trust (defaults or saved state)
function populatePortfolioForm(form, data) {
    if (!form) return;
    const values = Object.assign({}, getPortfolioOnboardingDefaults(), data || {});
    form.elements['student_name'].value = values.student_name || '';
    form.elements['student_role'].value = values.student_role || '';
    form.elements['student_school'].value = values.student_school || '';
    form.elements['graduation_class'].value = values.graduation_class || '';
    form.elements['student_email'].value = values.student_email || '';
    form.elements['cas_period'].value = values.cas_period || '';
    form.elements['cas_summary'].value = values.cas_summary || '';
    form.elements['portfolio_status'].value = values.portfolio_status || '';
    form.elements['last_reviewed'].value = values.last_reviewed || '';
    form.elements['verification_notes'].value = values.verification_notes || '';

    enhanceSelectControl(form.elements['portfolio_status']);

    const includeCoordinator = Boolean(values.include_coordinator);
    const includeCheckbox = form.elements['include_coordinator'];
    const coordinatorFields = document.getElementById('onboarding-coordinator-fields');
    if (includeCheckbox) includeCheckbox.checked = includeCoordinator;
    toggleCoordinatorFields(includeCoordinator, coordinatorFields);

    if (includeCoordinator) {
        if (form.elements['coordinator_name']) form.elements['coordinator_name'].value = values.coordinator_name || '';
        if (form.elements['coordinator_role']) form.elements['coordinator_role'].value = values.coordinator_role || '';
        if (form.elements['coordinator_email']) form.elements['coordinator_email'].value = values.coordinator_email || '';
        if (form.elements['coordinator_phone']) form.elements['coordinator_phone'].value = values.coordinator_phone || '';
    } else {
        if (form.elements['coordinator_name']) form.elements['coordinator_name'].value = values.coordinator_name || '';
        if (form.elements['coordinator_role']) form.elements['coordinator_role'].value = values.coordinator_role || '';
        if (form.elements['coordinator_email']) form.elements['coordinator_email'].value = values.coordinator_email || '';
        if (form.elements['coordinator_phone']) form.elements['coordinator_phone'].value = values.coordinator_phone || '';
    }
}

// Read the questionnaire form into a normalized object so it can be saved or applied
function collectPortfolioFormData(form) {
    const data = {};
    const formData = new FormData(form);

    const getValue = (key) => {
        const value = formData.get(key);
        return typeof value === 'string' ? value.trim() : '';
    };

    data.student_name = getValue('student_name');
    data.student_role = getValue('student_role');
    data.student_school = getValue('student_school');
    data.graduation_class = getValue('graduation_class');
    data.student_email = getValue('student_email');
    data.cas_period = getValue('cas_period');
    data.cas_summary = getValue('cas_summary');
    data.portfolio_status = getValue('portfolio_status');
    data.last_reviewed = getValue('last_reviewed');
    data.verification_notes = getValue('verification_notes');

    data.include_coordinator = formData.get('include_coordinator') === 'on';
    if (data.include_coordinator) {
        data.coordinator_name = getValue('coordinator_name');
        data.coordinator_role = getValue('coordinator_role');
        data.coordinator_email = getValue('coordinator_email');
        data.coordinator_phone = getValue('coordinator_phone');
    } else {
        data.coordinator_name = '';
        data.coordinator_role = '';
        data.coordinator_email = '';
        data.coordinator_phone = '';
    }

    return data;
}

// Save the current form state and optionally push changes back into the DOM
function persistPortfolioOnboardingState(form, completed, options = {}) {
    const data = collectPortfolioFormData(form);
    const state = { completed: Boolean(completed), data };
    savePortfolioOnboardingState(state);
    if (options.syncDom) {
        applyPortfolioInformation(data);
    }
    return state;
}

// Mount the first-visit questionnaire, handle partial saves, and hide it once the student finishes
function initializePortfolioQuestionnaire() {
    const modal = document.getElementById('portfolio-onboarding-modal');
    const form = document.getElementById('portfolio-onboarding-form');
    if (!modal || !form) return;

    const closeBtn = document.getElementById('portfolio-onboarding-close');
    const saveLaterBtn = document.getElementById('portfolio-onboarding-save-later');
    const includeCheckbox = document.getElementById('onboarding-include-coordinator');
    const coordinatorFields = document.getElementById('onboarding-coordinator-fields');

    let state = getPortfolioOnboardingState();
    populatePortfolioForm(form, state.data);
    applyPortfolioInformation(state.data);

    const firstInput = form.querySelector('input, select, textarea');

    const showModal = () => {
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        lockBodyScroll();
        if (firstInput) {
            setTimeout(() => {
                firstInput.focus();
            }, 50);
        }
    };

    const hideModal = () => {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        unlockBodyScroll();
    };

    if (!state.completed) {
        showModal();
    }

    form.addEventListener('input', () => {
        state = persistPortfolioOnboardingState(form, false, { syncDom: false });
    });

    form.addEventListener('change', (event) => {
        if (event.target === includeCheckbox) {
            toggleCoordinatorFields(includeCheckbox.checked, coordinatorFields);
        }
    });

    if (includeCheckbox) {
        includeCheckbox.addEventListener('change', () => {
            state = persistPortfolioOnboardingState(form, false, { syncDom: false });
        });
    }

    if (saveLaterBtn) {
        saveLaterBtn.addEventListener('click', () => {
            state = persistPortfolioOnboardingState(form, false, { syncDom: true });
            hideModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            state = persistPortfolioOnboardingState(form, false, { syncDom: true });
            hideModal();
        });
    }

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            state = persistPortfolioOnboardingState(form, false, { syncDom: true });
        }
    });

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        state = persistPortfolioOnboardingState(form, true, { syncDom: true });
        hideModal();
    });
}

function openAddReflectionDialog() {
    document.getElementById('add-reflection-modal').classList.add('show');
    clearReflectionForm();
    populateActivitySelect();
}

function closeAddActivityDialog() {
    const modal = document.getElementById('add-activity-modal');
    if (modal) {
        modal.classList.remove('show');
    }
    unlockBodyScroll();
    // Reset modal scroll position
    if (modal) {
        modal.scrollTop = 0;
    }
}

function closeAddReflectionDialog() {
    document.getElementById('add-reflection-modal').classList.remove('show');
}

function clearActivityForm() {
    const form = document.getElementById('add-activity-form');
    form.reset();
    clearActivityImagePreview(true);
}

function clearReflectionForm() {
    const form = document.getElementById('add-reflection-form');
    form.reset();
}

function populateActivitySelect() {
    const select = document.querySelector('#add-reflection-form select[name="activityId"]');
    select.innerHTML = '<option value="">Select an activity...</option>' + 
        currentActivities.map(activity => 
            `<option value="${activity.id}">${activity.title}</option>`
        ).join('');
}

// Learning outcomes management keeps the tag UI in sync with the underlying array
function addLearningOutcome() {
    const input = document.getElementById('learning-outcome-input');
    const value = input.value.trim();
    
    if (value && !learningOutcomes.includes(value)) {
        learningOutcomes.push(value);
        input.value = '';
        renderLearningOutcomes();
    }
}

function removeLearningOutcome(index) {
    learningOutcomes.splice(index, 1);
    renderLearningOutcomes();
}

function renderLearningOutcomes() {
    const container = document.getElementById('learning-outcomes-list');
    if (!container) return;

    container.innerHTML = learningOutcomes.map((outcome, index) => `
        <span class="learning-outcome-tag" data-testid="badge-outcome-${index}">
            ${outcome}
            <span class="remove" onclick="removeLearningOutcome(${index})" data-testid="button-remove-outcome-${index}">×</span>
        </span>
    `).join('');
}

// Activity detail view assembles a richer modal with reflections and metadata
function viewActivityDetail(activityId) {
    const activity = currentActivities.find(a => a.id === activityId);
    if (!activity) return;
    
    const reflections = currentReflections.filter(r => r.activityId === activityId);
    const modal = document.getElementById('activity-detail-modal');
    const content = document.getElementById('activity-detail-content');
    content.innerHTML = `
        <div class="activity-detail-grid">
            <div class="activity-detail-main">
                <div class="activity-detail-header">
                    <div class="activity-badges">
                        <span class="badge ${getCategoryColor(activity.category)}" data-testid="badge-${activity.category}">
                            ${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                        </span>
                        <span class="badge" data-testid="badge-${activity.status}">${activity.status}</span>
                    </div>
                    <h1 class="activity-detail-title" data-testid="text-activity-title">${activity.title}</h1>
                    <p class="activity-detail-description" data-testid="text-activity-description">${activity.description}</p>
                </div>

                <div class="learning-outcomes-section">
                    <h3>Learning Outcomes</h3>
                    <div class="learning-outcomes-tags">
                        ${activity.learningOutcomes.map((outcome, index) => `
                            <span class="badge" data-testid="badge-outcome-${index}">${outcome}</span>
                        `).join('')}
                    </div>
                </div>

                <div class="reflections-section">
                    <h3>Reflections</h3>
                    ${reflections.length > 0 ? `
                        <div>
                            ${reflections.map(reflection => `
                                <div class="reflection-item" data-testid="reflection-${reflection.id}">
                                    <div class="reflection-item-header">
                                        <h4 class="reflection-item-title" data-testid="text-reflection-title-${reflection.id}">${reflection.title}</h4>
                                        <span class="reflection-item-date" data-testid="text-reflection-date-${reflection.id}">${formatFullDate(reflection.createdAt)}</span>
                                    </div>
                                    <p class="reflection-item-content" data-testid="text-reflection-content-${reflection.id}">${reflection.content}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <p data-testid="text-no-reflections">No reflections have been added for this activity yet.</p>
                    `}
                </div>
            </div>

            <div class="activity-sidebar">
                <div class="card">
                    <h3>Activity Details</h3>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <div class="detail-item-content">
                            <p>Start Date</p>
                            <span data-testid="text-start-date">${formatFullDate(activity.startDate)}</span>
                        </div>
                    </div>
                    ${activity.endDate ? `
                        <div class="detail-item">
                            <i class="fas fa-calendar"></i>
                            <div class="detail-item-content">
                                <p>End Date</p>
                                <span data-testid="text-end-date">${formatFullDate(activity.endDate)}</span>
                            </div>
                        </div>
                    ` : ''}
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <div class="detail-item-content">
                            <p>Total Hours</p>
                            <span data-testid="text-total-hours">${activity.hours} hours</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tag"></i>
                        <div class="detail-item-content">
                            <p>Category</p>
                            <span data-testid="text-category">${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}</span>
                        </div>
                    </div>
                    <div class="detail-actions">
                        <button class="btn btn-outline" onclick="openAddActivityDialog('${activity.id}')" data-testid="button-edit-activity">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger" onclick="deleteActivity('${activity.id}')" data-testid="button-delete-activity">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    lockBodyScroll();
}

async function deleteActivity(activityId) {
    if (!confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
        return;
    }

    try {
        await apiDeleteActivity(activityId);

        currentActivities = currentActivities.filter(a => a.id !== activityId);
        currentReflections = currentReflections.filter(r => r.activityId !== activityId);

        writeCache(CACHE_KEYS.ACTIVITIES, currentActivities);
        writeCache(CACHE_KEYS.REFLECTIONS, currentReflections);

        const detailModal = document.getElementById('activity-detail-modal');
        if (detailModal) {
            detailModal.classList.remove('show');
        }
        unlockBodyScroll();

        renderActivitiesGrid();
        renderTimeline();
        renderHeroStats();
        renderCategoriesGrid();
        renderProgressDashboard();
        renderGallery();

        alert('Activity deleted successfully!');
    } catch (error) {
        console.error('Failed to delete activity', error);
        alert(error?.message || 'Unable to delete the activity. Please try again.');
    }
}

function closeActivityDetail() {
    const modal = document.getElementById('activity-detail-modal');
    if (modal) {
        modal.classList.remove('show');
        modal.scrollTop = 0;
    }
    unlockBodyScroll();
}

// Form submission handlers capture and persist user input from the activity and reflection modals
function buildActivityPayload(form) {
    const imageUrlInput = document.getElementById('header-image-url');
    const title = (form.elements['title']?.value || '').trim();
    const category = form.elements['category']?.value || '';
    const description = (form.elements['description']?.value || '').trim();
    const startDate = form.elements['startDate']?.value || '';
    const endDate = form.elements['endDate']?.value || '';
    const hoursValue = Number(form.elements['hours']?.value || 0);
    const statusValue = (form.elements['status']?.value || 'draft').toLowerCase();
    const headerImageUrl = imageUrlInput ? imageUrlInput.value.trim() : '';

    if (!title) {
        alert('Please provide an activity title.');
        return null;
    }

    if (!category) {
        alert('Please choose a category.');
        return null;
    }

    if (!startDate) {
        alert('Please select a start date.');
        return null;
    }

    if (!isValidHttpsUrl(headerImageUrl)) {
        alert('Header image must be a valid HTTPS URL.');
        if (imageUrlInput) {
            imageUrlInput.focus();
        }
        return null;
    }

    if (!Number.isFinite(hoursValue) || hoursValue < 0) {
        alert('Hours must be a non-negative number.');
        return null;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
        alert('End date cannot be before the start date.');
        return null;
    }

    const allowedStatuses = new Set(['draft', 'ongoing', 'pending', 'completed']);
    let normalizedStatus = allowedStatuses.has(statusValue) ? statusValue : 'draft';
    if (normalizedStatus === 'pending') {
        normalizedStatus = 'ongoing';
    }

    return {
        title,
        category,
        description,
        startDate,
        endDate: endDate || null,
        hours: hoursValue,
        status: normalizedStatus,
        learningOutcomes: [...learningOutcomes],
        header_image_url: headerImageUrl,
        galleryImageUrls: [],
        evidenceUrls: [],
        impacts: [],
    };
}

function showActivityImagePreview(url) {
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('image-preview-img');
    if (!preview || !img) return;
    if (!isValidHttpsUrl(url)) {
        clearActivityImagePreview(false);
        return;
    }
    img.dataset.fallback = IMAGE_PLACEHOLDER;
    img.dataset.usingFallback = '0';
    img.classList.remove('is-placeholder');
    img.src = url;
    preview.hidden = false;
    attachImageFallbacks(preview);
}

function clearActivityImagePreview(resetInput = false) {
    const preview = document.getElementById('image-preview');
    const img = document.getElementById('image-preview-img');
    const imageUrlInput = document.getElementById('header-image-url');
    if (resetInput && imageUrlInput) {
        imageUrlInput.value = '';
    }
    if (img) {
        img.classList.remove('is-placeholder');
        img.removeAttribute('src');
        delete img.dataset.usingFallback;
    }
    if (preview) {
        preview.hidden = true;
    }
}

function syncActivityImagePreview() {
    const imageUrlInput = document.getElementById('header-image-url');
    if (!imageUrlInput) return;
    const value = imageUrlInput.value.trim();
    if (isValidHttpsUrl(value)) {
        showActivityImagePreview(value);
    } else {
        clearActivityImagePreview(false);
    }
}

async function handleActivityFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const payload = buildActivityPayload(form);

    if (!payload) {
        return;
    }

    const isEditing = typeof currentActivityId === 'string' && currentActivityId.trim() !== '';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const activity = isEditing
            ? await apiUpdateActivity(currentActivityId, payload)
            : await apiCreateActivity(payload);

        if (isEditing) {
            const index = currentActivities.findIndex((item) => item.id === activity.id);
            if (index !== -1) {
                currentActivities[index] = activity;
            }
        } else {
            currentActivities.unshift(activity);
        }

        writeCache(CACHE_KEYS.ACTIVITIES, currentActivities);

        learningOutcomes = [];
        form.reset();
        clearActivityImagePreview(true);
        renderLearningOutcomes();
        closeAddActivityDialog();

        renderActivitiesGrid();
        renderTimeline();
        renderHeroStats();
        renderCategoriesGrid();
        renderProgressDashboard();
        renderGallery();

        alert(isEditing ? 'Activity updated successfully!' : 'Activity created successfully!');
        currentActivityId = null;
    } catch (error) {
        console.error('Failed to save activity', error);
        alert(error?.message || 'Unable to save the activity. Please try again.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = submitBtn.dataset.originalText || submitBtn.innerHTML;
        }
    }
}

async function handleReflectionFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const activityId = form.elements['activityId']?.value || '';
    const title = (form.elements['title']?.value || '').trim();
    const content = (form.elements['content']?.value || '').trim();

    if (!activityId) {
        alert('Please select the activity this reflection belongs to.');
        return;
    }

    try {
        const reflection = await apiCreateReflection({
            activity_id: activityId,
            title,
            content,
        });

        if (!reflection) {
            throw new Error('Received an invalid reflection response.');
        }

        currentReflections.unshift(reflection);
        writeCache(CACHE_KEYS.REFLECTIONS, currentReflections);

        form.reset();
        closeAddReflectionDialog();

        renderActivitiesGrid();
        renderTimeline();
        renderProgressDashboard();
        renderGallery();

        alert('Reflection added successfully!');
    } catch (error) {
        console.error('Failed to save reflection', error);
        alert(error?.message || 'Unable to save the reflection. Please try again.');
    }
}

// Wire up event listeners that cannot be attached inline for accessibility reasons
function initializeEventListeners() {
    // Form submissions
    document.getElementById('add-activity-form').addEventListener('submit', handleActivityFormSubmit);
    document.getElementById('add-reflection-form').addEventListener('submit', handleReflectionFormSubmit);
    
    // Learning outcome input
    document.getElementById('learning-outcome-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addLearningOutcome();
        }
    });

    const imageUrlInput = document.getElementById('header-image-url');
    if (imageUrlInput) {
        imageUrlInput.addEventListener('input', syncActivityImagePreview);
        imageUrlInput.addEventListener('change', syncActivityImagePreview);
        imageUrlInput.addEventListener('blur', syncActivityImagePreview);
    }

    const removeImageBtn = document.getElementById('remove-image');
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', (evt) => {
            evt.preventDefault();
            clearActivityImagePreview(true);
            if (imageUrlInput) {
                imageUrlInput.focus();
            }
        });
    }

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('show');
                unlockBodyScroll();
            }
        });
    });

    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
            unlockBodyScroll();
        }
    });

    // View All Photos
    const viewAllPhotosBtn = document.querySelector('[data-testid="button-view-all-photos"]');
    if (viewAllPhotosBtn) {
        viewAllPhotosBtn.addEventListener('click', openPhotosModal);
    }
}

function initializeSelectControls() {
    enhanceSelectControl(document.getElementById('onboarding-portfolio-status'));
    enhanceSelectControl(document.querySelector('[data-testid="select-activity-category"]'));
    enhanceSelectControl(document.querySelector('[data-testid="select-activity-status"]'));
    enhanceSelectControl(document.querySelector('[data-testid="select-reflection-activity"]'));
}

async function handleLegacyMigration() {
    if (!isAuthenticated) {
        return;
    }

    if (localStorage.getItem(LEGACY_MIGRATION_FLAG) === 'done') {
        return;
    }

    const legacyActivities = readLegacyArray(LEGACY_STORAGE_KEYS.ACTIVITIES);
    const legacyReflections = readLegacyArray(LEGACY_STORAGE_KEYS.REFLECTIONS);
    const legacyLayout = readLegacyObject(LEGACY_CUSTOMIZE_KEYS.LAYOUT, null);
    const legacyTheme = readLegacyObject(LEGACY_CUSTOMIZE_KEYS.THEME, null);
    const legacyContent = readLegacyObject(LEGACY_CUSTOMIZE_KEYS.CONTENT, null);
    const legacyCustomSections = readLegacyArray(LEGACY_CUSTOMIZE_KEYS.CUSTOM_SECTIONS);

    const hasLegacySettings = Boolean(legacyLayout) || Boolean(legacyTheme) || (legacyContent && Object.keys(legacyContent).length > 0) || legacyCustomSections.length > 0;

    if (legacyActivities.length === 0 && legacyReflections.length === 0 && !hasLegacySettings) {
        return;
    }

    if (!confirm('We found saved CASfolio data from an older version. Migrate it to your account now?')) {
        return;
    }

    const migrationReport = {
        skippedActivities: [],
        skippedHero: false,
        heroUploadError: null,
        heroUploaded: false,
        settingsMigrated: false,
        settingsMigrationError: null,
    };

    const migratedMap = new Map();

    for (const legacy of legacyActivities) {
        const payload = buildLegacyActivityPayload(legacy, migrationReport);
        if (!payload) {
            continue;
        }

        try {
            const created = await apiCreateActivity(payload);
            currentActivities.unshift(created);
            migratedMap.set(String(legacy.id), created.id);
        } catch (error) {
            console.error('Failed to migrate legacy activity', legacy, error);
            migrationReport.skippedActivities.push(legacy.title || 'Untitled Activity');
        }
    }

    for (const legacyReflection of legacyReflections) {
        const legacyActivityId = String(legacyReflection.activityId || legacyReflection.activity_id || '');
        const mappedActivityId = migratedMap.get(legacyActivityId);
        if (!mappedActivityId) {
            continue;
        }

        try {
            const createdReflection = await apiCreateReflection({
                activity_id: mappedActivityId,
                title: (legacyReflection.title || 'Reflection').trim(),
                content: (legacyReflection.content || '').trim(),
            });
            if (createdReflection) {
                currentReflections.unshift(createdReflection);
            }
        } catch (error) {
            console.error('Failed to migrate legacy reflection', legacyReflection, error);
        }
    }

    if (currentActivities.length > 0) {
        writeCache(CACHE_KEYS.ACTIVITIES, currentActivities);
    }
    if (currentReflections.length > 0) {
        writeCache(CACHE_KEYS.REFLECTIONS, currentReflections);
    }

    await migrateLegacyCustomization({
        layout: legacyLayout,
        theme: legacyTheme,
        content: legacyContent,
        customSections: legacyCustomSections,
    }, migrationReport);

    localStorage.removeItem(LEGACY_STORAGE_KEYS.ACTIVITIES);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.REFLECTIONS);
    localStorage.setItem(LEGACY_MIGRATION_FLAG, 'done');

    const shouldRefreshUi = migratedMap.size > 0 || legacyReflections.length > 0;
    if (shouldRefreshUi) {
        renderActivitiesGrid();
        renderTimeline();
        renderHeroStats();
        renderCategoriesGrid();
        renderProgressDashboard();
        renderGallery();
    }

    const summaryNotes = [];
    if (migrationReport.skippedActivities.length > 0) {
        summaryNotes.push(`Activities skipped: ${migrationReport.skippedActivities.join(', ')}`);
    }
    if (migrationReport.heroUploaded) {
        summaryNotes.push('Hero image uploaded to cloud storage.');
    }
    if (migrationReport.skippedHero) {
        summaryNotes.push('Hero image was not migrated and remains local.');
    }
    if (migrationReport.heroUploadError) {
        summaryNotes.push(`Hero image upload failed: ${migrationReport.heroUploadError}`);
    }
    if (migrationReport.settingsMigrated) {
        summaryNotes.push('Portfolio settings synchronized to your account.');
    }
    if (migrationReport.settingsMigrationError) {
        summaryNotes.push(`Portfolio settings failed to migrate: ${migrationReport.settingsMigrationError}`);
    }

    if (summaryNotes.length > 0) {
        const record = {
            createdAt: new Date().toISOString(),
            notes: summaryNotes,
        };
        try {
            localStorage.setItem(LEGACY_MIGRATION_NOTES_KEY, JSON.stringify(record));
        } catch (error) {
            console.warn('Unable to record legacy migration notes', error);
        }
        console.info('CASfolio migration completed with notes:', summaryNotes.join(' | '));
    } else {
        localStorage.removeItem(LEGACY_MIGRATION_NOTES_KEY);
    }
}

function buildLegacyActivityPayload(legacy, report) {
    const statusMap = new Map([
        ['completed', 'completed'],
        ['pending', 'pending'],
        ['draft', 'draft'],
        ['ongoing', 'draft'],
    ]);

    const learning = Array.isArray(legacy.learningOutcomes)
        ? legacy.learningOutcomes
        : Array.isArray(legacy.learning_outcomes)
            ? legacy.learning_outcomes
            : [];

    let headerUrl = '';
    if (typeof legacy.header_image_url === 'string') {
        headerUrl = legacy.header_image_url.trim();
    } else if (typeof legacy.headerImageUrl === 'string') {
        headerUrl = legacy.headerImageUrl.trim();
    } else if (typeof legacy.headerImage === 'string') {
        headerUrl = legacy.headerImage.trim();
    }

    if (headerUrl.startsWith('data:')) {
        headerUrl = '';
    }

    while (!isValidHttpsUrl(headerUrl)) {
        const response = prompt(`Provide an HTTPS image URL for the activity "${legacy.title || 'Untitled Activity'}".`);
        if (response === null) {
            if (confirm('Skip migrating this activity?')) {
                if (report && Array.isArray(report.skippedActivities)) {
                    report.skippedActivities.push(legacy.title || 'Untitled Activity');
                }
                return null;
            }
            continue;
        }
        const trimmed = response.trim();
        if (isValidHttpsUrl(trimmed)) {
            headerUrl = trimmed;
        } else {
            alert('Image URLs must start with https://.');
        }
    }

    const startDate = (legacy.startDate || legacy.start_date || '').trim();
    const endDate = (legacy.endDate || legacy.end_date || '').trim();
    const hoursValue = Number(legacy.hours || 0);
    const rawStatus = (legacy.status || '').toLowerCase();

    return {
        title: (legacy.title || 'Untitled Activity').trim(),
        category: (legacy.category || '').trim() || 'creativity',
        description: (legacy.description || '').trim(),
        startDate,
        endDate: endDate || null,
        hours: Number.isFinite(hoursValue) && hoursValue >= 0 ? hoursValue : 0,
        status: statusMap.get(rawStatus) || 'draft',
        learningOutcomes: learning.filter((item) => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()),
        header_image_url: headerUrl,
        galleryImageUrls: [],
        evidenceUrls: [],
        impacts: Array.isArray(legacy.impacts) ? legacy.impacts : [],
    };
}

async function migrateLegacyCustomization(legacy, report) {
    const hasLayout = legacy.layout && typeof legacy.layout === 'object' && Object.keys(legacy.layout).length > 0;
    const hasTheme = legacy.theme && typeof legacy.theme === 'object' && Object.keys(legacy.theme).length > 0;
    const hasContent = legacy.content && typeof legacy.content === 'object' && Object.keys(legacy.content).length > 0;
    const hasSections = Array.isArray(legacy.customSections) && legacy.customSections.length > 0;

    if (!hasLayout && !hasTheme && !hasContent && !hasSections) {
        return false;
    }

    let contentPayload = null;
    if (hasContent) {
        contentPayload = await sanitizeLegacyContent(legacy.content, report);
    }

    const payload = {
        layout: hasLayout ? legacy.layout : null,
        theme: hasTheme ? legacy.theme : null,
        content: contentPayload,
        customSections: Array.isArray(legacy.customSections) ? legacy.customSections : [],
    };

    const result = await fetchJsonWithStatus(API_ENDPOINTS.SETTINGS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!result.ok) {
        const message = (result.data && result.data.error) || 'Unable to save portfolio settings.';
        console.error('Failed to migrate legacy settings', message);
        report.settingsMigrationError = message;
        return false;
    }

    report.settingsMigrated = true;

    Object.values(LEGACY_CUSTOMIZE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
    });

    return true;
}

async function sanitizeLegacyContent(legacyContent, report) {
    if (!legacyContent || typeof legacyContent !== 'object') {
        return null;
    }

    const clone = JSON.parse(JSON.stringify(legacyContent));
    const candidateSources = [
        typeof clone.heroImageUrl === 'string' ? clone.heroImageUrl : '',
        typeof clone.hero_image_url === 'string' ? clone.hero_image_url : '',
        typeof clone.heroImage === 'string' ? clone.heroImage : '',
    ];
    let heroSource = candidateSources.find((value) => typeof value === 'string' && value.trim() !== '') || '';
    heroSource = heroSource.trim();

    let heroPath = '';
    if (typeof clone.heroImagePath === 'string' && clone.heroImagePath.trim() !== '') {
        heroPath = clone.heroImagePath.trim();
    } else if (typeof clone.hero_image_path === 'string' && clone.hero_image_path.trim() !== '') {
        heroPath = clone.hero_image_path.trim();
    }

    const clearHeroFields = () => {
        delete clone.heroImageUrl;
        delete clone.hero_image_url;
        delete clone.heroImage;
        delete clone.hero_image;
        delete clone.heroImagePath;
        delete clone.hero_image_path;
        heroPath = '';
    };

    if (heroSource && heroSource.startsWith('data:')) {
        const shouldUpload = confirm('We found a hero image stored locally. Upload it now so it can sync across devices?');
        if (shouldUpload) {
            const upload = await uploadLegacyHeroImage(heroSource);
            if (upload.ok) {
                clone.heroImageUrl = upload.url;
                clone.hero_image_url = upload.url;
                if (upload.path) {
                    clone.heroImagePath = upload.path;
                    clone.hero_image_path = upload.path;
                    heroPath = upload.path;
                } else if (heroPath) {
                    clone.heroImagePath = heroPath;
                    clone.hero_image_path = heroPath;
                } else {
                    delete clone.heroImagePath;
                    delete clone.hero_image_path;
                }
                clone._heroImageMigrated = true;
                report.heroUploaded = true;
            } else {
                report.heroUploadError = upload.error || 'Unknown hero upload error';
                clearHeroFields();
            }
        } else {
            report.skippedHero = true;
            clearHeroFields();
        }
    } else if (heroSource) {
        if (isValidHttpsUrl(heroSource)) {
            clone.heroImageUrl = heroSource;
            clone.hero_image_url = heroSource;
            if (!heroPath) {
                delete clone.heroImagePath;
                delete clone.hero_image_path;
            }
        } else {
            report.skippedHero = true;
            clearHeroFields();
        }
    } else if (heroPath) {
        delete clone.heroImageUrl;
        delete clone.hero_image_url;
        clone.heroImagePath = heroPath;
        clone.hero_image_path = heroPath;
    } else {
        clearHeroFields();
    }

    delete clone.heroImage;
    delete clone.hero_image;

    return clone;
}

async function uploadLegacyHeroImage(dataUrl) {
    const uploadFile = dataUrlToFile(dataUrl, 'legacy-hero.png');
    if (!uploadFile) {
        return { ok: false, error: 'Unable to prepare hero image for upload.' };
    }

    const formData = new FormData();
    if (typeof File !== 'undefined' && uploadFile instanceof File) {
        formData.append('file', uploadFile);
    } else {
        formData.append('file', uploadFile, 'legacy-hero.png');
    }

    const result = await fetchJsonWithStatus(API_ENDPOINTS.HERO_IMAGE, {
        method: 'POST',
        body: formData,
    });

    if (!result.ok || !result.data || typeof result.data.url !== 'string') {
        const message = (result.data && result.data.error) || 'Hero image upload failed.';
        return { ok: false, error: message };
    }

    return {
        ok: true,
        url: result.data.url,
        path: typeof result.data.path === 'string' ? result.data.path : null,
    };
}

function dataUrlToFile(dataUrl, filename) {
    try {
        const [header, base64] = dataUrl.split(',');
        if (!header || !base64) {
            return null;
        }
        const mimeMatch = /data:(.*?);base64/i.exec(header);
        const mime = mimeMatch ? mimeMatch[1] : 'image/png';
        const binary = typeof atob === 'function' ? atob(base64) : null;
        if (!binary) {
            return null;
        }
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        if (typeof File === 'function') {
            return new File([bytes], filename, { type: mime });
        }
        return new Blob([bytes], { type: mime });
    } catch (error) {
        console.warn('Failed to convert legacy hero image', error);
        return null;
    }
}


// Kick off the initial render pipeline once the DOM is ready
async function initializeApp() {
    await bootstrapData();
    await handleLegacyMigration();

    renderHeroStats();
    renderCategoriesGrid();
    renderActivitiesGrid();
    renderTimeline();
    renderProgressDashboard();
    renderGallery();
    initializeEventListeners();
    initializePortfolioQuestionnaire();
    initializeSelectControls();
    attachImageFallbacks();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch((error) => console.error('Failed to initialize CASfolio', error));
});

// Photos modal
function openPhotosModal() {
    const modal = document.getElementById('photos-modal');
    const grid = document.getElementById('photos-grid');
    const empty = document.getElementById('photos-empty');

    const photos = currentActivities
        .filter(a => isValidHttpsUrl(a.header_image_url))
        .map(a => ({ url: a.header_image_url, title: a.title, id: a.id }));

    if (!grid || !empty || !modal) return;

    if (photos.length === 0) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        empty.style.display = 'block';
    } else {
        empty.style.display = 'none';
        grid.style.display = 'grid';
        grid.innerHTML = photos.map(p => `
            <div class="gallery-card" data-testid="photo-item-${p.id}">
                <div class="gallery-card-clickable" onclick="viewActivityDetail('${p.id}')">
                    <img class="activity-image" src="${escapeAttribute(p.url)}" alt="${escapeHtml(p.title)}" data-fallback="${IMAGE_PLACEHOLDER}" loading="lazy">
                    <div class="gallery-content">
                        <h4 class="gallery-title">${p.title}</h4>
                    </div>
                </div>
            </div>
        `).join('');
        attachImageFallbacks(grid);
    }
    
    modal.classList.add('show');
    lockBodyScroll();
}

function closePhotosModal() {
    const modal = document.getElementById('photos-modal');
    if (modal) {
        modal.classList.remove('show');
    }
    unlockBodyScroll();
}
