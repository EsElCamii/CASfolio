//HELL IN CODE

(function() {
    const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://hhvdgmlddlfstdinctiy.supabase.co';
    const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodmRnbWxkZGxmc3RkaW5jdGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDk5NTMsImV4cCI6MjA3NDQ4NTk1M30.1_wOxUi9__CJkD_p0jDSrcqS5h0VP7_HfEVS6IdTPXA';
    const REVIEW_FLAG_LABELS = {
        none: 'Not requested',
        pending_review: 'Submitted'
    };
    const REVIEW_DECISION_LABELS = {
        pending: 'Awaiting review',
        approved: 'Approved',
        rejected: 'Changes Requested'
    };

    let supabaseClient = null;
    let isAuthenticated = false;
    let showArchived = false;

    function getSupabaseClient() {
        if (supabaseClient) {
            return supabaseClient;
        }
        if (!window.supabase || !SUPABASE_URL || SUPABASE_URL.includes('YOUR_SUPABASE_PROJECT')) {
            return null;
        }
        if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
            return null;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });
        return supabaseClient;
    }

    function getFlagLabel(flag) {
        return REVIEW_FLAG_LABELS[flag] || REVIEW_FLAG_LABELS.none;
    }

    function getDecisionLabel(decision) {
        return REVIEW_DECISION_LABELS[decision] || REVIEW_DECISION_LABELS.pending;
    }

    function getDecisionClass(decision) {
        if (decision === 'approved') return 'approved';
        if (decision === 'rejected') return 'rejected';
        return 'pending';
    }

    function formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatHours(value) {
        if (value === null || value === undefined) return '';
        const num = Number(value);
        return Number.isFinite(num) ? `${num} hour${num === 1 ? '' : 's'}` : '';
    }

    function renderLearningOutcomes(list) {
        if (!Array.isArray(list) || list.length === 0) return '';
        return `<div class="admin-detail-row"><span class="admin-detail-label">Learning outcomes</span><div class="admin-badge-row">${list
            .map((lo) => `<span class="pill lo-pill">${lo}</span>`)
            .join('')}</div></div>`;
    }

    function renderMedia(assets) {
        if (!Array.isArray(assets) || assets.length === 0) return '';
        const items = assets
            .map((asset, idx) => {
                const url = typeof asset === 'string' ? asset : asset?.url || asset?.path;
                if (!url) return '';
                return `<button class="thumb" data-asset-url="${url}" aria-label="Open attachment ${idx + 1}">
                    <img src="${url}" alt="Attachment ${idx + 1}">
                </button>`;
            })
            .filter(Boolean)
            .join('');
        if (!items) return '';
        return `<div class="admin-detail-row">
            <span class="admin-detail-label">Photos</span>
            <div class="admin-media-row">${items}</div>
        </div>`;
    }

    async function verifyAdminCredentials(username, password) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client is not configured. Set window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__.');
        }
        // The verify_admin_password RPC should hash and compare on the server.
        const { data, error } = await client.rpc('verify_admin_password', {
            p_username: username,
            p_plain_password: password
        });
        if (error) {
            throw error;
        }
        if (Array.isArray(data)) {
            return Boolean(data[0]?.is_valid);
        }
        return Boolean(data?.is_valid);
    }

    async function fetchReviewQueue() {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client is not configured.');
        }
        let { data, error } = await client
            .from('cas_activity_reviews')
            .select(
                'activity_id, activity_title, student_name, review_flag, review_notes, teacher_decision, teacher_notes, review_updated_at, activity_snapshot, archived'
            )
            .order('review_updated_at', { ascending: false });
        if (error) {
            // Fallback for deployments without activity_snapshot/archived columns
            ({ data, error } = await client
                .from('cas_activity_reviews')
                .select('activity_id, activity_title, student_name, review_flag, review_notes, teacher_decision, teacher_notes, review_updated_at')
                .order('review_updated_at', { ascending: false }));
        }
        if (error) {
            throw error;
        }
        return Array.isArray(data) ? data : [];
    }

    async function updateReviewDecision(activityId, decision, note) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client is not configured.');
        }
        const payload = {
            activity_id: activityId,
            teacher_decision: decision,
            teacher_notes: note || null,
            review_flag: 'pending_review',
            review_updated_at: new Date().toISOString()
        };
        const { error } = await client
            .from('cas_activity_reviews')
            .upsert(payload, { onConflict: 'activity_id' });
        if (error) {
            throw error;
        }
    }

    async function updateArchiveState(activityId, archived) {
        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Supabase client is not configured.');
        }
        const payload = {
            activity_id: activityId,
            archived: Boolean(archived),
            review_flag: 'none',
            review_updated_at: new Date().toISOString()
        };
        const { error } = await client.from('cas_activity_reviews').upsert(payload, { onConflict: 'activity_id' });
        if (error) {
            // Fallback if archived column is missing
            const retry = await client
                .from('cas_activity_reviews')
                .upsert({ activity_id: activityId, review_flag: 'none', review_updated_at: new Date().toISOString() }, { onConflict: 'activity_id' });
            if (retry.error) {
                throw retry.error;
            }
        }
    }

    function renderActivities(rows) {
        const body = document.getElementById('admin-activities-body');
        const emptyState = document.getElementById('admin-empty-state');
        if (!body || !emptyState) return;
        const filtered = (Array.isArray(rows) ? rows : []).filter((row) => {
            const archived = Boolean(row.archived);
            return showArchived ? archived : !archived;
        });
        if (!rows.length) {
            body.innerHTML = '';
            emptyState.hidden = false;
            return;
        }
        if (!filtered.length) {
            body.innerHTML = '';
            emptyState.textContent = showArchived ? 'No archived reviews.' : 'No review requests yet.';
            emptyState.hidden = false;
            return;
        }
        emptyState.hidden = true;
        body.innerHTML = filtered
            .map((row) => {
                const snapshot = row.activity_snapshot || {};
                const title = snapshot.title || row.activity_title || 'Untitled activity';
                const student = snapshot.student_name || row.student_name || 'Unknown student';
                const flag = row.review_flag === 'pending_verification' ? 'pending_review' : row.review_flag;
                const description = snapshot.description || '';
                const category = snapshot.category || '';
                const startDate = formatDate(snapshot.dateGeneral || snapshot.startDate);
                const endDate = formatDate(snapshot.endDate);
                const totalHours = formatHours(snapshot.totalHours ?? snapshot.total_hours);
                const challenge = snapshot.challengeDescription || '';
                const photoInfo = snapshot.photoInfo || '';
                const learningOutcomes = renderLearningOutcomes(snapshot.learningOutcomes || snapshot.learning_outcomes);
                const teacherNote = row.teacher_notes || '';
                const studentNote = row.review_notes || '';
                const heroImage = snapshot.headerImage || (Array.isArray(snapshot.assets) ? snapshot.assets[0]?.url || snapshot.assets[0] : null);
                const media = renderMedia(snapshot.assets || snapshot.photos);
                const dates =
                    startDate || endDate
                        ? `<div class="admin-detail-row"><span class="admin-detail-label">Dates</span><span class="admin-detail-value">${[startDate, endDate]
                              .filter(Boolean)
                              .join(' – ')}</span></div>`
                        : '';
                const hours = totalHours
                    ? `<div class="admin-detail-row"><span class="admin-detail-label">Hours</span><span class="admin-detail-value">${totalHours}</span></div>`
                    : '';
                const cat = category
                    ? `<div class="admin-detail-row"><span class="admin-detail-label">Category</span><span class="admin-detail-value">${category}</span></div>`
                    : '';
                const studentNotesBlock = studentNote
                    ? `<div class="admin-detail-row"><span class="admin-detail-label">Student note</span><p class="admin-detail-value">${studentNote}</p></div>`
                    : '';
                const challengeBlock = challenge
                    ? `<div class="admin-detail-row"><span class="admin-detail-label">Challenge</span><p class="admin-detail-value">${challenge}</p></div>`
                    : '';
                const photoMetaBlock = photoInfo
                    ? `<div class="admin-detail-row"><span class="admin-detail-label">Photo info</span><p class="admin-detail-value">${photoInfo}</p></div>`
                    : '';
                const archivedBadge = row.archived ? `<span class="pill archived-pill">Archived</span>` : '';

                return `
                <article class="review-card" data-activity-id="${row.activity_id}">
                    <header class="review-card__header">
                        <div>
                            <div class="review-card__title">${title}</div>
                            <div class="review-card__meta">${student} ${archivedBadge}</div>
                        </div>
                        <div class="review-pill-row">
                            <span class="review-pill flag">${getFlagLabel(flag)}</span>
                            <span class="review-pill ${getDecisionClass(row.teacher_decision)}">${getDecisionLabel(row.teacher_decision)}</span>
                        </div>
                    </header>
                    <div class="review-card__body">
                        ${
                            heroImage
                                ? `<div class="admin-hero-image" data-asset-url="${heroImage}" style="background-image: url('${heroImage}')"></div>`
                                : ''
                        }
                        ${description ? `<p class="admin-detail-description">${description}</p>` : ''}
                        ${cat}
                        ${dates}
                        ${hours}
                        ${challengeBlock}
                        ${learningOutcomes}
                        ${media}
                        ${photoMetaBlock}
                        ${studentNotesBlock}
                    </div>
                    <div class="review-card__actions">
                        <textarea class="admin-note" data-note-for="${row.activity_id}" placeholder="Add a note for the student">${teacherNote}</textarea>
                        <div class="admin-row-actions">
                            <button class="btn btn-outline btn-sm" data-action="approve" data-activity-id="${row.activity_id}">Approve</button>
                            <button class="btn btn-danger btn-sm" data-action="reject" data-activity-id="${row.activity_id}">Reject</button>
                            ${
                                row.archived
                                    ? `<button class="btn btn-ghost btn-sm" data-action="restore" data-activity-id="${row.activity_id}">Restore</button>`
                                    : `<button class="btn btn-ghost btn-sm" data-action="archive" data-activity-id="${row.activity_id}">Archive</button>`
                            }
                        </div>
                    </div>
                </article>
            `;
            })
            .join('');
    }

    function toggleDashboard(show) {
        const loginPanel = document.getElementById('admin-login-panel');
        const dashboard = document.getElementById('admin-dashboard');
        if (loginPanel) loginPanel.hidden = show;
        if (dashboard) dashboard.hidden = !show;
    }

    async function hydrateDashboard() {
        try {
            const rows = await fetchReviewQueue();
            renderActivities(rows);
        } catch (error) {
            console.error('Failed to load review queue', error);
            alert(error.message || 'Unable to load activities from Supabase.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        const loginForm = document.getElementById('admin-login-form');
        const refreshBtn = document.getElementById('admin-refresh');
        const logoutBtn = document.getElementById('admin-logout');
        const table = document.getElementById('admin-activities-body');
        const loginStatus = document.getElementById('admin-login-status');
        const toggleArchivedBtn = document.getElementById('admin-toggle-archived');

        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const username = loginForm.username.value.trim();
                const password = loginForm.password.value;
                const submitBtn = document.getElementById('admin-login-button');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Checking…';
                if (loginStatus) loginStatus.textContent = 'Checking credentials…';
                try {
                    const isValid = await verifyAdminCredentials(username, password);
                    if (!isValid) {
                        if (loginStatus) loginStatus.textContent = 'Invalid credentials';
                        alert('Invalid credentials.');
                        return;
                    }
                    if (loginStatus) loginStatus.textContent = 'Authenticated';
                    isAuthenticated = true;
                    toggleDashboard(true);
                    await hydrateDashboard();
                } catch (error) {
                    console.error('Login failed', error);
                    if (loginStatus) loginStatus.textContent = 'Unable to verify credentials';
                    alert(error.message || 'Unable to verify credentials.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Log In';
                    loginForm.reset();
                }
            });
        }

        refreshBtn?.addEventListener('click', async () => {
            if (!isAuthenticated) {
                alert('Please log in as an admin first.');
                return;
            }
            await hydrateDashboard();
        });

        toggleArchivedBtn?.addEventListener('click', async () => {
            showArchived = !showArchived;
            toggleArchivedBtn.textContent = showArchived ? 'Hide Archived' : 'Show Archived';
            if (!isAuthenticated) return;
            await hydrateDashboard();
        });

        logoutBtn?.addEventListener('click', () => {
            isAuthenticated = false;
            toggleDashboard(false);
            if (loginStatus) loginStatus.textContent = '';
        });

        table?.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }
            const mediaUrl = target.dataset.assetUrl;
            if (mediaUrl) {
                window.open(mediaUrl, '_blank', 'noopener,noreferrer');
                return;
            }
            const action = target.dataset.action;
            if (!action) {
                return;
            }
            const activityId = target.dataset.activityId;
            if (!activityId) {
                return;
            }
            const noteInput = document.querySelector(`textarea[data-note-for="${activityId}"]`);
            const note = noteInput ? noteInput.value.trim() : '';
            try {
                if (action === 'archive') {
                    await updateArchiveState(activityId, true);
                } else if (action === 'restore') {
                    await updateArchiveState(activityId, false);
                } else {
                    await updateReviewDecision(activityId, action === 'approve' ? 'approved' : 'rejected', note);
                }
                await hydrateDashboard();
            } catch (error) {
                console.error('Failed to update decision', error);
                alert(error.message || 'Unable to update review status.');
            }
        });
    });
})();
