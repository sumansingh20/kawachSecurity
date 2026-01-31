/**
 * KAVACH-INFINITY Dashboard Application
 * Enterprise-grade frontend JavaScript
 */

// API Base URL
const API_BASE = '/api';

// App State
let currentUser = null;
let currentPage = 'dashboard';

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    const token = localStorage.getItem('kavach_token');
    const userStr = localStorage.getItem('kavach_user');
    
    if (!token || !userStr) {
        window.location.href = '/index.html';
        return;
    }

    try {
        currentUser = JSON.parse(userStr);
        
        // Verify token with server
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Session expired');
        }

        const data = await response.json();
        currentUser = data.user;
        localStorage.setItem('kavach_user', JSON.stringify(currentUser));

        // Initialize UI
        initializeUI();
        
    } catch (error) {
        console.error('Auth check failed:', error);
        logout();
    }
});

function initializeUI() {
    // Set user info in sidebar
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userRole').textContent = currentUser.role === 'ADMIN' ? 'Administrator' : 'User';
    document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();

    // Show admin menu if admin
    if (currentUser.role === 'ADMIN') {
        document.body.classList.add('is-admin');
    }

    // Setup navigation
    setupNavigation();

    // Start clock
    updateClock();
    setInterval(updateClock, 1000);

    // Load initial page
    loadPage('dashboard');

    // Load alerts count
    loadAlertsCount();
}

function updateClock() {
    const now = new Date();
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// ============================================
// Navigation
// ============================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.dataset.page;
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Load page
            loadPage(page);
            
            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('open');
        });
    });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function loadPage(page) {
    currentPage = page;
    const content = document.getElementById('contentArea');
    
    // Update header
    const titles = {
        dashboard: { title: 'Dashboard', subtitle: 'System Overview' },
        alerts: { title: 'Alerts', subtitle: 'Active System Alerts' },
        events: { title: 'System Events', subtitle: 'Event Monitoring' },
        users: { title: 'User Management', subtitle: 'Manage System Users' },
        audit: { title: 'Audit Logs', subtitle: 'Activity History' },
        settings: { title: 'Settings', subtitle: 'Account & System Settings' }
    };

    const pageInfo = titles[page] || { title: 'Dashboard', subtitle: '' };
    document.getElementById('pageTitle').textContent = pageInfo.title;
    document.getElementById('pageSubtitle').textContent = pageInfo.subtitle;

    // Show loading
    content.innerHTML = '<div class="loading-container"><div class="skeleton skeleton-card"></div></div>';

    // Load page content
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'alerts':
            loadAlerts();
            break;
        case 'events':
            loadEvents();
            break;
        case 'users':
            loadUsers();
            break;
        case 'audit':
            loadAuditLogs();
            break;
        case 'settings':
            loadSettings();
            break;
        default:
            loadDashboard();
    }
}

// ============================================
// Dashboard
// ============================================

async function loadDashboard() {
    const content = document.getElementById('contentArea');
    
    try {
        const [statsRes, activityRes, alertsRes] = await Promise.all([
            fetchAPI('/dashboard/stats'),
            fetchAPI('/dashboard/recent-activity?limit=8'),
            fetchAPI('/dashboard/alerts?limit=5')
        ]);

        const stats = statsRes.stats;
        const activity = activityRes.activity;
        const alerts = alertsRes.alerts;

        const isAdmin = currentUser.role === 'ADMIN';

        content.innerHTML = `
            <div class="dashboard-grid">
                ${isAdmin ? `
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon blue">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.totalUsers || 0}</div>
                    <div class="stat-card-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon green">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.activeUsers || 0}</div>
                    <div class="stat-card-label">Active Today</div>
                </div>
                ` : ''}
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon ${stats.criticalAlerts > 0 ? 'red' : 'green'}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${isAdmin ? (stats.criticalAlerts || 0) : (stats.myEvents || 0)}</div>
                    <div class="stat-card-label">${isAdmin ? 'Critical Alerts' : 'My Events'}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon purple">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.securityScore || 0}%</div>
                    <div class="stat-card-label">Security Score</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-header">
                        <div class="stat-card-icon ${stats.systemHealth >= 80 ? 'green' : stats.systemHealth >= 50 ? 'yellow' : 'red'}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="stat-card-value">${stats.systemHealth || 0}%</div>
                    <div class="stat-card-label">System Health</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Active Alerts</div>
                            <div class="card-subtitle">Requires attention</div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="loadPage('alerts')">View All</button>
                    </div>
                    <div class="card-body no-padding">
                        ${alerts.length > 0 ? alerts.map(alert => `
                            <div class="alert-item">
                                <div class="alert-severity ${alert.severity.toLowerCase()}"></div>
                                <div class="alert-content">
                                    <div class="alert-title">${escapeHtml(alert.event_type)}</div>
                                    <div class="alert-description">${escapeHtml(alert.description)}</div>
                                    <div class="alert-meta">
                                        <span>${formatDate(alert.created_at)}</span>
                                        ${alert.source ? `<span>${escapeHtml(alert.source)}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="empty-state" style="padding: 40px;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--accent-success); margin-bottom: 16px;">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <div class="empty-state-title">All Clear</div>
                                <div class="empty-state-text">No active alerts at this time</div>
                            </div>
                        `}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div>
                            <div class="card-title">Recent Activity</div>
                            <div class="card-subtitle">Latest system events</div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="loadPage('audit')">View All</button>
                    </div>
                    <div class="card-body">
                        <ul class="activity-list">
                            ${activity.length > 0 ? activity.map(item => `
                                <li class="activity-item">
                                    <div class="activity-icon ${getActivityIconClass(item.action)}">
                                        ${getActivityIcon(item.action)}
                                    </div>
                                    <div class="activity-content">
                                        <div class="activity-title">${formatActionName(item.action)}</div>
                                        <div class="activity-meta">
                                            ${item.user_email ? escapeHtml(item.user_email) + ' • ' : ''}
                                            ${formatDate(item.created_at)}
                                        </div>
                                    </div>
                                </li>
                            `).join('') : `
                                <div class="empty-state" style="padding: 20px;">
                                    <div class="empty-state-text">No recent activity</div>
                                </div>
                            `}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Dashboard load error:', error);
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="empty-state-title">Error Loading Dashboard</div>
                <div class="empty-state-text">${error.message}</div>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="loadDashboard()">Retry</button>
            </div>
        `;
    }
}

async function loadAlertsCount() {
    try {
        const res = await fetchAPI('/events/summary');
        const count = (res.summary.critical || 0) + (res.summary.warning || 0);
        document.getElementById('alertsBadge').textContent = count;
        document.getElementById('alertsBadge').style.display = count > 0 ? 'inline' : 'none';
    } catch (error) {
        console.error('Load alerts count error:', error);
    }
}

// ============================================
// Alerts Page
// ============================================

async function loadAlerts() {
    const content = document.getElementById('contentArea');
    
    try {
        const res = await fetchAPI('/events?status=ACTIVE&limit=50');
        const events = res.events;

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">System Alerts</div>
                        <div class="card-subtitle">${events.length} active alerts</div>
                    </div>
                    <div class="card-actions">
                        <select class="filter-select" id="severityFilter" onchange="filterAlerts()">
                            <option value="">All Severities</option>
                            <option value="CRITICAL">Critical</option>
                            <option value="WARNING">Warning</option>
                            <option value="INFO">Info</option>
                        </select>
                    </div>
                </div>
                <div class="card-body no-padding" id="alertsList">
                    ${renderAlertsList(events)}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Alerts load error:', error);
        showToast('Failed to load alerts', 'error');
    }
}

function renderAlertsList(events) {
    if (events.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <div class="empty-state-title">No Active Alerts</div>
                <div class="empty-state-text">All systems operating normally</div>
            </div>
        `;
    }

    return events.map(event => `
        <div class="alert-item" data-severity="${event.severity}">
            <div class="alert-severity ${event.severity.toLowerCase()}"></div>
            <div class="alert-content">
                <div class="alert-title">
                    <span class="badge ${event.severity.toLowerCase()}">${event.severity}</span>
                    ${escapeHtml(event.event_type)}
                </div>
                <div class="alert-description">${escapeHtml(event.description)}</div>
                <div class="alert-meta">
                    <span>${formatDate(event.created_at)}</span>
                    ${event.source ? `<span>Source: ${escapeHtml(event.source)}</span>` : ''}
                </div>
            </div>
            <div class="alert-actions">
                <button class="btn btn-sm btn-secondary" onclick="resolveEvent(${event.id})">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Resolve
                </button>
            </div>
        </div>
    `).join('');
}

function filterAlerts() {
    const severity = document.getElementById('severityFilter').value;
    const items = document.querySelectorAll('#alertsList .alert-item');
    
    items.forEach(item => {
        if (!severity || item.dataset.severity === severity) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

async function resolveEvent(eventId) {
    try {
        await fetchAPI(`/events/${eventId}/resolve`, { method: 'PUT' });
        showToast('Event resolved successfully', 'success');
        loadAlerts();
        loadAlertsCount();
    } catch (error) {
        showToast('Failed to resolve event', 'error');
    }
}

// ============================================
// Events Page
// ============================================

async function loadEvents() {
    const content = document.getElementById('contentArea');
    
    try {
        const res = await fetchAPI('/events?limit=50');
        const events = res.events;

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">System Events</div>
                        <div class="card-subtitle">All system events and alerts</div>
                    </div>
                    ${currentUser.role === 'ADMIN' ? `
                    <button class="btn btn-primary btn-sm" onclick="showCreateEventModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Create Event
                    </button>
                    ` : ''}
                </div>
                <div class="card-body no-padding">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Severity</th>
                                <th>Description</th>
                                <th>Source</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${events.map(event => `
                                <tr>
                                    <td><strong>${escapeHtml(event.event_type)}</strong></td>
                                    <td><span class="badge ${event.severity.toLowerCase()}">${event.severity}</span></td>
                                    <td>${escapeHtml(event.description.substring(0, 50))}${event.description.length > 50 ? '...' : ''}</td>
                                    <td>${event.source || '-'}</td>
                                    <td><span class="badge ${event.status === 'ACTIVE' ? 'warning' : 'success'}">${event.status}</span></td>
                                    <td>${formatDate(event.created_at)}</td>
                                    <td>
                                        ${event.status === 'ACTIVE' ? `
                                            <button class="btn btn-sm btn-secondary" onclick="resolveEvent(${event.id})">Resolve</button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Events load error:', error);
        showToast('Failed to load events', 'error');
    }
}

function showCreateEventModal() {
    openModal('Create Event', `
        <form id="createEventForm">
            <div class="form-group">
                <label class="form-label">Event Type</label>
                <input type="text" class="form-input" name="event_type" placeholder="e.g., SYSTEM_ALERT" required>
            </div>
            <div class="form-group">
                <label class="form-label">Severity</label>
                <select class="form-select" name="severity" required>
                    <option value="INFO">Info</option>
                    <option value="WARNING">Warning</option>
                    <option value="CRITICAL">Critical</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Source</label>
                <input type="text" class="form-input" name="source" placeholder="e.g., Server-01">
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-input" name="description" rows="3" required></textarea>
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitCreateEvent()">Create Event</button>
    `);
}

async function submitCreateEvent() {
    const form = document.getElementById('createEventForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        await fetchAPI('/events', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        closeModal();
        showToast('Event created successfully', 'success');
        loadEvents();
        loadAlertsCount();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// Users Page (Admin Only)
// ============================================

async function loadUsers() {
    if (currentUser.role !== 'ADMIN') {
        document.getElementById('contentArea').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-title">Access Denied</div>
                <div class="empty-state-text">You don't have permission to view this page</div>
            </div>
        `;
        return;
    }

    const content = document.getElementById('contentArea');
    
    try {
        const res = await fetchAPI('/users');
        const users = res.users;

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">User Management</div>
                        <div class="card-subtitle">${users.length} registered users</div>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="showCreateUserModal()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                        Add User
                    </button>
                </div>
                <div class="card-body no-padding">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Department</th>
                                <th>Last Login</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(user => `
                                <tr>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <div class="user-avatar" style="width: 32px; height: 32px; font-size: 12px;">
                                                ${user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <strong>${escapeHtml(user.name)}</strong>
                                        </div>
                                    </td>
                                    <td>${escapeHtml(user.email)}</td>
                                    <td><span class="badge ${user.role.toLowerCase()}">${user.role}</span></td>
                                    <td><span class="badge ${user.status.toLowerCase()}">${user.status}</span></td>
                                    <td>${user.department || '-'}</td>
                                    <td>${user.last_login ? formatDate(user.last_login) : 'Never'}</td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="showEditUserModal(${user.id})">Edit</button>
                                        ${user.id !== currentUser.id ? `
                                            <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Users load error:', error);
        showToast('Failed to load users', 'error');
    }
}

function showCreateUserModal() {
    openModal('Create New User', `
        <form id="createUserForm">
            <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-input" name="name" required>
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" name="email" required>
            </div>
            <div class="form-group">
                <label class="form-label">Password</label>
                <input type="password" class="form-input" name="password" minlength="8" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Role</label>
                    <select class="form-select" name="role" required>
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Department</label>
                    <input type="text" class="form-input" name="department">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" class="form-input" name="phone">
            </div>
        </form>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitCreateUser()">Create User</button>
    `);
}

async function submitCreateUser() {
    const form = document.getElementById('createUserForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        await fetchAPI('/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        closeModal();
        showToast('User created successfully', 'success');
        loadUsers();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function showEditUserModal(userId) {
    try {
        const res = await fetchAPI(`/users/${userId}`);
        const user = res.user;

        openModal('Edit User', `
            <form id="editUserForm">
                <input type="hidden" name="id" value="${user.id}">
                <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" class="form-input" name="name" value="${escapeHtml(user.name)}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Role</label>
                        <select class="form-select" name="role" required>
                            <option value="USER" ${user.role === 'USER' ? 'selected' : ''}>User</option>
                            <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>Admin</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-select" name="status" required>
                            <option value="ACTIVE" ${user.status === 'ACTIVE' ? 'selected' : ''}>Active</option>
                            <option value="INACTIVE" ${user.status === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Department</label>
                    <input type="text" class="form-input" name="department" value="${escapeHtml(user.department || '')}">
                </div>
                <div class="form-group">
                    <label class="form-label">Phone</label>
                    <input type="tel" class="form-input" name="phone" value="${escapeHtml(user.phone || '')}">
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="submitEditUser(${userId})">Save Changes</button>
        `);
    } catch (error) {
        showToast('Failed to load user details', 'error');
    }
}

async function submitEditUser(userId) {
    const form = document.getElementById('editUserForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
        await fetchAPI(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        closeModal();
        showToast('User updated successfully', 'success');
        loadUsers();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        await fetchAPI(`/users/${userId}`, { method: 'DELETE' });
        showToast('User deleted successfully', 'success');
        loadUsers();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// Audit Logs Page
// ============================================

async function loadAuditLogs() {
    const content = document.getElementById('contentArea');
    
    try {
        const res = await fetchAPI('/audit?limit=50');
        const logs = res.logs;

        content.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">Audit Logs</div>
                        <div class="card-subtitle">System activity history</div>
                    </div>
                    ${currentUser.role === 'ADMIN' ? `
                    <button class="btn btn-secondary btn-sm" onclick="exportAuditLogs()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export
                    </button>
                    ` : ''}
                </div>
                <div class="card-body no-padding">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                ${currentUser.role === 'ADMIN' ? '<th>User</th>' : ''}
                                <th>Action</th>
                                <th>Category</th>
                                <th>Description</th>
                                ${currentUser.role === 'ADMIN' ? '<th>IP Address</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td>${formatDateTime(log.created_at)}</td>
                                    ${currentUser.role === 'ADMIN' ? `<td>${escapeHtml(log.user_email || '-')}</td>` : ''}
                                    <td><span class="badge info">${formatActionName(log.action)}</span></td>
                                    <td>${log.category || '-'}</td>
                                    <td>${escapeHtml(log.description || '-')}</td>
                                    ${currentUser.role === 'ADMIN' ? `<td><code>${log.ip_address || '-'}</code></td>` : ''}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Audit logs load error:', error);
        showToast('Failed to load audit logs', 'error');
    }
}

async function exportAuditLogs() {
    try {
        const token = localStorage.getItem('kavach_token');
        const response = await fetch(`${API_BASE}/audit/export?format=csv`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_logs.csv';
        a.click();
        window.URL.revokeObjectURL(url);
        showToast('Audit logs exported', 'success');
    } catch (error) {
        showToast('Failed to export logs', 'error');
    }
}

// ============================================
// Settings Page
// ============================================

async function loadSettings() {
    const content = document.getElementById('contentArea');
    
    try {
        const res = await fetchAPI('/settings/profile');
        const profile = res.profile;

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Profile Settings</div>
                    </div>
                    <div class="card-body">
                        <form id="profileForm">
                            <div class="form-group">
                                <label class="form-label">Full Name</label>
                                <input type="text" class="form-input" name="name" value="${escapeHtml(profile.name)}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-input" value="${escapeHtml(profile.email)}" disabled>
                                <small style="color: var(--text-muted);">Email cannot be changed</small>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Department</label>
                                    <input type="text" class="form-input" name="department" value="${escapeHtml(profile.department || '')}">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Phone</label>
                                    <input type="tel" class="form-input" name="phone" value="${escapeHtml(profile.phone || '')}">
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary">Save Profile</button>
                        </form>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <div class="card-title">Change Password</div>
                    </div>
                    <div class="card-body">
                        <form id="passwordForm">
                            <div class="form-group">
                                <label class="form-label">Current Password</label>
                                <input type="password" class="form-input" name="currentPassword" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">New Password</label>
                                <input type="password" class="form-input" name="newPassword" minlength="8" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Confirm New Password</label>
                                <input type="password" class="form-input" name="confirmPassword" required>
                            </div>
                            <button type="submit" class="btn btn-primary">Change Password</button>
                        </form>
                    </div>
                </div>

                <div class="card" style="grid-column: span 2;">
                    <div class="card-header">
                        <div class="card-title">Account Information</div>
                    </div>
                    <div class="card-body">
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                            <div>
                                <div class="form-label">Role</div>
                                <span class="badge ${profile.role.toLowerCase()}">${profile.role}</span>
                            </div>
                            <div>
                                <div class="form-label">Account Created</div>
                                <span>${formatDate(profile.created_at)}</span>
                            </div>
                            <div>
                                <div class="form-label">Last Login</div>
                                <span>${profile.last_login ? formatDateTime(profile.last_login) : 'N/A'}</span>
                            </div>
                            <div>
                                <div class="form-label">User ID</div>
                                <code>${profile.id}</code>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Profile form handler
        document.getElementById('profileForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            try {
                await fetchAPI('/settings/profile', {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                
                // Update local storage
                currentUser.name = data.name;
                currentUser.department = data.department;
                currentUser.phone = data.phone;
                localStorage.setItem('kavach_user', JSON.stringify(currentUser));
                
                // Update UI
                document.getElementById('userName').textContent = data.name;
                document.getElementById('userAvatar').textContent = data.name.charAt(0).toUpperCase();
                
                showToast('Profile updated successfully', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });

        // Password form handler
        document.getElementById('passwordForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            if (data.newPassword !== data.confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }

            try {
                await fetchAPI('/settings/password', {
                    method: 'PUT',
                    body: JSON.stringify({
                        currentPassword: data.currentPassword,
                        newPassword: data.newPassword
                    })
                });
                this.reset();
                showToast('Password changed successfully', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        });

    } catch (error) {
        console.error('Settings load error:', error);
        showToast('Failed to load settings', 'error');
    }
}

// ============================================
// Helper Functions
// ============================================

async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('kavach_token');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        ...options
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        if (response.status === 401) {
            logout();
            throw new Error('Session expired');
        }
        throw new Error(data.error || 'Request failed');
    }

    return data;
}

function logout() {
    fetchAPI('/auth/logout', { method: 'POST' }).catch(() => {});
    localStorage.removeItem('kavach_token');
    localStorage.removeItem('kavach_user');
    window.location.href = '/index.html';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatActionName(action) {
    if (!action) return '-';
    return action.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getActivityIconClass(action) {
    if (!action) return 'system';
    if (action.includes('LOGIN')) return 'login';
    if (action.includes('LOGOUT')) return 'logout';
    if (action.includes('ALERT') || action.includes('CRITICAL')) return 'alert';
    return 'system';
}

function getActivityIcon(action) {
    const iconClass = getActivityIconClass(action);
    const icons = {
        login: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>',
        logout: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
        alert: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
        system: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
    };
    return icons[iconClass] || icons.system;
}

// ============================================
// Modal Functions
// ============================================

function openModal(title, body, footer = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalFooter').innerHTML = footer;
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

// Close modal on overlay click
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.warning}</div>
        <div class="toast-content">
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Make functions globally available
window.toggleSidebar = toggleSidebar;
window.logout = logout;
window.loadPage = loadPage;
window.closeModal = closeModal;
window.filterAlerts = filterAlerts;
window.resolveEvent = resolveEvent;
window.showCreateEventModal = showCreateEventModal;
window.submitCreateEvent = submitCreateEvent;
window.showCreateUserModal = showCreateUserModal;
window.submitCreateUser = submitCreateUser;
window.showEditUserModal = showEditUserModal;
window.submitEditUser = submitEditUser;
window.deleteUser = deleteUser;
window.exportAuditLogs = exportAuditLogs;
