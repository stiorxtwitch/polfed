// ============================================================
// Rendu dynamique du header auth (partagé entre toutes les pages)
// ============================================================
function renderAuthNav(currentPage) {
    const user = getCurrentUser();
    const authSection = document.getElementById('authSection');
    const notifBell = document.getElementById('notifBell');
    if (!authSection) return;

    if (user) {
        if (notifBell) notifBell.style.display = 'flex';
        const r = ROLES_LEVEL[user.role] || 0;
        const menuItems = user.role === 'civil'
            ? `<a href="civil-complaints.html" class="dropdown-item">📋 Mes Plaintes</a>
               <a href="civil-cv.html" class="dropdown-item">📄 Mon Dossier</a>
               <div class="dropdown-divider"></div>`
            : `<a href="police-complaints.html" class="dropdown-item">📋 Gestion Plaintes</a>
               ${r >= 2 ? '<a href="police-recruitment.html" class="dropdown-item">📝 Recrutement</a>' : ''}
               ${r >= 3 ? '<a href="police-personnel.html" class="dropdown-item">👥 Personnel</a>' : ''}
               ${r >= 3 ? '<a href="police-logs.html" class="dropdown-item">🗂️ Logs</a>' : ''}
               <div class="dropdown-divider"></div>`;

        authSection.innerHTML = `
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
            </div>`;
    } else {
        authSection.innerHTML = `<a href="login.html" class="btn-connexion">Connexion</a>`;
    }
}
