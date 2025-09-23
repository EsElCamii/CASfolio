// moved to Next public; Sample data for the CAS portfolio
const sampleData = {
    activities: [
        {
            id: "1",
            title: "Digital Art Exhibition",
            description: "Organized and curated a digital art exhibition showcasing student work from our school community.",
            category: "creativity",
            startDate: "2024-10-01",
            endDate: "2024-11-15",
            hours: 15,
            images: [],
            learningOutcomes: ["Creative Thinking", "Project Management", "Communication"],
            status: "completed",
            createdAt: "2024-10-01"
        },
        {
            id: "2",
            title: "Charity Marathon",
            description: "Participated in a 10K charity run to raise funds for local environmental conservation efforts.",
            category: "activity",
            startDate: "2024-09-15",
            endDate: "2024-10-20",
            hours: 20,
            images: [],
            learningOutcomes: ["Physical Endurance", "Teamwork", "Community Engagement"],
            status: "completed",
            createdAt: "2024-09-15"
        },
        {
            id: "3",
            title: "Community Garden Project",
            description: "Established and maintained a community garden to provide fresh produce for local food bank.",
            category: "service",
            startDate: "2024-08-01",
            endDate: null,
            hours: 25,
            images: [],
            learningOutcomes: ["Environmental Awareness", "Community Service", "Leadership"],
            status: "ongoing",
            createdAt: "2024-08-01"
        },
        {
            id: "4",
            title: "School Theater Production",
            description: "Led the production design for our school's annual theater performance of 'A Midsummer Night's Dream.'",
            category: "creativity",
            startDate: "2024-08-01",
            endDate: "2024-11-30",
            hours: 35,
            images: [],
            learningOutcomes: ["Creative Thinking", "Team Collaboration", "Project Management"],
            status: "ongoing",
            createdAt: "2024-08-01"
        },
        {
            id: "5",
            title: "Basketball Training Program",
            description: "Joined school basketball team and implemented intensive training regimen to improve teamwork and physical fitness.",
            category: "activity",
            startDate: "2024-09-01",
            endDate: null,
            hours: 25,
            images: [],
            learningOutcomes: ["Physical Fitness", "Team Collaboration", "Discipline"],
            status: "ongoing",
            createdAt: "2024-09-01"
        }
    ],
    reflections: [
        {
            id: "r1",
            activityId: "1",
            title: "Leadership Through Art",
            content: "Organizing the digital art exhibition taught me that leadership isn't just about directing others, but about creating space for everyone's creativity to flourish. I learned to balance my vision with collaborative input from fellow students and teachers. The process of curating work from diverse backgrounds showed me how art can bridge cultural differences and foster understanding within our school community.",
            createdAt: "2024-11-15"
        },
        {
            id: "r2",
            activityId: "2",
            title: "Physical Challenge and Community Impact",
            content: "The charity marathon was more than just a physical challenge. It showed me how individual effort can contribute to larger community goals. Training for the 10K taught me discipline and perseverance, but the real learning came from understanding how fundraising and awareness campaigns work. I realized that environmental conservation requires both personal commitment and collective action.",
            createdAt: "2024-10-20"
        }
    ]
};

// Data storage keys used to namespace everything we keep in localStorage
const STORAGE_KEYS = {
    ACTIVITIES: 'casfolio_activities',
    REFLECTIONS: 'casfolio_reflections'
};

const PORTFOLIO_ONBOARDING_KEY = 'casfolio_portfolio_onboarding';

// Load data from localStorage or initialize with empty arrays so a new visitor starts fresh
let currentActivities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES)) || [];
let currentReflections = JSON.parse(localStorage.getItem(STORAGE_KEYS.REFLECTIONS)) || [];

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
    const signature = document.querySelector('[data-testid="text-supervisor-signature"]');
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
    defaults.coordinator_signature = signature ? signature.textContent.trim() : '';

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
    setText('[data-testid="text-supervisor-signature"]', data.coordinator_signature, defaults.coordinator_signature);

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
        monthsEl.textContent = months + '+';
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
            progress: Math.min(100, (stats.categoryStats.creativity.hours / 80) * 100),
        },
        {
            id: 'activity',
            title: 'Activity',
            description: 'Physical challenges and team sports that promote health, teamwork, and personal endurance.',
            icon: 'fas fa-users',
            stats: stats.categoryStats.activity,
            progress: Math.min(100, (stats.categoryStats.activity.hours / 80) * 100),
        },
        {
            id: 'service',
            title: 'Service',
            description: 'Community engagement and volunteer work focused on making a positive impact in society.',
            icon: 'fas fa-heart',
            stats: stats.categoryStats.service,
            progress: Math.min(100, (stats.categoryStats.service.hours / 80) * 100),
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
                    <span class="activity-date" data-testid="text-date-${activity.id}">${formatDate(activity.startDate)}</span>
                </div>
                <p class="activity-description" data-testid="text-description-${activity.id}">${activity.description}</p>
                <div class="activity-footer">
                    <span class="activity-hours" data-testid="text-hours-${activity.id}">${activity.hours} hours</span>
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

function renderLatestReflection() {
    const latestReflection = currentReflections[0];
    const dateElement = document.getElementById('latest-reflection-date');
    const contentElement = document.getElementById('latest-reflection-content');
    
    if (latestReflection) {
        dateElement.textContent = formatFullDate(latestReflection.createdAt);
        contentElement.innerHTML = `
            <h4 class="reflection-title" data-testid="text-latest-reflection-title">${latestReflection.title}</h4>
            <p class="reflection-content" data-testid="text-latest-reflection-content">${latestReflection.content}</p>
            <button class="btn btn-ghost" data-testid="button-read-full-reflection">
                Read Full Reflection →
            </button>
        `;
    } else {
        dateElement.textContent = '';
        contentElement.innerHTML = `
            <div class="empty-state">
                <p data-testid="text-no-reflections">No reflections added yet.</p>
                <button class="btn btn-primary" onclick="openAddReflectionDialog()" data-testid="button-add-first-reflection">
                    <i class="fas fa-plus"></i>
                    Add Your First Reflection
                </button>
            </div>
        `;
    }
}

function renderProgressDashboard() {
    const stats = calculateStats();
    
    // Update total hours display
    document.getElementById('progress-total-hours').textContent = `Total: ${stats.totalHours}/150 hours`;
    
    // Update progress message
    const progressMessage = document.getElementById('progress-message');
    if (stats.totalHours >= 150) {
        progressMessage.textContent = "You've exceeded the minimum requirement! Great work!";
    } else {
        progressMessage.textContent = `${150 - stats.totalHours} hours remaining to reach minimum requirement`;
    }
    
    // Render progress categories
    const progressContainer = document.getElementById('progress-categories');
    // Targets adjusted to 80 hours per category
    const categories = [
        { name: 'Creativity', current: stats.categoryStats.creativity.hours, target: 80, color: 'creativity' },
        { name: 'Activity', current: stats.categoryStats.activity.hours, target: 80, color: 'activity' },
        { name: 'Service', current: stats.categoryStats.service.hours, target: 80, color: 'service' }
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
                        <span class="gallery-date" data-testid="text-gallery-date-${activity.id}">${formatDate(activity.startDate)}</span>
                    </div>
                    <h4 class="gallery-title" data-testid="text-gallery-title-${activity.id}">${activity.title}</h4>
                    <p class="gallery-description" data-testid="text-gallery-desc-${activity.id}">${activity.description.substring(0, 80)}${activity.description.length > 80 ? '...' : ''}</p>
                    <div class="gallery-footer">
                        <span class="gallery-hours" data-testid="text-gallery-hours-${activity.id}">${activity.hours} hours</span>
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
    
    // Close any open modals first
    document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
    
    if (activityId) {
        // Edit mode
        currentActivityId = activityId;
        const activity = currentActivities.find(a => a.id === activityId);
        if (activity) {
            // Populate form with activity data
            form.elements['title'].value = activity.title || '';
            form.elements['category'].value = activity.category || '';
            form.elements['description'].value = activity.description || '';
            form.elements['startDate'].value = activity.startDate || '';
            form.elements['endDate'].value = activity.endDate || '';
            form.elements['hours'].value = activity.hours || '';
            form.elements['status'].value = activity.status || 'ongoing';
            
            // Set learning outcomes
            const outcomesContainer = document.getElementById('learning-outcomes-container');
            outcomesContainer.innerHTML = '';
            learningOutcomes = activity.learningOutcomes || [];
            learningOutcomes.forEach(outcome => {
                const tag = document.createElement('div');
                tag.className = 'learning-outcome-tag';
                tag.innerHTML = `
                    ${outcome}
                    <span class="remove-outcome" onclick="removeLearningOutcome('${outcome}')">×</span>
                `;
                outcomesContainer.appendChild(tag);
            });
            
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
        document.getElementById('learning-outcomes-container').innerHTML = '';
        learningOutcomes = [];
        document.getElementById('image-preview').style.display = 'none';
        title.textContent = 'Add New Activity';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Activity';
    }
    
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
    form.elements['coordinator_signature'].value = values.coordinator_signature || '';

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
    data.coordinator_signature = getValue('coordinator_signature');

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

function deleteActivity(activityId) {
    if (confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
        // Remove the activity
        currentActivities = currentActivities.filter(a => a.id !== activityId);
        
        // Also remove any associated reflections
        currentReflections = currentReflections.filter(r => r.activityId !== activityId);
        
        // Save data to localStorage
        saveData();
        
        // Close the modal and reset body overflow
        const detailModal = document.getElementById('activity-detail-modal');
        if (detailModal) {
            detailModal.classList.remove('show');
        }
        unlockBodyScroll();
        
        // Re-render the UI
        renderActivitiesGrid();
        renderTimeline();
        renderHeroStats();
        renderCategoriesGrid();
        renderProgressDashboard();
        renderGallery();
        renderProgressDashboard();
        
        // Show a success message
        alert('Activity deleted successfully!');
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
function handleActivityFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // Get learning outcomes
    const learningOutcomes = [];
    document.querySelectorAll('.learning-outcome-tag').forEach(tag => {
        learningOutcomes.push(tag.textContent);
    });
    
    // Add learning outcomes to form data
    formData.delete('learningOutcomes');
    learningOutcomes.forEach(outcome => {
        formData.append('learningOutcomes', outcome);
    });
    
    // Handle image - check both file upload and URL
    const imagePreview = document.getElementById('image-preview');
    const imagePreviewImg = document.getElementById('image-preview-img');
    
    if (imagePreview && imagePreview.style.display !== 'none' && imagePreviewImg.src) {
        // If we have an image in the preview (from either file or URL)
        const imageData = imagePreviewImg.src;
        saveActivity(formData, imageData);
    } else {
        // No image provided
        saveActivity(formData, null);
    }
    
    // Reset form and close modal
    form.reset();
    if (imagePreview) imagePreview.style.display = 'none';
    closeAddActivityDialog();
    
    // Re-render the UI
    renderActivitiesGrid();
    renderTimeline();
    renderHeroStats();
    renderCategoriesGrid();
    renderProgressDashboard();
    renderGallery();
    
    alert('Activity created successfully!');
}

function saveActivity(formData, headerImage) {
    const isEditing = currentActivityId !== null;
    const activity = {
        id: isEditing ? currentActivityId : Date.now().toString(),
        title: formData.get('title'),
        category: formData.get('category'),
        description: formData.get('description'),
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate') || null,
        hours: parseInt(formData.get('hours')),
        status: formData.get('status'),
        learningOutcomes: Array.from(formData.getAll('learningOutcomes')),
        headerImage: headerImage,
        createdAt: new Date().toISOString()
    };
    
    if (isEditing) {
        const index = currentActivities.findIndex(a => a.id === currentActivityId);
        if (index !== -1) {
            // Preserve the existing header image if not changed
            if (!headerImage && currentActivities[index].headerImage) {
                activity.headerImage = currentActivities[index].headerImage;
            }
            currentActivities[index] = activity;
        }
    } else {
        currentActivities.push(activity);
    }
    learningOutcomes = [];
    saveData();
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
    renderLatestReflection();
    renderProgressDashboard();
    
    closeAddReflectionDialog();
    alert('Reflection created successfully!');
}

// Image upload and URL handler powers the activity header image picker
document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const imageUpload = document.getElementById('header-image-upload');
    const imageUrlInput = document.getElementById('image-url-input');
    const loadImageUrlBtn = document.getElementById('load-image-url');
    const removeImageBtn = document.getElementById('remove-image');
    const imagePreview = document.getElementById('image-preview');
    const imagePreviewImg = document.getElementById('image-preview-img');
    const uploadTab = document.querySelector('[data-tab="upload"]');
    const urlTab = document.querySelector('[data-tab="url"]');
    const uploadTabContent = document.getElementById('upload-tab');
    const urlTabContent = document.getElementById('url-tab');
    
    // Tab switching
    if (uploadTab && urlTab) {
        uploadTab.addEventListener('click', () => switchTab('upload'));
        urlTab.addEventListener('click', () => switchTab('url'));
    }
    
    function switchTab(tab) {
        // Update active tab
        if (tab === 'upload') {
            uploadTab.classList.add('active');
            urlTab.classList.remove('active');
            uploadTabContent.classList.add('active');
            urlTabContent.classList.remove('active');
        } else {
            uploadTab.classList.remove('active');
            urlTab.classList.add('active');
            uploadTabContent.classList.remove('active');
            urlTabContent.classList.add('active');
        }
    }
    
    // Handle file upload
    if (imageUpload) {
        imageUpload.addEventListener('change', handleFileUpload);
    }
    
    // Handle URL load
    if (loadImageUrlBtn) {
        loadImageUrlBtn.addEventListener('click', handleImageUrl);
    }
    
    // Handle remove image
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', removeImage);
    }
    
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            // Check file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size should be less than 5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                showImagePreview(e.target.result);
                // Clear URL input when uploading a file
                imageUrlInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    }
    
    function handleImageUrl() {
        const imageUrl = imageUrlInput.value.trim();
        if (!imageUrl) {
            alert('Please enter an image URL');
            return;
        }
        
        // Simple URL validation
        try {
            new URL(imageUrl);
        } catch (e) {
            alert('Please enter a valid URL');
            return;
        }
        
        // Create a temporary image to check if the URL is valid
        const img = new Image();
        img.onload = function() {
            showImagePreview(imageUrl);
            // Clear file input when using URL
            if (imageUpload) imageUpload.value = '';
        };
        img.onerror = function() {
            alert('Could not load image from the provided URL. Please check the URL and try again.');
        };
        img.src = imageUrl;
    }
    
    function showImagePreview(src) {
        imagePreviewImg.src = src;
        imagePreview.style.display = 'block';
    }
    
    function removeImage() {
        imagePreviewImg.src = '';
        imagePreview.style.display = 'none';
        if (imageUpload) imageUpload.value = '';
        if (imageUrlInput) imageUrlInput.value = '';
    }
});

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

// Kick off the initial render pipeline once the DOM is ready
function initializeApp() {
    renderHeroStats();
    renderCategoriesGrid();
    renderActivitiesGrid();
    renderTimeline();
    renderLatestReflection();
    renderProgressDashboard();
    renderGallery();
    initializeEventListeners();
    initializePortfolioQuestionnaire();
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

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
