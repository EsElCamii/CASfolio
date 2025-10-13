// moved to Next public; Sample data for the CAS portfolio
const sampleData = {
    activities: [
        {
            id: "1",
            title: "Noordwijk Shoreline Clean-Up",
            description: "Coordinated a weekend clean-up along the Noordwijk beach with fellow students and local volunteers.",
            category: "service",
            dateGeneral: "2024-09-14",
            endDate: "2024-09-14",
            totalHours: 4,
            challengeDescription: "Managing shifting tides while keeping volunteers motivated throughout the day.",
            learningOutcomes: ["LO5", "LO6"],
            rating: 5,
            difficulty: 6,
            images: [],
            status: "completed",
            createdAt: "2024-09-14"
        },
        {
            id: "2",
            title: "CAS Jazz Collective Rehearsal",
            description: "Led a jazz improvisation workshop for underclassmen interested in joining the school ensemble.",
            category: "creativity",
            dateGeneral: "2024-10-03",
            endDate: "2024-10-03",
            totalHours: 3,
            challengeDescription: "Balancing theory explanations with hands-on practice so everyone felt confident improvising.",
            learningOutcomes: ["LO1", "LO3"],
            rating: 4,
            difficulty: 5,
            images: [],
            status: "completed",
            createdAt: "2024-10-03"
        },
        {
            id: "3",
            title: "Noordwijk Cycle Tour",
            description: "Organised a coastal cycling challenge to promote healthy lifestyles for first-year students.",
            category: "activity",
            dateGeneral: "2024-10-19",
            endDate: "2024-10-20",
            totalHours: 5,
            challengeDescription: "Supporting riders of different abilities while tracking everyone's safety across the route.",
            learningOutcomes: ["LO2", "LO4"],
            rating: 5,
            difficulty: 7,
            images: [],
            status: "completed",
            createdAt: "2024-10-19"
        },
        {
            id: "4",
            title: "Holiday Food Drive Planning",
            description: "Planned logistics for the annual CAS holiday food drive supporting Noordwijk community partners.",
            category: "service",
            dateGeneral: "2024-11-07",
            endDate: null,
            totalHours: 2,
            challengeDescription: "Coordinating vendor donations while keeping our team organised before launch week.",
            learningOutcomes: ["LO3", "LO7"],
            rating: 3,
            difficulty: 8,
            images: [],
            status: "ongoing",
            createdAt: "2024-11-07"
        }
    ],
    reflections: [
        {
            id: "r1",
            activityId: "1",
            title: "Leading with Care",
            content: "The shoreline clean-up reminded me that leadership is equal parts planning and empathy. When the weather shifted, I had to adapt the schedule and reassure volunteers. Seeing the bags of collected waste made the effort tangible and strengthened my commitment to environmental advocacy.",
            createdAt: "2024-09-15"
        },
        {
            id: "r2",
            activityId: "2",
            title: "Improvisation Confidence",
            content: "Running the jazz workshop pushed me to communicate musical concepts in different ways. Hearing participants improvise by the end of the session proved that patient coaching and structured practice build confidence quickly.",
            createdAt: "2024-10-04"
        }
    ]
};

const SAMPLE_PORTFOLIO_PROFILE = {
    student_name: "Juan Fernandez Herrera",
    student_role: "IB Diploma Candidate",
    student_school: "Noordwijk International College",
    graduation_class: "Class of 2027",
    student_email: "juan.fherrera@noordwijk-ic.nl",
    cas_period: "Mar 2025 – Aug 2027",
    cas_summary: "Focused on coastal stewardship, creative leadership, and active wellbeing for the Noordwijk community.",
    portfolio_status: "in-progress",
    last_reviewed: "2025-08-09",
    verification_notes: "Demonstrates consistent initiative across CAS strands.",
    include_coordinator: true,
    coordinator_name: "Miss Miriam Fragoso Rodriguez",
    coordinator_role: "CAS Coordinator",
    coordinator_email: "miriam.fragoso@noordwijk.edu.mx",
    coordinator_phone: "+52 229 123 4567"
};

const LEARNING_OUTCOME_PRESETS = [
    { value: "LO1", code: "LO1", label: "Identify strengths and develop areas for growth" },
    { value: "LO2", code: "LO2", label: "Demonstrate that challenges have been undertaken" },
    { value: "LO3", code: "LO3", label: "Initiate and plan a CAS experience" },
    { value: "LO4", code: "LO4", label: "Show commitment and perseverance" },
    { value: "LO5", code: "LO5", label: "Demonstrate collaborative skills" },
    { value: "LO6", code: "LO6", label: "Engage with issues of global significance" },
    { value: "LO7", code: "LO7", label: "Recognise and consider the ethics of choices" }
];

const TOTAL_REQUIRED_HOURS = 240;
const CATEGORY_TARGET_HOURS = 80;
const MIN_DISPLAY_MONTHS = 1;
const MAX_VALID_MONTHS = 24;

// Data storage keys used to namespace everything we keep in localStorage
const STORAGE_KEYS = {
    ACTIVITIES: 'casfolio_activities',
    REFLECTIONS: 'casfolio_reflections'
};

const PORTFOLIO_ONBOARDING_KEY = 'casfolio_portfolio_onboarding';
const DEMO_SEEDED_KEY = 'casfolio_demo_seeded_noordwijk';
const THEME_STORAGE_KEY = 'casfolio_theme_preference';

// Load data from localStorage or initialize with empty arrays so a new visitor starts fresh
let currentActivities = [];
let currentReflections = [];

try {
    const storedActivities = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (storedActivities) {
        const parsed = JSON.parse(storedActivities);
        if (Array.isArray(parsed)) {
            currentActivities = parsed.map((activity) => {
                const normalized = { ...activity };
                normalized.dateGeneral = activity.dateGeneral || activity.date_general || activity.startDate || null;
                normalized.startDate = normalized.dateGeneral;
                normalized.endDate = activity.endDate || activity.end_date || null;
                normalized.totalHours = Number.isFinite(activity.totalHours)
                    ? activity.totalHours
                    : Number.isFinite(activity.total_hours)
                        ? activity.total_hours
                        : Number.isFinite(activity.hours)
                            ? activity.hours
                            : 0;
                normalized.challengeDescription = activity.challengeDescription || activity.challenge_description || '';
                normalized.learningOutcomes = Array.isArray(activity.learningOutcomes)
                    ? activity.learningOutcomes
                    : Array.isArray(activity.learning_outcomes)
                        ? activity.learning_outcomes
                        : [];
                const hydratedRating = Number(activity.rating ?? activity.rating_value);
                normalized.rating = Number.isFinite(hydratedRating) && hydratedRating > 0 ? hydratedRating : null;
                const hydratedDifficulty = Number(activity.difficulty ?? activity.difficulty_value);
                normalized.difficulty = Number.isFinite(hydratedDifficulty) ? hydratedDifficulty : null;
                return normalized;
            });
        }
    }

    const storedReflections = localStorage.getItem(STORAGE_KEYS.REFLECTIONS);
    if (storedReflections) {
        const parsed = JSON.parse(storedReflections);
        if (Array.isArray(parsed)) {
            currentReflections = parsed;
        }
    }
} catch (error) {
    console.warn('Failed to hydrate cached portfolio data, falling back to in-memory defaults.', error);
    currentActivities = [];
    currentReflections = [];
}

try {
    const demoFlag = localStorage.getItem(DEMO_SEEDED_KEY);
    if (!demoFlag && currentActivities.length === 0 && currentReflections.length === 0) {
        currentActivities = sampleData.activities.map((activity) => ({
            ...activity,
            dateGeneral: activity.dateGeneral,
            startDate: activity.dateGeneral,
            endDate: activity.endDate || null,
            totalHours: activity.totalHours,
            learningOutcomes: Array.isArray(activity.learningOutcomes) ? [...activity.learningOutcomes] : [],
            rating: (() => {
                const value = Number(activity.rating);
                return Number.isFinite(value) && value > 0 ? value : null;
            })(),
            difficulty: (() => {
                const value = Number(activity.difficulty);
                return Number.isFinite(value) ? value : null;
            })(),
            headerImage: null,
            headerImagePath: null,
            assets: [],
            updatedAt: activity.createdAt
        }));
        currentReflections = sampleData.reflections.map((reflection) => ({ ...reflection }));
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(currentActivities));
        localStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(currentReflections));
        localStorage.setItem(DEMO_SEEDED_KEY, '1');

        if (!localStorage.getItem(PORTFOLIO_ONBOARDING_KEY)) {
            localStorage.setItem(
                PORTFOLIO_ONBOARDING_KEY,
                JSON.stringify({ completed: false, data: SAMPLE_PORTFOLIO_PROFILE })
            );
        }
    }
} catch (seedError) {
    console.warn('Unable to seed Noordwijk demo data', seedError);
}

let activitiesSyncPromise = null;
let sessionExpiredNotified = false;
let isPrinting = false;
const VALID_THEME_SETTINGS = new Set(['light', 'dark', 'system']);
const THEME_ICON_MAP = {
    light: 'fas fa-sun',
    dark: 'fas fa-moon',
    system: 'fas fa-circle-half-stroke'
};
const THEME_LABEL_MAP = {
    light: 'Light',
    dark: 'Dark',
    system: 'System'
};
let themeSetting = 'system';
let resolvedTheme = 'light';
let themeControls = [];
let themeMediaQuery = null;
let themeMenuDismissBound = false;
let themeInitialized = false;

const HEATMAP_SETTINGS_KEY = 'casfolio_heatmap_settings';
const HEATMAP_RANGE_OPTIONS = {
    '52w': { label: 'Last 52 weeks', days: 52 * 7 }
};
const DEFAULT_HEATMAP_SETTINGS = {
    range: '52w',
    categories: { creativity: true, activity: true, service: true }
};
let heatmapSettings = loadHeatmapSettings();

const MAX_LEARNING_OUTCOMES = 24;
const PRESET_LEARNING_OUTCOME_VALUES = new Set(LEARNING_OUTCOME_PRESETS.map((item) => item.value));

let learningOutcomes = [];
let customLearningOutcomes = [];

function toFiniteNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function toOptionalPositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function setPrintMode(enabled) {
    if (isPrinting === enabled) {
        return;
    }

    isPrinting = enabled;

    if (typeof document !== 'undefined' && document.body) {
        document.body.classList.toggle('print-mode', enabled);
    }

    // Re-render key sections so print mode can surface full content
    try {
        renderActivitiesGrid();
        renderTimeline();
    } catch (error) {
        console.warn('Failed to refresh views for print mode', error);
    }
}

function resolveTheme(setting) {
    if (setting === 'light' || setting === 'dark') {
        return setting;
    }
    if (themeMediaQuery) {
        return themeMediaQuery.matches ? 'dark' : 'light';
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

function closeAllThemeMenus() {
    themeControls.forEach(({ container, trigger }) => {
        if (container) {
            container.classList.remove('is-open');
        }
        if (trigger) {
            trigger.setAttribute('aria-expanded', 'false');
        }
    });
}

function updateThemeControlsUI() {
    if (themeControls.length === 0) {
        return;
    }
    const iconClass = THEME_ICON_MAP[themeSetting] || THEME_ICON_MAP.system;
    const labelText = THEME_LABEL_MAP[themeSetting] || THEME_LABEL_MAP.system;

    themeControls.forEach(({ container, trigger, icon, label, options }) => {
        if (icon) {
            icon.className = iconClass;
        }
        if (label) {
            label.textContent = `Theme: ${labelText}`;
        }
        if (trigger) {
            trigger.setAttribute('aria-label', `Theme: ${labelText}`);
            const expanded = container && container.classList.contains('is-open');
            trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        }
        options.forEach((option) => {
            const value = option.dataset.themeValue || 'system';
            const isActive = value === themeSetting;
            option.setAttribute('aria-checked', isActive ? 'true' : 'false');
        });
    });
}

function applyThemeSetting(setting, { persist = true } = {}) {
    if (!VALID_THEME_SETTINGS.has(setting)) {
        setting = 'system';
    }
    themeSetting = setting;
    resolvedTheme = resolveTheme(setting);

    if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (root) {
            root.classList.toggle('dark', resolvedTheme === 'dark');
            root.setAttribute('data-theme-setting', setting);
        }
    }

    if (persist) {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, setting);
        } catch (error) {
            console.warn('Unable to persist theme preference', error);
        }
    }

    updateThemeControlsUI();
}

function initializeThemeControls() {
    if (typeof document === 'undefined') {
        return;
    }

    const containers = Array.from(document.querySelectorAll('[data-theme-control]'));
    if (containers.length === 0) {
        themeControls = [];
        return;
    }

    themeControls = containers.map((container) => {
        const trigger = container.querySelector('[data-theme-trigger]');
        const icon = container.querySelector('[data-theme-icon]');
        const label = container.querySelector('[data-theme-trigger-label]');
        const options = Array.from(container.querySelectorAll('[data-theme-option]'));

        if (trigger && !trigger.dataset.themeTriggerBound) {
            trigger.dataset.themeTriggerBound = '1';
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const isOpen = container.classList.contains('is-open');
                closeAllThemeMenus();
                if (!isOpen) {
                    container.classList.add('is-open');
                    trigger.setAttribute('aria-expanded', 'true');
                }
            });
            trigger.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeAllThemeMenus();
                    trigger.blur();
                }
            });
        }

        options.forEach((option) => {
            if (option.dataset.themeOptionBound === '1') {
                return;
            }
            option.dataset.themeOptionBound = '1';

            const handleSelection = () => {
                const value = option.dataset.themeValue || 'system';
                applyThemeSetting(value);
                closeAllThemeMenus();
                if (trigger) {
                    trigger.focus();
                }
            };

            option.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                handleSelection();
            });

            option.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelection();
                }
            });
        });

        return { container, trigger, icon, label, options };
    });

    if (!themeMenuDismissBound) {
        document.addEventListener('click', (event) => {
            if (!event.target.closest('[data-theme-control]')) {
                closeAllThemeMenus();
            }
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeAllThemeMenus();
            }
        });
        themeMenuDismissBound = true;
    }

    updateThemeControlsUI();
}

function initializeTheme() {
    if (themeInitialized) {
        updateThemeControlsUI();
        return;
    }

    let storedSetting = null;
    try {
        storedSetting = localStorage.getItem(THEME_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to access stored theme preference', error);
    }

    const initialSetting = VALID_THEME_SETTINGS.has(storedSetting) ? storedSetting : 'system';

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemChange = () => {
            if (themeSetting === 'system') {
                applyThemeSetting('system', { persist: false });
            }
        };
        if (typeof themeMediaQuery.addEventListener === 'function') {
            themeMediaQuery.addEventListener('change', handleSystemChange);
        } else if (typeof themeMediaQuery.addListener === 'function') {
            themeMediaQuery.addListener(handleSystemChange);
        }
    }

    initializeThemeControls();
    themeInitialized = true;
    applyThemeSetting(initialSetting, { persist: false });
}

function handleSessionExpired() {
    if (sessionExpiredNotified) return;
    sessionExpiredNotified = true;
    alert('Your session has expired. Please sign in again.');
    window.location.replace('/');
}

function mapDtoToActivity(dto) {
    const learningOutcomes = Array.isArray(dto.learning_outcomes)
        ? dto.learning_outcomes
        : Array.isArray(dto.learningOutcomes)
            ? dto.learningOutcomes
            : [];
    const totalHours = Number.isFinite(dto.total_hours)
        ? dto.total_hours
        : Number.isFinite(dto.totalHours)
            ? dto.totalHours
            : Number.isFinite(dto.hours)
                ? dto.hours
                : 0;
    const startDate = dto.startDate || dto.start_date || dto.date_general || dto.dateGeneral || null;
    const dateGeneral = startDate || null;
    const endDate = dto.endDate || dto.end_date || null;
    const challengeDescription = dto.challenge_description || dto.challengeDescription || '';
    const rating = toOptionalPositiveNumber(dto.rating ?? dto.enjoyment_rating);
    const difficulty = toFiniteNumber(dto.difficulty ?? dto.difficulty_score);

    return {
        id: dto.id,
        title: dto.title,
        description: dto.description || '',
        category: dto.category,
        status: dto.status,
        dateGeneral,
        startDate,
        endDate,
        totalHours,
        challengeDescription,
        learningOutcomes,
        rating,
        difficulty,
        headerImage: dto.headerImageUrl,
        headerImagePath: dto.headerImagePath,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
        assets: Array.isArray(dto.assets) ? dto.assets : []
    };
}

async function parseApiError(response) {
    try {
        const payload = await response.json();
        if (payload && typeof payload.error === 'string') {
            return payload.details ? `${payload.error}: ${payload.details}` : payload.error;
        }
    } catch (parseError) {
        console.warn('Failed to parse API error payload', parseError);
    }
    return response.statusText || 'Request failed';
}

async function hydrateActivitiesFromServer({ force = false, silent = false } = {}) {
    if (activitiesSyncPromise && !force) {
        return activitiesSyncPromise;
    }

    activitiesSyncPromise = (async () => {
        try {
            const response = await fetch('/api/activities', {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { Accept: 'application/json' }
            });

            if (response.status === 401) {
                handleSessionExpired();
                return;
            }

            if (!response.ok) {
                throw new Error(await parseApiError(response));
            }

            const payload = await response.json();
            if (payload && Array.isArray(payload.activities)) {
                currentActivities = payload.activities.map(mapDtoToActivity);
                saveData();
            }
        } catch (error) {
            if (!silent) {
                console.error('Failed to load activities from Supabase', error);
            }
            throw error;
        } finally {
            activitiesSyncPromise = null;
        }
    })();

    return activitiesSyncPromise;
}

function rerenderActivityViews() {
    renderActivitiesGrid();
    renderTimeline();
    renderHeroStats();
    renderCategoriesGrid();
    renderProgressDashboard();
    renderGallery();
    renderActivityHeatmap();
}

// Persist the latest activities and reflections to localStorage, warning the user if the write fails
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(currentActivities));
        localStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(currentReflections));
    } catch (error) {
        console.error('Error saving data to localStorage:', error);
        alert('There was an error saving your data. Please try again.');
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
let selectedHeaderImageUrl = null;

function toEmbeddableImageUrl(url) {
    const trimmed = typeof url === 'string' ? url.trim() : '';
    if (!trimmed) {
        return trimmed;
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(trimmed);
    } catch (_error) {
        return trimmed;
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (host === 'drive.google.com' || host === 'docs.google.com') {
        const fileMatch = parsedUrl.pathname.match(/\/file\/d\/([^/]+)/);
        let imageId = fileMatch ? fileMatch[1] : null;

        if (!imageId) {
            imageId = parsedUrl.searchParams.get('id') || parsedUrl.searchParams.get('docid');
        }

        if (imageId) {
            // Use Googleusercontent CDN so the image can load cross-origin without Drive's HTML shell.
            const safeId = encodeURIComponent(imageId);
            const googleContentCdnUrl = `https://lh3.googleusercontent.com/d/${safeId}=s0`;
            return googleContentCdnUrl;
        }
    }

    return trimmed;
}

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

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getLearningOutcomeDisplay(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
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

// Utility functions
const DATE_FALLBACK_LABEL = 'Date TBD';
const SHORT_DATE_OPTIONS = { year: 'numeric', month: 'short' };
const FULL_DATE_OPTIONS = { year: 'numeric', month: 'long', day: 'numeric' };

function parseDateString(value) {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(date) {
    return date.toLocaleDateString('en-US', SHORT_DATE_OPTIONS);
}

function formatLongDate(date) {
    return date.toLocaleDateString('en-US', FULL_DATE_OPTIONS);
}

function formatDate(dateString) {
    const date = parseDateString(dateString);
    if (!date) {
        return DATE_FALLBACK_LABEL;
    }
    return formatShortDate(date);
}

function formatFullDate(dateString) {
    const date = parseDateString(dateString);
    if (!date) {
        return DATE_FALLBACK_LABEL;
    }
    return formatLongDate(date);
}

function formatDateRange(start, end) {
    const startDate = parseDateString(start);
    const endDate = parseDateString(end);

    if (startDate && endDate) {
        const sameDay = startDate.toISOString().slice(0, 10) === endDate.toISOString().slice(0, 10);
        if (sameDay) {
            return formatShortDate(startDate);
        }
        return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`;
    }

    if (startDate) {
        return formatShortDate(startDate);
    }

    if (endDate) {
        return `Ends ${formatShortDate(endDate)}`;
    }

    return DATE_FALLBACK_LABEL;
}

function formatFullDateRange(start, end) {
    const startDate = parseDateString(start);
    const endDate = parseDateString(end);

    if (startDate && endDate) {
        const sameDay = startDate.toISOString().slice(0, 10) === endDate.toISOString().slice(0, 10);
        if (sameDay) {
            return formatLongDate(startDate);
        }
        return `${formatLongDate(startDate)} – ${formatLongDate(endDate)}`;
    }

    if (startDate) {
        return formatLongDate(startDate);
    }

    if (endDate) {
        return `Ends ${formatLongDate(endDate)}`;
    }

    return DATE_FALLBACK_LABEL;
}

function getActivityStartDate(activity) {
    if (!activity) {
        return null;
    }
    return activity.dateGeneral || activity.startDate || null;
}

function getActivityEndDate(activity) {
    if (!activity) {
        return null;
    }
    return activity.endDate || null;
}

function formatActivityDateSummary(activity) {
    return formatDateRange(getActivityStartDate(activity), getActivityEndDate(activity));
}

function formatActivityDateDetail(activity) {
    return formatFullDateRange(getActivityStartDate(activity), getActivityEndDate(activity));
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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Derived statistics shown in the hero counters and progress dashboard
function calculateStats() {
    const totalActivities = currentActivities.length;
    const totalHours = currentActivities.reduce((sum, activity) => sum + (activity.totalHours || 0), 0);
    const totalReflections = currentReflections.length;

    const categoryStats = {
        creativity: {
            count: currentActivities.filter(a => a.category === 'creativity').length,
            hours: currentActivities.filter(a => a.category === 'creativity').reduce((sum, a) => sum + (a.totalHours || 0), 0)
        },
        activity: {
            count: currentActivities.filter(a => a.category === 'activity').length,
            hours: currentActivities.filter(a => a.category === 'activity').reduce((sum, a) => sum + (a.totalHours || 0), 0)
        },
        service: {
            count: currentActivities.filter(a => a.category === 'service').length,
            hours: currentActivities.filter(a => a.category === 'service').reduce((sum, a) => sum + (a.totalHours || 0), 0)
        }
    };

    const ratingValues = currentActivities
        .map((activity) => Number(activity.rating))
        .filter((value) => Number.isFinite(value) && value > 0);
    const difficultyValues = currentActivities
        .map((activity) => Number(activity.difficulty))
        .filter((value) => Number.isFinite(value));

    const averageRating = ratingValues.length > 0
        ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
        : null;
    const averageDifficulty = difficultyValues.length > 0
        ? difficultyValues.reduce((sum, value) => sum + value, 0) / difficultyValues.length
        : null;

    return {
        totalActivities,
        totalHours,
        totalReflections,
        categoryStats,
        averageRating,
        averageDifficulty
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
    setPrintMode(true);
    setTimeout(() => {
        window.print();
    }, 0);
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

if (typeof window !== 'undefined') {
    window.addEventListener('beforeprint', () => setPrintMode(true));
    window.addEventListener('afterprint', () => setPrintMode(false));

    if (typeof window.matchMedia === 'function') {
        const mediaQueryList = window.matchMedia('print');
        if (mediaQueryList) {
            const handleMediaQueryChange = (mql) => {
                setPrintMode(mql.matches);
            };

            if (typeof mediaQueryList.addEventListener === 'function') {
                mediaQueryList.addEventListener('change', handleMediaQueryChange);
            } else if (typeof mediaQueryList.addListener === 'function') {
                mediaQueryList.addListener(handleMediaQueryChange);
            }
        }
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
    const activityDates = currentActivities
        .map((activity) => new Date(activity.dateGeneral))
        .filter((date) => !isNaN(date));

    if (activityDates.length === 0) return 0;

    const minDate = new Date(Math.min.apply(null, activityDates));
    const maxDate = new Date(Math.max.apply(null, activityDates));
    const years = maxDate.getFullYear() - minDate.getFullYear();
    const months = maxDate.getMonth() - minDate.getMonth();
    const total = years * 12 + months;
    return Math.max(1, total + 1);
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
    if (!container || !emptyState) {
        return;
    }
    const visibleActivities = isPrinting ? currentActivities : currentActivities.slice(0, 3);

    if (visibleActivities.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = visibleActivities.map(activity => renderActivityCard(activity)).join('');
}

function renderActivityCard(activity) {
    const statusClass = activity.status === 'completed' ? 'status-completed' : 'status-ongoing';
    const headerImage = activity.headerImage ? 
        `<div class="activity-header-image" style="background-image: url('${activity.headerImage}');"></div>` : 
        '';
        
    return `
        <div class="activity-card" data-category="${activity.category}" data-testid="activity-card-${activity.id}" onclick="viewActivityDetail('${activity.id}')">
            ${headerImage}
            <div class="activity-card-content">
                <div class="activity-card-header">
                    <h3 class="activity-title" data-testid="activity-title">${activity.title}</h3>
                    <span class="badge ${getCategoryColor(activity.category)}" data-testid="badge-${activity.category}-${activity.id}">
                        ${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                    </span>
                    <span class="activity-date" data-testid="text-date-${activity.id}">${formatActivityDateSummary(activity)}</span>
                </div>
                <p class="activity-description" data-testid="text-description-${activity.id}">${activity.description}</p>
                <div class="activity-footer">
                    <span class="activity-hours" data-testid="text-hours-${activity.id}">${activity.totalHours} hours</span>
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
    if (!container || !emptyState) {
        return;
    }
    const timelineActivities = isPrinting ? currentActivities : currentActivities.slice(0, 3);
    
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
                    <span class="activity-date" data-testid="text-timeline-date-${activity.id}">${formatActivityDateSummary(activity)}</span>
                </div>
                <div class="timeline-meta">
                    <span class="badge ${getCategoryColor(activity.category)}" data-testid="badge-timeline-${activity.category}-${activity.id}">
                        ${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                    </span>
                    <span class="activity-hours" data-testid="text-timeline-hours-${activity.id}">${activity.totalHours} hours</span>
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

    renderExperienceMetrics(stats);
}

function renderExperienceMetrics(stats) {
    const ratingDisplay = document.getElementById('average-rating-display');
    const difficultyDisplay = document.getElementById('average-difficulty-display');

    if (ratingDisplay) {
        if (Number.isFinite(stats.averageRating) && stats.averageRating > 0) {
            const rounded = Math.round(stats.averageRating * 10) / 10;
            const filledStars = Math.round(stats.averageRating);
            const starsMarkup = Array.from({ length: 5 }).map((_, index) => {
                const active = index < filledStars;
                return `<i class="fas fa-star${active ? '' : ' inactive'}"></i>`;
            }).join('');
            ratingDisplay.innerHTML = `
                <div class="rating-box rating-box--stars" aria-hidden="true">
                    ${starsMarkup}
                </div>
                <div class="rating-box rating-box--score">
                    <span class="rating-score">${rounded.toFixed(1).replace(/\\.0$/, '')}</span>
                    <span class="rating-max">out of 5</span>
                </div>
            `;
            ratingDisplay.setAttribute('role', 'group');
            ratingDisplay.setAttribute('aria-label', `Average enjoyment rating ${rounded} out of 5`);
            ratingDisplay.title = `Average enjoyment rating ${rounded}/5`;
        } else {
            ratingDisplay.innerHTML = '<span class="rating-empty">–</span>';
            ratingDisplay.removeAttribute('role');
            ratingDisplay.removeAttribute('title');
            ratingDisplay.removeAttribute('aria-label');
        }
    }

    if (difficultyDisplay) {
        if (Number.isFinite(stats.averageDifficulty)) {
            difficultyDisplay.textContent = (Math.round(stats.averageDifficulty * 10) / 10).toString();
        } else {
            difficultyDisplay.textContent = '–';
        }
    }

    renderDifficultyTrendChart();
}

function renderDifficultyTrendChart() {
    const chart = document.getElementById('difficulty-trend-chart');
    const timestampContainer = document.getElementById('difficulty-trend-timestamps');
    if (!chart) return;

    const dataPoints = currentActivities
        .filter((activity) => Number.isFinite(activity.difficulty) && activity.dateGeneral)
        .sort((a, b) => new Date(a.dateGeneral) - new Date(b.dateGeneral));

    if (dataPoints.length === 0) {
        chart.innerHTML = '';
        chart.setAttribute('aria-hidden', 'true');
        if (timestampContainer) {
            timestampContainer.innerHTML = '';
            timestampContainer.setAttribute('aria-hidden', 'true');
        }
        return;
    }

    const width = 320;
    const height = 80;
    const minDifficulty = 1;
    const maxDifficulty = 10;
    const stepX = dataPoints.length > 1 ? width / (dataPoints.length - 1) : 0;
    const LABEL_WIDTH = 48;
    const LABEL_HEIGHT = 18;
    const LABEL_OFFSET = 12;

    chart.style.overflow = 'visible';
    chart.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const points = dataPoints.map((activity, index) => {
        const x = dataPoints.length === 1 ? width / 2 : index * stepX;
        const normalized = (activity.difficulty - minDifficulty) / (maxDifficulty - minDifficulty);
        const y = height - (normalized * height);
        return `${x},${y}`;
    });

    const areaPoints = `${points.join(' ')} ${width},${height} 0,${height}`;
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', 'Average difficulty trend');
    chart.setAttribute('aria-hidden', 'false');

    const markerGroups = dataPoints.map((activity, index) => {
        const date = parseDateString(activity.dateGeneral);
        const formattedDate = date ? formatShortDate(date) : DATE_FALLBACK_LABEL;
        const x = dataPoints.length === 1 ? width / 2 : index * stepX;
        const normalized = (activity.difficulty - minDifficulty) / (maxDifficulty - minDifficulty);
        const y = height - (normalized * height);
        const label = `${Math.round(activity.difficulty)}/10`;
        const rectX = -(LABEL_WIDTH / 2);
        const rectY = -LABEL_HEIGHT - LABEL_OFFSET;
        const textY = rectY + LABEL_HEIGHT / 2 + 0.5;

        return `
            <g class="trend-marker" transform="translate(${x.toFixed(2)}, ${y.toFixed(2)})" tabindex="0" aria-label="Difficulty ${label} recorded ${formattedDate}">
                <circle r="4" style="fill: rgba(var(--primary-rgb), 0.9); stroke: rgba(var(--primary-rgb), 0.25); stroke-width: 1.5; vector-effect: non-scaling-stroke;"></circle>
                <g class="trend-label">
                    <rect x="${rectX.toFixed(2)}" y="${rectY.toFixed(2)}" width="${LABEL_WIDTH}" height="${LABEL_HEIGHT}" rx="5"></rect>
                    <text x="0" y="${textY.toFixed(2)}" text-anchor="middle" dominant-baseline="middle"
                        aria-hidden="true">${label}</text>
                </g>
            </g>
        `;
    });

    if (timestampContainer) {
        const lastIndex = dataPoints.length - 1;
        const middleIndex = Math.round(lastIndex / 2);
        const indices = Array.from(new Set([0, middleIndex, lastIndex])).sort((a, b) => a - b);

        const timestampMarkup = indices
            .map((idx) => {
                const point = dataPoints[idx];
                const date = parseDateString(point.dateGeneral);
                const display = date ? formatShortDate(date) : DATE_FALLBACK_LABEL;
                return `<span>${display}</span>`;
            })
            .join('');

        timestampContainer.innerHTML = timestampMarkup;
        timestampContainer.setAttribute('aria-hidden', 'false');
    }

    chart.innerHTML = `
        <polygon points="${areaPoints}" fill="rgba(var(--primary-rgb), 0.1)"></polygon>
        <polyline points="${points.join(' ')}" fill="none" stroke="rgba(var(--primary-rgb), 0.85)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" shape-rendering="geometricPrecision" vector-effect="non-scaling-stroke"></polyline>
        ${markerGroups.join('')}
    `;
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
        const headerImage = activity.headerImage ?
            `<div class="activity-image" style="background-image: url('${activity.headerImage}');"></div>` :
            `<div class="activity-image" style="background-color: #f0f0f0; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-image" style="font-size: 2rem; color: #ccc;"></i>
            </div>`;

        return `
        <div class="gallery-card" data-testid="gallery-item-${activity.id}">
            <div class="gallery-card-clickable" onclick="viewActivityDetail('${activity.id}')">
                ${headerImage}
                <div class="gallery-content">
                    <div class="gallery-header">
                        <span class="badge ${getCategoryColor(activity.category)}" data-testid="badge-gallery-${activity.category}-${activity.id}">
                            ${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}
                        </span>
                        <span class="gallery-date" data-testid="text-gallery-date-${activity.id}">${formatActivityDateSummary(activity)}</span>
                    </div>
                    <h4 class="gallery-title" data-testid="text-gallery-title-${activity.id}">${activity.title}</h4>
                    <p class="gallery-description" data-testid="text-gallery-desc-${activity.id}">${activity.description.substring(0, 80)}${activity.description.length > 80 ? '...' : ''}</p>
                    <div class="gallery-footer">
                        <span class="gallery-hours" data-testid="text-gallery-hours-${activity.id}">${activity.totalHours} hours</span>
                        <span class="gallery-status ${activity.status}" data-testid="badge-status-${activity.status}-${activity.id}">${activity.status}</span>
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
}

function getActivitiesGroupedByDate() {
    return currentActivities.reduce((acc, activity) => {
        if (!activity.dateGeneral) {
            return acc;
        }
        const parsed = new Date(activity.dateGeneral);
        if (isNaN(parsed)) {
            return acc;
        }
        const iso = parsed.toISOString().split('T')[0];
        if (!acc[iso]) {
            acc[iso] = [];
        }
        acc[iso].push(activity);
        return acc;
    }, {});
}

function formatWeekRange(start, end) {
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: start.getFullYear() === end.getFullYear() ? undefined : 'numeric' });
    const yearLabel = end.getFullYear();
    return `${startLabel} – ${endLabel}, ${yearLabel}`;
}

function loadHeatmapSettings() {
    try {
        const stored = localStorage.getItem(HEATMAP_SETTINGS_KEY);
        if (!stored) {
            return {
                range: DEFAULT_HEATMAP_SETTINGS.range,
                categories: { ...DEFAULT_HEATMAP_SETTINGS.categories }
            };
        }
        const parsed = JSON.parse(stored);
        const settings = {
            range: HEATMAP_RANGE_OPTIONS[parsed?.range] ? parsed.range : DEFAULT_HEATMAP_SETTINGS.range,
            categories: { ...DEFAULT_HEATMAP_SETTINGS.categories }
        };
        if (parsed && typeof parsed.categories === 'object') {
            Object.keys(settings.categories).forEach((category) => {
                if (typeof parsed.categories[category] === 'boolean') {
                    settings.categories[category] = parsed.categories[category];
                }
            });
        }
        return settings;
    } catch (error) {
        console.warn('Unable to read heatmap settings', error);
        return {
            range: DEFAULT_HEATMAP_SETTINGS.range,
            categories: { ...DEFAULT_HEATMAP_SETTINGS.categories }
        };
    }
}

function persistHeatmapSettings() {
    try {
        localStorage.setItem(HEATMAP_SETTINGS_KEY, JSON.stringify(heatmapSettings));
    } catch (error) {
        console.warn('Unable to persist heatmap settings', error);
    }
}

function alignDateToWeekStart(date) {
    const aligned = new Date(date);
    aligned.setHours(0, 0, 0, 0);
    aligned.setDate(aligned.getDate() - aligned.getDay());
    return aligned;
}

function alignDateToWeekEnd(date) {
    const aligned = new Date(date);
    aligned.setHours(0, 0, 0, 0);
    aligned.setDate(aligned.getDate() + (6 - aligned.getDay()));
    return aligned;
}

function getHeatmapRangeBounds(rangeKey) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const option = HEATMAP_RANGE_OPTIONS[rangeKey] || HEATMAP_RANGE_OPTIONS[DEFAULT_HEATMAP_SETTINGS.range];
    let start = new Date(today);
    if (!option || option.days === null) {
        start = new Date(today.getFullYear(), 0, 1);
    } else {
        start.setDate(today.getDate() - option.days + 1);
    }
    return {
        start: alignDateToWeekStart(start),
        end: alignDateToWeekEnd(today)
    };
}

function formatHours(hours) {
    const value = Number(hours) || 0;
    if (value === 0) {
        return '0 hours';
    }
    const rounded = Math.round(value * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 0.1) {
        const whole = Math.round(rounded);
        return `${whole} ${whole === 1 ? 'hour' : 'hours'}`;
    }
    return `${rounded} hours`;
}

function updateHeatmapControlsUI() {
    const rangeSelect = document.getElementById('heatmap-range');
    if (rangeSelect && HEATMAP_RANGE_OPTIONS[heatmapSettings.range]) {
        rangeSelect.value = heatmapSettings.range;
        updateSelectControlVisualState(rangeSelect);
    }
    document.querySelectorAll('[data-heatmap-category]').forEach((button) => {
        const category = button.dataset.heatmapCategory;
        const active = Boolean(heatmapSettings.categories[category]);
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function renderActivityHeatmap(groupedActivities = getActivitiesGroupedByDate()) {
    const heatmap = document.getElementById('activity-heatmap');
    const emptyState = document.getElementById('activity-heatmap-empty');
    if (!heatmap || !emptyState) {
        return;
    }

    updateHeatmapControlsUI();

    const selectedCategories = Object.entries(heatmapSettings.categories)
        .filter(([, enabled]) => enabled)
        .map(([category]) => category);

    const emptyMessage = emptyState.querySelector('p');

    if (selectedCategories.length === 0) {
        heatmap.innerHTML = '';
        emptyState.hidden = false;
        if (emptyMessage) {
            emptyMessage.textContent = 'Select at least one category to see the heatmap.';
        }
        return;
    }

    const bounds = getHeatmapRangeBounds(heatmapSettings.range);
    const start = bounds.start;
    const end = bounds.end;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const totalDays = Math.round((end - start) / MS_PER_DAY) + 1;

    const dayData = [];

    for (let index = 0; index < totalDays; index += 1) {
        const cellDate = new Date(start);
        cellDate.setDate(start.getDate() + index);
        const iso = cellDate.toISOString().split('T')[0];
        const events = (groupedActivities[iso] || []).filter((event) => selectedCategories.includes(event.category));
        const totalHours = events.reduce((sum, event) => sum + (Number(event.totalHours) || 0), 0);
        const totalCount = events.length;
        const categoryHours = { creativity: 0, activity: 0, service: 0 };
        const categoryCounts = { creativity: 0, activity: 0, service: 0 };

        events.forEach((event) => {
            const category = event.category;
            const hours = Number(event.totalHours) || 0;
            if (categoryHours[category] !== undefined) {
                categoryHours[category] += hours;
                categoryCounts[category] += 1;
            }
        });

        dayData.push({ date: cellDate, iso, totalCount, totalHours, categoryHours, categoryCounts });
    }

    const totalWeeks = 52;
    heatmap.style.setProperty('--heatmap-columns', totalWeeks.toString());

    const maxCells = totalWeeks * 7;
    const effectiveDayData = maxCells < dayData.length ? dayData.slice(-maxCells) : dayData;
    const trimmedStart = new Date(start);
    if (dayData.length > effectiveDayData.length) {
        trimmedStart.setDate(start.getDate() + (dayData.length - effectiveDayData.length));
    }

    const fragments = effectiveDayData.map((entry) => {
        const { date, iso, totalCount, totalHours, categoryHours, categoryCounts } = entry;
        let level = 0;
        if (totalCount > 0) {
            if (totalHours >= 3) {
                level = 3;
            } else if (totalHours > 1) {
                level = 2;
            } else if (totalHours > 0) {
                level = 1;
            }
        }

        const dominantCategory = totalCount > 0
            ? Object.keys(categoryHours).sort((a, b) => categoryHours[b] - categoryHours[a])[0]
            : '';

        const dateLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        let tooltip = `${dateLabel}: `;
        if (totalCount === 0) {
            tooltip += 'No CAS activity logged';
        } else {
            tooltip += `${totalCount} ${totalCount === 1 ? 'activity' : 'activities'}, ${formatHours(totalHours)}`;
            const breakdownParts = Object.keys(categoryCounts)
                .filter((category) => categoryCounts[category] > 0)
                .map((category) => {
                    const count = categoryCounts[category];
                    const hours = categoryHours[category];
                    const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
                    return `${categoryLabel}: ${count} ${count === 1 ? 'activity' : 'activities'}${hours > 0 ? `, ${formatHours(hours)}` : ''}`;
                });
            if (breakdownParts.length > 0) {
                tooltip += ` (${breakdownParts.join('; ')})`;
            }
        }

        const classes = ['heatmap-cell'];
        if (level > 0) {
            classes.push(`level-${level}`);
        } else {
            classes.push('level-0');
        }
        if (dominantCategory && totalCount > 0) {
            classes.push(dominantCategory);
        }

        const cellTooltip = escapeHtml(tooltip);
        const tabIndex = totalCount > 0 ? '0' : '-1';

        return `<div class="${classes.join(' ')}" data-date="${iso}" data-tooltip="${cellTooltip}" role="gridcell" aria-label="${cellTooltip}" title="${cellTooltip}" tabindex="${tabIndex}"></div>`;
    });

    const monthEntries = [];
    let trackedMonth = '';
    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
        const weekDate = new Date(trimmedStart);
        weekDate.setDate(trimmedStart.getDate() + weekIndex * 7);
        const monthLabel = weekDate.toLocaleString(undefined, { month: 'short' });
        if (trackedMonth !== monthLabel) {
            monthEntries.push({ label: monthLabel, column: weekIndex + 1 });
            trackedMonth = monthLabel;
        }
    }

    const monthMarkup = monthEntries.map(({ label, column }) => `<span style="grid-column:${column};">${label}</span>`).join('');
    const weekdayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    const weekdayMarkup = weekdayLabels.map((label) => `<span>${label}</span>`).join('');

    const gridMarkup = `
        <div class="heatmap-month-labels" aria-hidden="true">${monthMarkup}</div>
        <div class="heatmap-body-grid">
            <div class="heatmap-weekdays" aria-hidden="true">${weekdayMarkup}</div>
            <div class="calendar-heatmap" role="grid">${fragments.join('')}</div>
        </div>
    `;

    heatmap.innerHTML = gridMarkup;
    heatmap.removeAttribute('aria-label');
    const calendarGrid = heatmap.querySelector('.calendar-heatmap');
    const hasEntriesForSelection = effectiveDayData.some((entry) => entry.totalCount > 0);
    if (emptyMessage) {
        emptyMessage.textContent = hasEntriesForSelection
            ? 'No CAS activity matches the selected filters yet.'
            : 'No CAS activity logged for these categories yet.';
    }
    emptyState.hidden = hasEntriesForSelection;

    const rangeLabel = HEATMAP_RANGE_OPTIONS[heatmapSettings.range]?.label
        || HEATMAP_RANGE_OPTIONS[DEFAULT_HEATMAP_SETTINGS.range].label;
    const categoryLabel = selectedCategories.map((category) => category.charAt(0).toUpperCase() + category.slice(1)).join(', ');
    if (calendarGrid) {
        calendarGrid.setAttribute(
            'aria-label',
            `CAS activity heatmap for ${rangeLabel} across ${categoryLabel || 'selected categories'}. Color intensity indicates days with 1 hour, 2 hours, or 3 or more hours of logged activity.`
        );
    }
}

function setHeatmapRange(range) {
    const nextRange = HEATMAP_RANGE_OPTIONS[range] ? range : DEFAULT_HEATMAP_SETTINGS.range;
    if (heatmapSettings.range === nextRange) {
        updateHeatmapControlsUI();
        return;
    }

    heatmapSettings.range = nextRange;
    persistHeatmapSettings();
    updateHeatmapControlsUI();
    renderActivityHeatmap();
}

function toggleHeatmapCategory(category) {
    if (!Object.prototype.hasOwnProperty.call(heatmapSettings.categories, category)) {
        return;
    }
    heatmapSettings.categories[category] = !Boolean(heatmapSettings.categories[category]);
    persistHeatmapSettings();
    updateHeatmapControlsUI();
    renderActivityHeatmap();
}

function initializeHeatmapControls() {
    const rangeSelect = document.getElementById('heatmap-range');
    if (rangeSelect) {
        const currentRange = HEATMAP_RANGE_OPTIONS[heatmapSettings.range] ? heatmapSettings.range : DEFAULT_HEATMAP_SETTINGS.range;
        rangeSelect.value = currentRange;
        updateSelectControlVisualState(rangeSelect);
        if (rangeSelect.dataset.heatmapBound !== '1') {
            rangeSelect.dataset.heatmapBound = '1';
            rangeSelect.addEventListener('change', (event) => {
                setHeatmapRange(event.target.value);
            });
        }
    }

    const categoryContainer = document.getElementById('heatmap-category-filters');
    if (categoryContainer) {
        categoryContainer.querySelectorAll('[data-heatmap-category]').forEach((button) => {
            if (button.dataset.heatmapBound === '1') {
                return;
            }
            button.dataset.heatmapBound = '1';
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const category = button.dataset.heatmapCategory;
                if (!category) {
                    return;
                }
                toggleHeatmapCategory(category);
            });
        });
    }

    updateHeatmapControlsUI();
}

// Filter functions
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
    
    selectedHeaderImageUrl = null;

    if (activityId) {
        // Edit mode
        currentActivityId = activityId;
        const activity = currentActivities.find(a => a.id === activityId);
        if (activity) {
            // Populate form with activity data
            form.elements['title'].value = activity.title || '';
            form.elements['category'].value = activity.category || '';
            form.elements['description'].value = activity.description || '';
            if (form.elements['dateGeneral']) {
                form.elements['dateGeneral'].value = activity.dateGeneral || '';
            }
            if (form.elements['endDate']) {
                form.elements['endDate'].value = activity.endDate || '';
            }
            if (form.elements['totalHours']) {
                form.elements['totalHours'].value = activity.totalHours || '';
            }
            if (form.elements['challengeDescription']) {
                form.elements['challengeDescription'].value = activity.challengeDescription || '';
            }
            form.elements['status'].value = activity.status || 'ongoing';

            setLearningOutcomeSelections(activity.learningOutcomes);
            setRating(activity.rating || 0);
            setDifficultyValue(activity.difficulty || 5);

            // Set image preview if exists
            const imagePreview = document.getElementById('image-preview');
            const imagePreviewImg = document.getElementById('image-preview-img');
            if (activity.headerImage) {
                imagePreviewImg.src = activity.headerImage;
                imagePreview.style.display = 'block';
            } else {
                imagePreview.style.display = 'none';
            }

            
            title.textContent = 'Edit Activity';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Activity';
        }
    } else {
        // New activity mode
        currentActivityId = null;
        form.reset();
        if (form.elements['endDate']) {
            form.elements['endDate'].value = '';
        }
        setLearningOutcomeSelections([]);
        setRating(0);
        setDifficultyValue(5);
        document.getElementById('image-preview').style.display = 'none';
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

function initializePortfolioPopUp() {
    const welcomeModal = document.getElementById('welcome-popup');
    const startSetupBtn = document.getElementById('start-setup-btn');
    const onboardingModal = document.getElementById('portfolio-onboarding-modal');
    
    if (!welcomeModal || !startSetupBtn || !onboardingModal) return;
    
    // Check if user has seen the welcome popup before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    const onboardingState = getPortfolioOnboardingState();
    
    // Show welcome popup if it's the first visit and onboarding isn't completed
    if (!hasSeenWelcome && !onboardingState.completed) {
        welcomeModal.classList.add('show');
        welcomeModal.setAttribute('aria-hidden', 'false');
        lockBodyScroll();
    }
    
    // Handle the Get Started button click
    startSetupBtn.addEventListener('click', () => {
        welcomeModal.classList.remove('show');
        welcomeModal.setAttribute('aria-hidden', 'true');
        unlockBodyScroll();
        
        // Mark as seen
        localStorage.setItem('hasSeenWelcome', 'true');
        
        // Show the onboarding form
        onboardingModal.classList.add('show');
        onboardingModal.setAttribute('aria-hidden', 'false');
        lockBodyScroll();
        
        // Focus the first input in the onboarding form
        const firstInput = document.querySelector('#portfolio-onboarding-form input, #portfolio-onboarding-form select, #portfolio-onboarding-form textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    });
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
    setLearningOutcomeSelections([]);
    setRating(0);
    setDifficultyValue(5);
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

function renderLearningOutcomes() {
    const container = document.getElementById('learning-outcomes-list');
    if (!container) return;

    if (!learningOutcomes.length) {
        container.innerHTML = '<p class="learning-outcomes-empty">No learning outcomes selected yet.</p>';
        return;
    }

    const fragments = learningOutcomes.slice(0, MAX_LEARNING_OUTCOMES).map((value) => {
        const normalized = typeof value === 'string' ? value.trim() : '';
        if (!normalized) {
            return '';
        }

        const display = getLearningOutcomeDisplay(normalized);
        if (!display.label) {
            return '';
        }

        const safeLabel = escapeHtml(display.label);
        const safeAria = escapeHtml(display.aria || display.label);
        const safeValue = escapeHtml(normalized);
        return `<span class="learning-outcome-tag" role="listitem" data-outcome-value="${safeValue}">
                <span>${safeLabel}</span>
                <button type="button" aria-label="Remove ${safeAria}" data-remove-outcome="${safeValue}">&times;</button>
            </span>`;
    }).filter(Boolean);

    container.innerHTML = fragments.join('');
}

function toggleCustomOutcomeInput(visible) {
    const wrapper = document.getElementById('custom-outcome-wrapper');
    if (!wrapper) return;
    wrapper.hidden = !visible;
    if (!visible) {
        const input = wrapper.querySelector('#custom-learning-outcome');
        if (input) {
            input.value = '';
        }
    }
}

function getSelectedPresetValues() {
    const container = document.getElementById('learning-outcomes-options');
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"][data-learning-outcome-option]:not([data-custom-option])'))
        .filter((input) => input.checked)
        .map((input) => input.value);
}

function syncPresetCheckboxes() {
    const container = document.getElementById('learning-outcomes-options');
    if (!container) return;
    const presetValues = new Set(learningOutcomes.filter((value) => PRESET_LEARNING_OUTCOME_VALUES.has(value)));
    container.querySelectorAll('input[type="checkbox"][data-learning-outcome-option]').forEach((input) => {
        if (input.dataset.customOption !== undefined) {
            input.checked = customLearningOutcomes.length > 0;
        } else {
            input.checked = presetValues.has(input.value);
        }
    });
    const customToggle = container.querySelector('input[data-custom-option]');
    const shouldShow = customToggle ? customToggle.checked || customLearningOutcomes.length > 0 : customLearningOutcomes.length > 0;
    toggleCustomOutcomeInput(shouldShow);
}

function updateLearningOutcomesFromControls() {
    const selectedPresets = getSelectedPresetValues();
    learningOutcomes = [...selectedPresets, ...customLearningOutcomes];
    if (learningOutcomes.length > MAX_LEARNING_OUTCOMES) {
        learningOutcomes = learningOutcomes.slice(0, MAX_LEARNING_OUTCOMES);
        customLearningOutcomes = learningOutcomes.filter((value) => !PRESET_LEARNING_OUTCOME_VALUES.has(value));
        syncPresetCheckboxes();
    }
    renderLearningOutcomes();
}

function handleLearningOutcomeOptionChange(event) {
    const target = event.target;
    if (!target || target.type !== 'checkbox') {
        return;
    }

    if (target.dataset.customOption !== undefined) {
        if (!target.checked) {
            customLearningOutcomes = [];
        }
        toggleCustomOutcomeInput(target.checked || customLearningOutcomes.length > 0);
    }

    updateLearningOutcomesFromControls();
}

function addCustomLearningOutcome(value) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return;
    }

    const normalized = trimmed.replace(/\s+/g, ' ');
    const exists = learningOutcomes.some((entry) => entry.toLowerCase() === normalized.toLowerCase());
    if (exists) {
        return;
    }

    customLearningOutcomes.push(normalized);
    const selectedPresets = getSelectedPresetValues();
    learningOutcomes = [...selectedPresets, ...customLearningOutcomes].slice(0, MAX_LEARNING_OUTCOMES);
    customLearningOutcomes = learningOutcomes.filter((entry) => !PRESET_LEARNING_OUTCOME_VALUES.has(entry));

    const container = document.getElementById('learning-outcomes-options');
    const customToggle = container ? container.querySelector('input[data-custom-option]') : null;
    if (customToggle) {
        customToggle.checked = true;
    }
    syncPresetCheckboxes();
    renderLearningOutcomes();
}

function handleAddCustomOutcome() {
    const input = document.getElementById('custom-learning-outcome');
    if (!input) return;
    addCustomLearningOutcome(input.value);
    input.value = '';
    input.focus();
}

function initializeLearningOutcomesForm() {
    const container = document.getElementById('learning-outcomes-options');
    if (!container) return;

    const optionsMarkup = LEARNING_OUTCOME_PRESETS.map((option) => `
        <label class="learning-outcome-option">
            <input
                type="checkbox"
                value="${option.value}"
                data-learning-outcome-option
                aria-label="${option.code}: ${option.label}"
            >
            <span class="learning-outcome-label">
                <span class="learning-outcome-title">${option.label}</span>
            </span>
        </label>
    `).join('');

    const customMarkup = `
        <label class="learning-outcome-option learning-outcome-option--custom">
            <input
                type="checkbox"
                value="__custom__"
                data-learning-outcome-option
                data-custom-option
                aria-label="Custom learning outcomes"
            >
            <span class="learning-outcome-label">
                <span class="learning-outcome-title">Add personalised learning outcomes</span>
            </span>
        </label>
    `;

    container.innerHTML = optionsMarkup + customMarkup;
    container.addEventListener('change', handleLearningOutcomeOptionChange);

    const addButton = document.getElementById('add-custom-learning-outcome');
    const customInput = document.getElementById('custom-learning-outcome');
    const clearButton = document.getElementById('clear-learning-outcomes');
    const list = document.getElementById('learning-outcomes-list');

    if (addButton) {
        addButton.addEventListener('click', (event) => {
            event.preventDefault();
            handleAddCustomOutcome();
        });
    }

    if (customInput) {
        customInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleAddCustomOutcome();
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', (event) => {
            event.preventDefault();
            setLearningOutcomeSelections([]);
        });
    }

    if (list) {
        list.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-remove-outcome]');
            if (!button) return;
            const value = button.dataset.removeOutcome;
            if (!value) return;

            const normalized = value.trim();
            const nextPresets = learningOutcomes.filter((entry) => PRESET_LEARNING_OUTCOME_VALUES.has(entry) && entry !== normalized);
            const nextCustoms = learningOutcomes.filter((entry) => !PRESET_LEARNING_OUTCOME_VALUES.has(entry) && entry !== normalized);
            customLearningOutcomes = nextCustoms;
            learningOutcomes = [...nextPresets, ...customLearningOutcomes];
            syncPresetCheckboxes();
            renderLearningOutcomes();
        });
    }

    renderLearningOutcomes();
}

function setLearningOutcomeSelections(values) {
    const provided = Array.isArray(values) ? values.filter((value) => typeof value === 'string' && value.trim() !== '') : [];
    const presets = provided.filter((value) => PRESET_LEARNING_OUTCOME_VALUES.has(value));
    const customs = provided.filter((value) => !PRESET_LEARNING_OUTCOME_VALUES.has(value)).map((value) => value.trim());
    const allowedCustomCount = Math.max(0, MAX_LEARNING_OUTCOMES - presets.length);
    customLearningOutcomes = customs.slice(0, allowedCustomCount);
    learningOutcomes = [...presets.slice(0, MAX_LEARNING_OUTCOMES), ...customLearningOutcomes].slice(0, MAX_LEARNING_OUTCOMES);
    syncPresetCheckboxes();
    renderLearningOutcomes();
}

function updateRatingStarsDisplay(value) {
    const stars = document.querySelectorAll('#rating-control .rating-star');
    let hasChecked = false;
    stars.forEach((star) => {
        const starValue = Number(star.dataset.value);
        const isActive = starValue <= value;
        const isChecked = starValue === value && value > 0;
        star.classList.toggle('active', isActive);
        star.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        star.setAttribute('aria-checked', isChecked ? 'true' : 'false');
        const shouldReceiveTab = isChecked || (!hasChecked && value === 0 && starValue === 1);
        star.setAttribute('tabindex', shouldReceiveTab ? '0' : '-1');
        if (isChecked || shouldReceiveTab) {
            hasChecked = true;
        }
    });
}

function setRating(value) {
    const ratingInput = document.getElementById('rating-value');
    const sanitized = Math.min(5, Math.max(0, Number(value) || 0));
    if (ratingInput) {
        ratingInput.value = sanitized;
    }
    updateRatingStarsDisplay(sanitized);
}

function initializeRatingControl() {
    const ratingControl = document.getElementById('rating-control');
    if (!ratingControl) return;

    ratingControl.querySelectorAll('.rating-star').forEach((star) => {
        const value = Number(star.dataset.value);
        star.setAttribute('role', 'radio');
        star.setAttribute('aria-pressed', 'false');
        star.setAttribute('aria-checked', 'false');
        star.addEventListener('click', () => {
            setRating(value);
        });
        star.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setRating(value);
            } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                const current = Number(document.getElementById('rating-value')?.value) || 0;
                const nextValue = Math.min(5, (current || 0) + 1);
                setRating(nextValue);
                ratingControl.querySelector(`.rating-star[data-value="${nextValue}"]`)?.focus();
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                const current = Number(document.getElementById('rating-value')?.value) || 0;
                const nextValue = Math.max(1, (current || 1) - 1);
                setRating(nextValue);
                ratingControl.querySelector(`.rating-star[data-value="${nextValue}"]`)?.focus();
            }
        });
    });

    const currentValue = Number(document.getElementById('rating-value')?.value) || 0;
    setRating(currentValue);
}

function setDifficultyValue(value) {
    const input = document.getElementById('difficulty-input');
    const label = document.getElementById('difficulty-value');
    const sanitized = Math.min(10, Math.max(1, Number(value) || 1));
    if (input) {
        input.value = sanitized;
        const min = Number(input.min) || 0;
        const max = Number(input.max) || 100;
        const percent = ((sanitized - min) / (max - min)) * 100;
        input.style.setProperty('--progress-position', `${percent}%`);
        input.setAttribute('aria-valuenow', String(sanitized));
    }
    if (label) label.textContent = sanitized;
}

function initializeDifficultyControl() {
    const input = document.getElementById('difficulty-input');
    if (!input) return;
    const update = () => setDifficultyValue(input.value);
    input.addEventListener('input', update);
    update();
}

// Activity detail view assembles a richer modal with reflections and metadata
function viewActivityDetail(activityId) {
    const activity = currentActivities.find(a => a.id === activityId);
    if (!activity) return;

    const reflections = currentReflections.filter(r => r.activityId === activityId);
    const modal = document.getElementById('activity-detail-modal');
    const content = document.getElementById('activity-detail-content');
    const outcomeLabels = Array.isArray(activity.learningOutcomes)
        ? activity.learningOutcomes
            .map((value) => getLearningOutcomeDisplay(value).label)
            .filter((label) => typeof label === 'string' && label.trim() !== '')
        : [];
    const ratingMarkup = Number.isFinite(activity.rating) && activity.rating > 0
        ? Array.from({ length: 5 }).map((_, index) => `<i class="fas fa-star${index < Math.round(activity.rating) ? '' : ' inactive'}"></i>`).join('')
        : null;

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

                ${activity.challengeDescription ? `
                    <div class="challenge-section">
                        <h3>Challenge Faced</h3>
                        <p data-testid="text-challenge-description">${activity.challengeDescription}</p>
                    </div>
                ` : ''}

                <div class="learning-outcomes-section">
                    <h3>Learning Outcomes</h3>
                    <div class="learning-outcomes-tags">
                        ${outcomeLabels.map((outcome, index) => `
                            <span class="badge" data-testid="badge-outcome-${index}">${escapeHtml(outcome)}</span>
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
                            <p>${activity.endDate ? 'Dates' : 'Date'}</p>
                            <span data-testid="text-start-date">${formatActivityDateDetail(activity)}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <div class="detail-item-content">
                            <p>Total Hours</p>
                            <span data-testid="text-total-hours">${activity.totalHours} hours</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-tag"></i>
                        <div class="detail-item-content">
                            <p>Category</p>
                            <span data-testid="text-category">${activity.category.charAt(0).toUpperCase() + activity.category.slice(1)}</span>
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-star"></i>
                        <div class="detail-item-content">
                            <p>Enjoyment</p>
                            ${ratingMarkup ? `<div class="rating-display" data-testid="text-rating-detail">${ratingMarkup}</div>` : '<span data-testid="text-rating-detail">Not rated</span>'}
                        </div>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-mountain"></i>
                        <div class="detail-item-content">
                            <p>Difficulty</p>
                            <span data-testid="text-difficulty-detail">${Number.isFinite(activity.difficulty) ? `${activity.difficulty}/10` : 'Not recorded'}</span>
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
        const response = await fetch(`/api/activities/${activityId}`, {
            method: 'DELETE',
            credentials: 'same-origin',
            headers: { Accept: 'application/json' }
        });

        if (response.status === 401) {
            handleSessionExpired();
            return;
        }

        if (!response.ok && response.status !== 404) {
            throw new Error(await parseApiError(response));
        }

        currentActivities = currentActivities.filter((activity) => activity.id !== activityId);
        currentReflections = currentReflections.filter((reflection) => reflection.activityId !== activityId);
        saveData();

        await hydrateActivitiesFromServer({ force: true, silent: true }).catch((error) => {
            console.error('Unable to refresh activities after delete', error);
        });

        closeActivityDetail();
        rerenderActivityViews();
        alert('Activity deleted successfully!');
    } catch (error) {
        console.error('Failed to delete activity', error);
        alert(error?.message || 'Failed to delete activity. Please try again.');
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
async function handleActivityFormSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const isEditing = currentActivityId !== null;

    const startDateRaw = form.elements['dateGeneral']?.value || '';
    const endDateRaw = form.elements['endDate']?.value || '';
    const normalizedStartDate = startDateRaw || null;
    const normalizedEndDate = endDateRaw || null;

    if (normalizedStartDate && normalizedEndDate) {
        const startDate = new Date(normalizedStartDate);
        const endDate = new Date(normalizedEndDate);
        if (endDate < startDate) {
            alert('End date cannot be before the start date.');
            return;
        }
    }

    const formValues = {
        title: (form.elements['title']?.value || '').trim(),
        category: form.elements['category']?.value || 'creativity',
        description: (form.elements['description']?.value || '').trim(),
        dateGeneral: normalizedStartDate,
        endDate: normalizedEndDate,
        totalHours: Number.parseFloat(form.elements['totalHours']?.value) || 0,
        status: form.elements['status']?.value || 'draft',
        challengeDescription: (form.elements['challengeDescription']?.value || '').trim(),
        rating: Number.parseInt(form.elements['rating']?.value || form.querySelector('#rating-value')?.value || '0', 10) || 0,
        difficulty: Number.parseInt(form.elements['difficulty']?.value || '5', 10) || 5,
        learningOutcomes: Array.isArray(learningOutcomes) ? [...learningOutcomes] : []
    };

    if (!formValues.title) {
        alert('Activity title is required.');
        return;
    }

    try {
        await saveActivity(formValues, { isEditing });

        form.reset();
        if (form.elements['endDate']) {
            form.elements['endDate'].value = '';
        }
        resetHeaderImageInputs();
        setLearningOutcomeSelections([]);
        setRating(0);
        setDifficultyValue(5);
        closeAddActivityDialog();

        rerenderActivityViews();
        alert(isEditing ? 'Activity updated successfully!' : 'Activity created successfully!');
    } catch (error) {
        console.error('Failed to save activity', error);
        alert(error?.message || 'Failed to save activity. Please try again.');
    }
}

async function saveActivity(values, { isEditing }) {
    const editingId = isEditing ? currentActivityId : null;
    const previousActivity = editingId ? currentActivities.find((activity) => activity.id === editingId) : null;
    const previousHeaderImage = previousActivity?.headerImage || null;

    let headerDescriptor = null;

    if (selectedHeaderImageUrl) {
        headerDescriptor = await uploadHeaderImage(selectedHeaderImageUrl).catch((error) => {
            throw new Error(error?.message || 'Failed to import header image.');
        });
    }

    const payload = {
        title: values.title,
        category: values.category,
        status: values.status,
        description: values.description || null,
        startDate: values.dateGeneral || null,
        endDate: values.endDate || null,
        hours: Number.isFinite(values.totalHours) ? values.totalHours : 0,
        date_general: values.dateGeneral || null,
        total_hours: Number.isFinite(values.totalHours) ? values.totalHours : 0,
        challenge_description: values.challengeDescription || null,
        learning_outcomes: Array.isArray(values.learningOutcomes) ? values.learningOutcomes : [],
        rating: Number.isFinite(values.rating) && values.rating > 0 ? values.rating : null,
        difficulty: Number.isFinite(values.difficulty) ? values.difficulty : null
    };

    const headerImageForLocal = headerDescriptor?.url || previousHeaderImage || null;

    if (headerDescriptor) {
        payload.headerImagePath = headerDescriptor.path;
        payload.headerImageChecksum = headerDescriptor.checksum;
        payload.headerImageUpdatedAt = headerDescriptor.updatedAt;
        payload.headerImageUrl = headerDescriptor.source === 'external' ? headerDescriptor.url : null;
    } else if (!previousActivity?.headerImagePath && typeof previousHeaderImage === 'string' && /^https?:\/\//i.test(previousHeaderImage)) {
        // Preserve existing remote URLs when editing without choosing a new image.
        payload.headerImageUrl = previousHeaderImage;
    }

    const endpoint = isEditing ? `/api/activities/${currentActivityId}` : '/api/activities';
    const method = isEditing ? 'PATCH' : 'POST';

    const response = await fetch(endpoint, {
        method,
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
    });

    if (response.status === 401) {
        handleSessionExpired();
        throw new Error('Authentication required');
    }

    if (!response.ok) {
        throw new Error(await parseApiError(response));
    }

    const body = await response.json();
    const activityId = body?.activity?.id;

    const resolvedId = activityId || editingId;
    if (resolvedId) {
        const normalizedActivity = {
            ...(previousActivity || {}),
            id: resolvedId,
            title: values.title,
            category: values.category,
            status: values.status,
            description: values.description || '',
            dateGeneral: values.dateGeneral || null,
            startDate: values.dateGeneral || null,
            endDate: values.endDate || null,
            totalHours: Number.isFinite(values.totalHours) ? values.totalHours : 0,
            challengeDescription: values.challengeDescription || '',
            learningOutcomes: Array.isArray(values.learningOutcomes) ? [...values.learningOutcomes] : [],
            rating: Number.isFinite(values.rating) && values.rating > 0 ? values.rating : null,
            difficulty: Number.isFinite(values.difficulty) ? values.difficulty : null,
            headerImage: headerImageForLocal,
            headerImagePath: headerDescriptor?.path || previousActivity?.headerImagePath || null,
            updatedAt: new Date().toISOString()
        };

        const targetIndex = currentActivities.findIndex((activity) => activity.id === resolvedId);
        if (targetIndex !== -1) {
            currentActivities[targetIndex] = { ...currentActivities[targetIndex], ...normalizedActivity };
        } else if (!isEditing) {
            normalizedActivity.createdAt = new Date().toISOString();
            currentActivities.push(normalizedActivity);
        }
        saveData();
    }

    await hydrateActivitiesFromServer({ force: true, silent: true }).catch((error) => {
        console.error('Unable to refresh activities after save', error);
    });

    const effectiveHeaderImage = headerImageForLocal;

    if (effectiveHeaderImage && activityId) {
        const targetIndex = currentActivities.findIndex((activity) => activity.id === activityId);
        if (targetIndex !== -1) {
            currentActivities[targetIndex].headerImage = effectiveHeaderImage;
            saveData();
        }
    }

    currentActivityId = null;
    learningOutcomes = [];
    selectedHeaderImageUrl = null;
    return activityId;
}

async function uploadHeaderImage(url) {
    const endpoint = '/api/activities/header-image';
    let response;

    if (typeof url === 'string' && url.trim()) {
        response = await fetch(endpoint, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() }),
        });
    } else {
        throw new Error('No header image provided');
    }

    if (response.status === 401) {
        handleSessionExpired();
        throw new Error('Authentication required');
    }

    if (!response.ok) {
        throw new Error(await parseApiError(response));
    }

    const payload = await response.json();
    if (!payload || !payload.image) {
        throw new Error('Invalid response from header image upload');
    }

    return payload.image;
}

function handleReflectionFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const reflection = {
        id: Date.now().toString(),
        activityId: formData.get('activityId'),
        title: formData.get('title'),
        content: formData.get('content'),
        createdAt: new Date().toISOString()
    };
    
    currentReflections.push(reflection);
    
    // Save to localStorage
    saveData();
    
    // Reset and close form
    form.reset();
    closeAddReflectionDialog();
    
    // Re-render the UI
    renderActivitiesGrid();
    renderTimeline();
    renderProgressDashboard();
    
    closeAddReflectionDialog();
    alert('Reflection created successfully!');
}

// Image URL handler powers the activity header image picker
document.addEventListener('DOMContentLoaded', function() {
    const imageUrlInput = document.getElementById('image-url-input');
    const loadImageUrlBtn = document.getElementById('load-image-url');
    const removeImageBtn = document.getElementById('remove-image');
    const imagePreview = document.getElementById('image-preview');
    const imagePreviewImg = document.getElementById('image-preview-img');

    function showImagePreview(src) {
        if (!imagePreview || !imagePreviewImg) return;
        imagePreviewImg.src = src;
        imagePreview.style.display = 'block';
    }

    function handleImageUrl() {
        if (!imageUrlInput) return;
        const rawValue = imageUrlInput.value || '';
        const normalizedUrl = rawValue.trim();
        if (!normalizedUrl) {
            alert('Please enter an image URL');
            return;
        }

        const finalUrl = toEmbeddableImageUrl(normalizedUrl);

        try {
            new URL(finalUrl);
        } catch (_error) {
            alert('Please enter a valid URL');
            return;
        }

        const img = new Image();
        img.onload = function() {
            showImagePreview(finalUrl);
            selectedHeaderImageUrl = finalUrl;
            imageUrlInput.value = finalUrl;
        };
        img.onerror = function() {
            alert('Could not load image from the provided URL. Please check the URL and try again.');
        };
        img.src = finalUrl;
    }

    if (loadImageUrlBtn) {
        loadImageUrlBtn.addEventListener('click', handleImageUrl);
    }

    if (imageUrlInput) {
        imageUrlInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleImageUrl();
            }
        });
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', resetHeaderImageInputs);
    }
});

function resetHeaderImageInputs() {
    const imagePreview = document.getElementById('image-preview');
    const imagePreviewImg = document.getElementById('image-preview-img');
    const imageUrlInput = document.getElementById('image-url-input');

    if (imagePreview) {
        imagePreview.style.display = 'none';
    }
    if (imagePreviewImg) {
        imagePreviewImg.src = '';
    }
    if (imageUrlInput) {
        imageUrlInput.value = '';
    }

    selectedHeaderImageUrl = null;
}

// Wire up event listeners that cannot be attached inline for accessibility reasons
function initializeEventListeners() {
    // Form submissions
    document.getElementById('add-activity-form').addEventListener('submit', handleActivityFormSubmit);
    document.getElementById('add-reflection-form').addEventListener('submit', handleReflectionFormSubmit);

    initializeLearningOutcomesForm();
    setLearningOutcomeSelections(learningOutcomes);
    initializeRatingControl();
    initializeDifficultyControl();

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

    initializeHeatmapControls();
}

function initializeSelectControls() {
    enhanceSelectControl(document.getElementById('onboarding-portfolio-status'));
    enhanceSelectControl(document.querySelector('[data-testid="select-activity-category"]'));
    enhanceSelectControl(document.querySelector('[data-testid="select-activity-status"]'));
    enhanceSelectControl(document.querySelector('[data-testid="select-reflection-activity"]'));
    enhanceSelectControl(document.getElementById('heatmap-range'));
}

// Kick off the initial render pipeline once the DOM is ready
async function initializeApp() {
    try {
        await hydrateActivitiesFromServer({ silent: true });
    } catch (error) {
        console.warn('Falling back to cached activities', error);
    } finally {
        rerenderActivityViews();
        initializeEventListeners();
        initializePortfolioPopUp();
        initializePortfolioQuestionnaire();
        initializeSelectControls();
        initializeTheme();
    }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch((error) => {
        console.error('Failed to initialize CASfolio app', error);
        rerenderActivityViews();
        initializeEventListeners();
        initializePortfolioQuestionnaire();
        initializeSelectControls();
        initializeTheme();
    });
});

// Photos modal
function openPhotosModal() {
    const modal = document.getElementById('photos-modal');
    const grid = document.getElementById('photos-grid');
    const empty = document.getElementById('photos-empty');

    const photos = currentActivities
        .filter(a => !!a.headerImage)
        .map(a => ({ url: a.headerImage, title: a.title, id: a.id }));

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
                    <div class="activity-image" style="background-image: url('${p.url}');"></div>
                    <div class="gallery-content">
                        <h4 class="gallery-title">${p.title}</h4>
                    </div>
                </div>
            </div>
        `).join('');
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
