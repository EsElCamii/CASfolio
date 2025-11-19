//HELL IN CODE

(function() {
    const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://hhvdgmlddlfstdinctiy.supabase.co';
    const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhodmRnbWxkZGxmc3RkaW5jdGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDk5NTMsImV4cCI6MjA3NDQ4NTk1M30.1_wOxUi9__CJkD_p0jDSrcqS5h0VP7_HfEVS6IdTPXA';
    const REVIEW_FLAG_LABELS = {
        none: 'Not submitted',
        pending_review: 'Pending Review',
        pending_verification: 'Pending Verification'
    };
    const REVIEW_DECISION_LABELS = {
        pending: 'Waiting',
        approved: 'Approved',
        rejected: 'Changes Requested'
    };

    let supabaseClient = null;
    let isAuthenticated = false;

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
        const { data, error } = await client
            .from('cas_activity_reviews')
            .select('activity_id, activity_title, student_name, review_flag, review_notes, teacher_decision, teacher_notes, review_updated_at')
            .order('review_updated_at', { ascending: false });
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
            review_flag: decision === 'approved' ? 'pending_verification' : 'pending_review',
            review_updated_at: new Date().toISOString()
        };
        const { error } = await client
            .from('cas_activity_reviews')
            .upsert(payload, { onConflict: 'activity_id' });
        if (error) {
            throw error;
        }
    }

    function renderActivities(rows) {
        const body = document.getElementById('admin-activities-body');
        const emptyState = document.getElementById('admin-empty-state');
        if (!body || !emptyState) return;
        if (rows.length === 0) {
            body.innerHTML = '';
            emptyState.hidden = false;
            return;
        }
        emptyState.hidden = true;
        body.innerHTML = rows.map((row) => `
            <tr>
                <td>
                    <div class="admin-activity-title">${row.activity_title || 'Untitled activity'}</div>
                    <div class="admin-activity-meta">${row.student_name || 'Unknown student'}</div>
                </td>
                <td>
                    <span class="review-pill flag">${getFlagLabel(row.review_flag)}</span>
                </td>
                <td>
                    <span class="review-pill ${getDecisionClass(row.teacher_decision)}">${getDecisionLabel(row.teacher_decision)}</span>
                </td>
                <td>
                    <textarea class="admin-note" data-note-for="${row.activity_id}" placeholder="Add a note for the student">${row.teacher_notes || ''}</textarea>
                </td>
                <td>
                    <div class="admin-row-actions">
                        <button class="btn btn-outline btn-sm" data-action="approve" data-activity-id="${row.activity_id}">Approve</button>
                        <button class="btn btn-danger btn-sm" data-action="reject" data-activity-id="${row.activity_id}">Reject</button>
                    </div>
                </td>
            </tr>
        `).join('');
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

        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const username = loginForm.username.value.trim();
                const password = loginForm.password.value;
                const submitBtn = document.getElementById('admin-login-button');
                submitBtn.disabled = true;
                submitBtn.textContent = 'Checking…';
                try {
                    const isValid = await verifyAdminCredentials(username, password);
                    if (!isValid) {
                        alert('Invalid credentials.');
                        return;
                    }
                    isAuthenticated = true;
                    toggleDashboard(true);
                    await hydrateDashboard();
                } catch (error) {
                    console.error('Login failed', error);
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

        logoutBtn?.addEventListener('click', () => {
            isAuthenticated = false;
            toggleDashboard(false);
        });

        table?.addEventListener('click', async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
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
                await updateReviewDecision(activityId, action === 'approve' ? 'approved' : 'rejected', note);
                await hydrateDashboard();
            } catch (error) {
                console.error('Failed to update decision', error);
                alert(error.message || 'Unable to update review status.');
            }
        });
    });
})();
