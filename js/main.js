// ============================================================
// Police Fédérale Liège City RP — Main JavaScript
// ============================================================

// ---- CONSTANTES ----
const ROLES_LEVEL = { civil: 0, agent: 1, supervision: 2, officier: 3 };
const STATUS_LABELS = {
    en_attente: 'En Attente',
    en_cours: 'En Cours',
    valide: 'Validé',
    refuse: 'Refusé',
    ferme: 'Fermé'
};
const STATUS_CLASSES = {
    en_attente: 'badge-warning',
    en_cours: 'badge-info',
    valide: 'badge-success',
    refuse: 'badge-danger',
    ferme: 'badge-secondary'
};

// ---- AUTH ----
function getCurrentUser() {
    try {
        const raw = localStorage.getItem('pfl_user');
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function setCurrentUser(user) {
    localStorage.setItem('pfl_user', JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem('pfl_user');
}

function hasRole(role) {
    const user = getCurrentUser();
    if (!user) return false;
    return (ROLES_LEVEL[user.role] || 0) >= (ROLES_LEVEL[role] || 0);
}

function isPolice() {
    return hasRole('agent');
}

function requireLogin(redirectTo = 'login.html') {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = redirectTo;
        return null;
    }
    return user;
}

function requireRole(role, redirectTo = 'index.html') {
    const user = requireLogin();
    if (!user) return null;
    if (!hasRole(role)) {
        showToast('Accès refusé', "Vous n'avez pas les droits nécessaires.", 'danger');
        setTimeout(() => { window.location.href = redirectTo; }, 1500);
        return null;
    }
    return user;
}

async function login(username, password) {
    showLoading();
    try {
        const { data, error } = await supabase
            .from('table_policefed_users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            hideLoading();
            return { error: 'Identifiants incorrects ou compte désactivé.' };
        }

        setCurrentUser(data);
        await createLog('LOGIN', `Connexion de ${data.prenom} ${data.nom} (${data.role})`);
        await createNotification(data.id, 'login', '✅ Connexion réussie', `Bienvenue ${data.prenom} ! Vous êtes connecté.`);

        hideLoading();
        return { user: data };
    } catch (e) {
        hideLoading();
        return { error: 'Erreur de connexion. Veuillez réessayer.' };
    }
}

async function register(nom, prenom, username, password) {
    showLoading();
    try {
        // Check if username exists
        const { data: existing } = await supabase
            .from('table_policefed_users')
            .select('id')
            .eq('username', username)
            .single();

        if (existing) {
            hideLoading();
            return { error: "Ce nom d'utilisateur est déjà pris." };
        }

        const { data, error } = await supabase
            .from('table_policefed_users')
            .insert({ nom, prenom, username, password, role: 'civil' })
            .select()
            .single();

        if (error || !data) {
            hideLoading();
            return { error: "Erreur lors de la création du compte." };
        }

        setCurrentUser(data);
        await createLog('REGISTER', `Inscription du civil ${prenom} ${nom}`);
        await createNotification(data.id, 'register', '👋 Bienvenue !', `Votre compte civil a été créé avec succès, ${prenom} !`);

        hideLoading();
        return { user: data };
    } catch (e) {
        hideLoading();
        return { error: 'Erreur lors de l\'inscription.' };
    }
}

async function logout() {
    const user = getCurrentUser();
    if (user) {
        await createLog('LOGOUT', `Déconnexion de ${user.prenom} ${user.nom}`);
    }
    clearCurrentUser();
    realtimeChannels.forEach(ch => supabase.removeChannel(ch));
    realtimeChannels = [];
    window.location.href = 'index.html';
}

// ---- CHARGEMENT ----
function showLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('active');
}

function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('active');
}

// ---- TOAST ----
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = { success: '✅', danger: '❌', warning: '⚠️', info: 'ℹ️', login: '🔐', logout: '🚪', message: '💬' };
    const icon = icons[type] || icons.info;

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ---- NOTIFICATIONS ----
let realtimeChannels = [];

async function createNotification(userId, type, title, message, relatedId = null, relatedType = null) {
    try {
        await supabase.from('table_policefed_notifications').insert({
            user_id: userId,
            type, title, message,
            related_id: relatedId,
            related_type: relatedType
        });
    } catch (e) { /* silently fail */ }
}

async function notifyAllPolice(type, title, message, relatedId = null, relatedType = null, minRole = 'agent') {
    try {
        const { data: officers } = await supabase
            .from('table_policefed_users')
            .select('id, role')
            .in('role', ['agent', 'supervision', 'officier'])
            .eq('is_active', true);

        if (!officers) return;
        const eligible = officers.filter(o => ROLES_LEVEL[o.role] >= ROLES_LEVEL[minRole]);
        await Promise.all(eligible.map(o =>
            createNotification(o.id, type, title, message, relatedId, relatedType)
        ));
    } catch (e) { /* silently fail */ }
}

async function notifyAllSupervision(type, title, message, relatedId = null, relatedType = null) {
    return notifyAllPolice(type, title, message, relatedId, relatedType, 'supervision');
}

async function loadNotifications() {
    const user = getCurrentUser();
    if (!user) return [];
    const { data } = await supabase
        .from('table_policefed_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
    return data || [];
}

async function getUnreadCount() {
    const user = getCurrentUser();
    if (!user) return 0;
    const { count } = await supabase
        .from('table_policefed_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    return count || 0;
}

async function markAllRead() {
    const user = getCurrentUser();
    if (!user) return;
    await supabase
        .from('table_policefed_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    updateNotifBadge(0);
}

function updateNotifBadge(count) {
    const badge = document.getElementById('notifCount');
    const bell = document.getElementById('notifBell');
    if (!badge || !bell) return;
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
    bell.classList.toggle('has-notif', count > 0);
}

async function renderNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;

    const notifs = await loadNotifications();
    const unread = notifs.filter(n => !n.is_read).length;
    updateNotifBadge(unread);

    panel.innerHTML = `
        <div class="notif-panel-header">
            <span>Notifications</span>
            ${unread > 0 ? `<button onclick="markAllRead().then(renderNotifPanel)" class="btn-mark-read">Tout lire</button>` : ''}
        </div>
        <div class="notif-list">
            ${notifs.length === 0 ? '<div class="notif-empty">Aucune notification</div>' : ''}
            ${notifs.map(n => `
                <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}','${n.related_type || ''}','${n.related_id || ''}')">
                    <div class="notif-item-title">${n.title}</div>
                    <div class="notif-item-msg">${n.message}</div>
                    <div class="notif-item-time">${formatDate(n.created_at)}</div>
                </div>
            `).join('')}
        </div>
    `;
}

async function handleNotifClick(notifId, relatedType, relatedId) {
    await supabase.from('table_policefed_notifications').update({ is_read: true }).eq('id', notifId);
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.remove('visible');

    if (relatedType === 'complaint') window.location.href = `civil-complaints.html?id=${relatedId}`;
    else if (relatedType === 'complaint_police') window.location.href = `police-complaints.html?id=${relatedId}`;
    else if (relatedType === 'recruitment') window.location.href = `civil-cv.html?id=${relatedId}`;
    else if (relatedType === 'recruitment_police') window.location.href = `police-recruitment.html?id=${relatedId}`;
}

function subscribeToNotifications() {
    const user = getCurrentUser();
    if (!user) return;

    const ch = supabase.channel(`notif-${user.id}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'table_policefed_notifications',
            filter: `user_id=eq.${user.id}`
        }, (payload) => {
            showToast(payload.new.title, payload.new.message, payload.new.type);
            getUnreadCount().then(updateNotifBadge);
        })
        .subscribe();
    realtimeChannels.push(ch);
}

// ---- LOGS ----
async function createLog(action, details) {
    const user = getCurrentUser();
    try {
        await supabase.from('table_policefed_logs').insert({
            user_id: user?.id || null,
            user_name: user ? `${user.prenom} ${user.nom}` : 'Anonyme',
            action,
            details
        });
    } catch (e) { /* silently fail */ }
}

// ---- UTILITAIRES ----
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return d.toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateFull(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-BE', {
        weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function statusBadge(status) {
    return `<span class="badge ${STATUS_CLASSES[status] || 'badge-secondary'}">${STATUS_LABELS[status] || status}</span>`;
}

function roleBadge(role) {
    const labels = { civil: 'Civil', agent: 'Agent', supervision: 'Supervision', officier: 'Officier' };
    const classes = { civil: 'badge-secondary', agent: 'badge-info', supervision: 'badge-warning', officier: 'badge-danger' };
    return `<span class="badge ${classes[role] || 'badge-secondary'}">${labels[role] || role}</span>`;
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ---- NAVIGATION ----
function buildNav(currentPage) {
    const user = getCurrentUser();
    const basePath = window.location.pathname.includes('/') ? '' : '';

    // Bell & User section HTML
    let authHtml = '';
    let bellHtml = '';

    if (user) {
        bellHtml = `
            <div class="notif-bell" id="notifBell" onclick="toggleNotifPanel()">
                🔔 <span class="notif-count" id="notifCount" style="display:none">0</span>
            </div>
        `;

        let menuItems = '';
        if (user.role === 'civil') {
            menuItems = `
                <a href="civil-complaints.html" class="dropdown-item">📋 Mes Plaintes</a>
                <a href="civil-cv.html" class="dropdown-item">📄 Mon Dossier</a>
                <div class="dropdown-divider"></div>
            `;
        } else {
            menuItems = `
                <a href="police-complaints.html" class="dropdown-item">📋 Gestion Plaintes</a>
                ${hasRole('supervision') ? `<a href="police-recruitment.html" class="dropdown-item">📝 Recrutement</a>` : ''}
                ${hasRole('officier') ? `<a href="police-personnel.html" class="dropdown-item">👥 Personnel</a>` : ''}
                ${hasRole('officier') ? `<a href="police-logs.html" class="dropdown-item">🗂️ Logs</a>` : ''}
                <div class="dropdown-divider"></div>
            `;
        }

        authHtml = `
            <div class="nav-dropdown">
                <button class="btn-user">
                    <span class="user-avatar">${user.prenom[0]}${user.nom[0]}</span>
                    <span class="user-name">${user.prenom}</span>
                    <span class="arrow-down">▾</span>
                </button>
                <div class="nav-dropdown-menu user-menu">
                    <div class="user-menu-header">
                        <div class="user-menu-name">${user.prenom} ${user.nom}</div>
                        <div class="user-menu-role">${roleBadge(user.role)}</div>
                        ${user.matricule ? `<div class="user-menu-mat">Mat. ${user.matricule}</div>` : ''}
                    </div>
                    ${menuItems}
                    <a href="#" onclick="logout()" class="dropdown-item text-danger">🚪 Déconnexion</a>
                </div>
            </div>
        `;
    } else {
        authHtml = `<a href="login.html" class="btn-connexion">Connexion</a>`;
    }

    return { bellHtml, authHtml };
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const isVisible = panel.classList.contains('visible');
    if (!isVisible) {
        renderNotifPanel();
        panel.classList.add('visible');
    } else {
        panel.classList.remove('visible');
    }
}

// Close dropdown on outside click
document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-dropdown')) {
        document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('open'));
    }
    if (!e.target.closest('.notif-bell') && !e.target.closest('.notif-panel')) {
        const panel = document.getElementById('notifPanel');
        if (panel) panel.classList.remove('visible');
    }
});

document.addEventListener('click', function (e) {
    if (e.target.closest('.nav-dropdown > button, .nav-dropdown > a')) {
        const dd = e.target.closest('.nav-dropdown');
        const menu = dd?.querySelector('.nav-dropdown-menu');
        if (menu) {
            const wasOpen = menu.classList.contains('open');
            document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('open'));
            if (!wasOpen) menu.classList.add('open');
            e.stopPropagation();
        }
    }
});

// ---- INITIALISATION PAGE ----
async function initPage() {
    hideLoading();
    const user = getCurrentUser();
    if (user) {
        subscribeToNotifications();
        const count = await getUnreadCount();
        updateNotifBadge(count);
    }
}

window.addEventListener('load', initPage);
