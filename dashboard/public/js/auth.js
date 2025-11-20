/**
 * Authentication Module
 * Handles user login and session management
 */

const Auth = {
    currentUser: null,
    
    // Initialize authentication
    // Initialize authentication
    init() {
        // TEMPORARY: Skip authentication for testing
        console.log('[INFO] Bypassing authentication for testing');
        this.showDashboard();
        
        // Uncomment below to re-enable authentication
        // this.checkSession();
    },
    
    // Check if user is already logged in
    async checkSession() {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                this.showDashboard();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('[ERROR] Session check failed:', error.message);
            this.showLogin();
        }
    },
    
    // Login user
    async login(email, password) {
        const loginBtn = document.getElementById('login-btn');
        const errorDiv = document.getElementById('login-error');
        
        try {
            // Disable button during login
            loginBtn.disabled = true;
            loginBtn.textContent = 'Signing in...';
            errorDiv.classList.remove('show');
            
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            this.currentUser = data.user;
            console.log('[SUCCESS] User logged in:', data.user.email);
            this.showDashboard();
            
        } catch (error) {
            console.error('[ERROR] Login failed:', error.message);
            errorDiv.textContent = error.message || 'Login failed. Please check your credentials.';
            errorDiv.classList.add('show');
            
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign In';
        }
    },
    
    // Logout user
    async logout() {
        try {
            await window.supabase.auth.signOut();
            this.currentUser = null;
            console.log('[SUCCESS] User logged out');
            this.showLogin();
            
            // Stop dashboard refresh timer
            if (typeof Dashboard !== 'undefined') {
                Dashboard.stopAutoRefresh();
            }
            
        } catch (error) {
            console.error('[ERROR] Logout failed:', error.message);
        }
    },
    
    // Show login screen
    showLogin() {
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('dashboard-screen').classList.remove('active');
    },
    
    // Show dashboard screen
    showDashboard() {
        document.getElementById('login-screen').classList.remove('active');
        document.getElementById('dashboard-screen').classList.add('active');

        // Initialize dashboard after showing with validation
        if (typeof Dashboard !== 'undefined' && typeof CONFIG !== 'undefined') {
            Dashboard.init();
        } else {
            console.error('[ERROR] Dashboard or CONFIG not loaded properly');
            alert('Application failed to load. Please refresh the page.');
        }
    }
};