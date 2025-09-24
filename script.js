// Use centralized Firebase config (modular) exported from js/firebase-config.js
import { auth, db } from './js/firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';


// --- Global State Variables ---
let currentUser = null; // Firebase Auth user object
let userId = null;      // Firebase Auth UID
let userProfile = null; // User's profile data from Firestore
let loadingAuth = true; // Auth loading state
let currentPage = 'home'; // Current page being displayed
let isMobileMenuOpen = false; // State for mobile sidebar visibility (true = overlay shown)
let isSidebarVisible = true; // State for desktop sidebar visibility (true = expanded, false = hidden)
let announcements = []; // Global announcements array

let messageBoxTimeout = null; // For auto-hiding messages

// Setup button animations for all buttons in the current page
const setupButtonAnimations = () => {
    // Add click animations to all buttons with onclick attributes
    document.querySelectorAll('button[onclick]').forEach(button => {
        const originalOnclick = button.getAttribute('onclick');
        if (originalOnclick && !button._hasClickAnimation) {
            button._hasClickAnimation = true;
            button.removeAttribute('onclick');
            button.addEventListener('click', (event) => {
                // Add immediate visual feedback
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    button.style.transform = 'scale(1)';
                }, 150);
                
                // Execute the original onclick
                eval(originalOnclick);
            });
        }
    });
    
    // Add click animations to all buttons with class 'click-animate'
    document.querySelectorAll('.click-animate').forEach(button => {
        if (!button._hasClickAnimation) {
            button._hasClickAnimation = true;
            button.addEventListener('click', (event) => {
                // Add immediate visual feedback
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    button.style.transform = 'scale(1)';
                }, 150);
            });
        }
    });
};

// --- Utility Functions ---

// MessageBox - defensive message normalization to avoid displaying null/objects
const showMessageBox = (message, type = 'info') => {
    // Normalize message into a safe string
    let text;
    if (message === null || typeof message === 'undefined') {
        text = 'An unknown error occurred.';
    } else if (typeof message === 'object') {
        // Prefer .message if available, otherwise stringify safely
        text = message.message || JSON.stringify(message);
    } else {
        text = String(message);
    }

    let msgBox = document.getElementById('message-box');
    if (!msgBox) {
        msgBox = document.createElement('div');
        msgBox.id = 'message-box';
        msgBox.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg flex items-center space-x-2 z-50 transition-transform duration-300 transform translate-x-full';
        document.body.appendChild(msgBox); // Append to body, not appRoot, for consistent positioning
    }

    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    const textColor = 'text-white';
    const iconSvg = type === 'error'
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`;

    msgBox.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${bgColor} ${textColor} z-50 transition-transform duration-300 transform translate-x-0`;
    msgBox.innerHTML = `
        ${iconSvg}
        <span>${text}</span>
        <button id="close-message-box" class="ml-2 font-bold">&times;</button>
    `;

    // Ensure button exists before attaching listener
    const closeBtn = document.getElementById('close-message-box');
    if (closeBtn) {
        closeBtn.onclick = hideMessageBox;
    }

    if (messageBoxTimeout) {
        clearTimeout(messageBoxTimeout);
    }
    messageBoxTimeout = setTimeout(hideMessageBox, 5000); // Auto-hide after 5 seconds
};

const hideMessageBox = () => {
    const msgBox = document.getElementById('message-box');
    if (msgBox) {
        msgBox.classList.add('translate-x-full'); // Slide out
        msgBox.classList.remove('translate-x-0');
        if (messageBoxTimeout) {
            clearTimeout(messageBoxTimeout);
            messageBoxTimeout = null;
        }
    }
};

// ShieldIcon (Custom SVG)
const getShieldIconSVG = (size = 32, className = 'text-white') => {
    return `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="${size}"
        height="${size}"
        viewBox="0 0 24 24"
        fill="none"
        class="${className}"
    >
        <!-- Modern Shield with Gradient -->
        <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#8B5CF6;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#A855F7;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#C084FC;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FCD34D;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#F59E0B;stop-opacity:1" />
            </linearGradient>
            <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        <!-- Shield Background with modern styling -->
        <path 
            d="M12 22s8-4 8-10V4.5l-8-2.5-8 2.5v7.5c0 6 8 10 8 10z"
            fill="url(#shieldGradient)"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="0.5"
            filter="url(#glow)"
        />
        
        <!-- Modern Star in the center -->
        <path 
            d="M12 8l1.5 4.5H18l-3.5 2.5 1.5 4.5L12 17l-4 2.5 1.5-4.5L6 12.5h4.5z"
            fill="url(#starGradient)"
            stroke="rgba(255,255,255,0.8)"
            stroke-width="0.3"
        />
        
        <!-- Subtle highlight effect -->
        <path 
            d="M12 22s8-4 8-10V4.5l-8-2.5-8 2.5v7.5c0 6 8 10 8 10z"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="1"
            stroke-dasharray="2,2"
        />
    </svg>`;
};

// Alternative modern logo with minimalist design
const getModernLogo = (size = 32, className = 'text-white') => {
    return `<svg
        xmlns="http://www.w3.org/2000/svg"
        width="${size}"
        height="${size}"
        viewBox="0 0 24 24"
        fill="none"
        class="${className}"
    >
        <defs>
            <linearGradient id="modernGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#6366F1;stop-opacity:1" />
                <stop offset="50%" style="stop-color:#8B5CF6;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#A855F7;stop-opacity:1" />
            </linearGradient>
            <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FBBF24;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#F59E0B;stop-opacity:1" />
            </linearGradient>
            <filter id="modernGlow">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        
        <!-- Modern geometric shield -->
        <path 
            d="M12 2L20 6v6c0 5.5-3.8 10.7-8 12-4.2-1.3-8-6.5-8-12V6l8-4z"
            fill="url(#modernGradient)"
            stroke="rgba(255,255,255,0.2)"
            stroke-width="0.5"
            filter="url(#modernGlow)"
        />
        
        <!-- Modern badge/star element -->
        <circle cx="12" cy="10" r="2.5" fill="url(#accentGradient)" stroke="rgba(255,255,255,0.9)" stroke-width="0.3"/>
        
        <!-- Subtle geometric accent -->
        <path 
            d="M12 6l2 2-2 2-2-2z"
            fill="rgba(255,255,255,0.3)"
            stroke="rgba(255,255,255,0.5)"
            stroke-width="0.2"
        />
    </svg>`;
};

// Navbar (for mobile view only)
const renderNavbar = (onMobileMenuToggle) => {
    return `
        <nav id="mobile-navbar" class="bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 p-4 shadow-2xl relative z-40 md:hidden">
            <div class="container mx-auto flex justify-between items-center">
                <div class="text-white text-3xl font-extrabold tracking-wide flex items-center space-x-3">
                    ${getModernLogo(48, "text-purple-300 animate-float")} <!-- Larger size for Navbar logo -->
                    <span class="text-gradient">Prefectorial Board</span>
                </div>
                <button id="mobile-menu-toggle" class="text-white focus:outline-none hover:bg-white/10 p-2 rounded-lg transition-all duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                </button>
            </div>
        </nav>
        
        <!-- Desktop Navbar with Sidebar Toggle -->
        <nav id="desktop-navbar" class="bg-gradient-to-r from-purple-700 via-indigo-800 to-purple-900 p-4 shadow-2xl relative z-40 hidden md:block">
            <div class="container mx-auto flex justify-between items-center">
                <div class="text-white text-2xl font-extrabold tracking-wide flex items-center space-x-3">
                    ${getModernLogo(32, "text-purple-300 animate-float")}
                    <span class="text-gradient">Prefectorial Board</span>
                </div>
                <button id="desktop-sidebar-toggle" class="text-white focus:outline-none hover:bg-white/10 p-2 rounded-lg transition-all duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
                </button>
            </div>
        </nav>
        
        <!-- Floating Sidebar Toggle Button (when sidebar is collapsed) -->
        <button id="floating-sidebar-toggle" class="fixed top-4 left-4 z-50 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 rounded-full shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 hover:scale-110 md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
    `;
};

// Sidebar (handles both desktop and mobile overlay)
const renderSidebar = (currentLoggedInUser, onNavigate, onLogout, mobileOpen, sidebarVisible) => {
    const commonLinks = [
        { name: 'Home', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-home"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`, page: 'home' },
        { name: 'Duty & Council Info', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`, page: 'duty-council' },
        { name: 'Announcement Board', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-megaphone"><path d="m3 11 18-2L13 22 3 11Z"/><path d="M7 7v7"/><path d="M21 9v.5c0 .8-.5 1.5-1.3 1.8l-4 1.2c-.7.2-1.5.1-2.1-.3l-.7-.9c-.5-.6-1.3-1-2.2-1H3"/></svg>`, page: 'announcements' },
        { name: 'My Profile', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`, page: 'profile' }
    ];

    const prefectLinks = [];
    const councilLinks = [{ name: 'Rate Prefects', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12 2"/></svg>`, page: 'rate-prefects' }];
    const teacherLinks = [{ name: 'Rate Members', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12 2"/></svg>`, page: 'rate-prefects' }];

    let navLinks = [];
    if (currentLoggedInUser) {
        navLinks = [...commonLinks];
        if (currentLoggedInUser.role.startsWith('council')) {
            navLinks = [...navLinks, ...councilLinks];
        } else if (currentLoggedInUser.role === 'teacher') {
            navLinks = [...navLinks, ...teacherLinks];
        }
    }

    // Base classes for sidebar container
    const sidebarBaseClasses = "flex-col bg-gradient-to-b from-gray-800 via-gray-900 to-gray-800 text-white shadow-2xl fixed top-0 left-0 z-30 transition-all duration-300 ease-in-out h-screen";
    const sidebarMobileClasses = "fixed inset-0 flex w-full h-full p-6 py-10 animate-fade-in-left z-50"; // Full mobile overlay
    const sidebarDesktopCollapsedClasses = "md:w-20 md:overflow-hidden md:items-center"; // Collapsed desktop: fixed width, hide overflow, center items
    const sidebarDesktopExpandedClasses = "md:w-80 md:flex"; // Expanded desktop: wider fixed width, flex display

    let finalDisplayClasses = '';
    if (isMobileMenuOpen) { // Mobile overlay takes precedence
        finalDisplayClasses = sidebarMobileClasses;
    } else if (sidebarVisible) { // Desktop visible
        finalDisplayClasses = sidebarDesktopExpandedClasses;
    } else { // Desktop hidden/collapsed
        finalDisplayClasses = 'md:hidden'; // Completely hide when collapsed
    }
    // Add `hidden` class for desktop if it's supposed to be completely hidden
    finalDisplayClasses += sidebarVisible || mobileOpen ? '' : ' md:hidden';

    // --- Elements inside sidebar need conditional display based on `sidebarVisible` state (for desktop) ---
    const isTextVisible = mobileOpen || sidebarVisible; // Text content visible on mobile overlay OR expanded desktop sidebar

    // Enhanced spacing and layout for better visual hierarchy
    const logoAndTitleContainerClasses = `flex items-center space-x-3 ${mobileOpen ? 'mb-8 mt-6' : 'mb-8 mt-6'} ${isTextVisible ? 'justify-start' : 'justify-center'} px-6 py-4 pr-20`; // Increased pr-20 to give more space for toggle button
    const logoSize = mobileOpen ? 48 : 44; // Slightly larger logo
    const titleTextSize = mobileOpen ? 'text-3xl' : 'text-2xl';
    const titleDisplayClass = isTextVisible ? 'block' : 'hidden'; // Hide title text when collapsed

    const userProfileInfoContainerClasses = `text-center ${mobileOpen ? 'mb-8' : 'mb-8'} px-6 py-4`;
    const userImageSizeClasses = mobileOpen ? 'w-24 h-24' : 'w-20 h-20';
    const userNameSizeClasses = mobileOpen ? 'text-xl' : 'text-lg';
    const userRoleSizeClasses = mobileOpen ? 'text-base' : 'text-sm';
    const userInfoDisplayClass = isTextVisible ? 'block' : 'hidden'; // Hide user info when collapsed

    const navContainerClasses = `flex-grow ${mobileOpen ? 'space-y-4' : 'space-y-3'} px-6 py-4 overflow-y-auto`;
    const navButtonBaseClasses = "flex items-center space-x-4 w-full text-left font-medium py-4 px-4 rounded-xl hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-purple-500/30 transform transition-transform duration-150";
    const navButtonMobileClasses = "text-white text-xl font-semibold";
    const navButtonDesktopClasses = "text-base text-white";
    const navIconSize = mobileOpen ? 24 : 22;
    const navTextDisplayClass = isTextVisible ? 'block' : 'hidden'; // Hide nav text when collapsed

    const logoutContainerClasses = mobileOpen ? 'mt-8' : 'mt-8';
    const logoutButtonBaseClasses = "flex items-center space-x-4 w-full text-left font-medium py-4 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-300 ease-in-out shadow-lg hover:shadow-xl transform hover:scale-105";
    const logoutButtonMobileClasses = "text-white text-xl font-semibold";
    const logoutButtonDesktopClasses = "text-base text-white";
    const logoutIconSize = mobileOpen ? 24 : 22;
    const logoutTextDisplayClass = isTextVisible ? 'block' : 'hidden'; // Hide logout text when collapsed

    // Fixed: Better toggle button positioning - moved more inside the sidebar
    const sidebarToggleButtonClasses = `absolute top-4 right-6 hidden md:block p-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-full shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 hover:scale-110 z-10`;
    const sidebarToggleButtonIcon = sidebarVisible
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>`;


    return `
        <div class="${sidebarBaseClasses} ${finalDisplayClasses}">
            <!-- Close button for mobile overlay -->
            ${mobileOpen ? `<button id="close-mobile-menu" class="absolute top-4 right-4 text-white md:hidden z-20 p-2 hover:bg-white/10 rounded-lg transition-all duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>` : ''}
            
            <!-- Sidebar Toggle Button (Desktop) -->
            <button id="sidebar-toggle-btn-internal" class="${sidebarToggleButtonClasses}">
                ${sidebarToggleButtonIcon}
            </button>

            <!-- Logo and App Title -->
            <div class="${logoAndTitleContainerClasses}">
                ${getModernLogo(logoSize, "text-purple-300")}
                <span class="${titleTextSize} font-extrabold text-white ${titleDisplayClass}">Prefectorial Board</span>
            </div>
            
            <!-- Slogan -->
            <div class="text-center ${mobileOpen ? 'mb-8' : 'mb-6'} px-6 py-3 ${isTextVisible ? 'block' : 'hidden'}">
                <p class="text-purple-300 font-medium italic text-lg leading-tight border-l-4 border-purple-500 pl-4">
                    "Once A Prefect, Forever A Prefect"
                </p>
            </div>
            
            <!-- User Profile Info -->
            ${currentLoggedInUser ? `
            <div class="${userProfileInfoContainerClasses} ${userInfoDisplayClass}">
                <div class="relative">
                    <img src="${currentLoggedInUser.photoUrl}" alt="${currentLoggedInUser.name}" class="rounded-full object-cover mx-auto mb-3 border-4 border-purple-500 shadow-lg ${userImageSizeClasses}" onerror="this.onerror=null;this.src='https://placehold.co/120x120/A78BFA/ffffff?text=${currentLoggedInUser.name.charAt(0).toUpperCase()}'" />
                    <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <h3 class="${userNameSizeClasses} font-semibold text-white mb-1">${currentLoggedInUser.name}</h3>
                <p class="${userRoleSizeClasses} text-purple-300 capitalize">${currentLoggedInUser.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Penerangan Kerohanian', 'Penerangan & Kerohanian')}</p>
            </div>
            ` : ''}

            <!-- Navigation Links -->
            <nav class="${navContainerClasses}">
                ${navLinks.map(link => {
                    const isActive = currentPage === link.page;
                    const activeClasses = isActive ? 'bg-purple-600 border-purple-400 shadow-lg' : 'hover:bg-white/10 border-transparent';
                    const activeTextClasses = isActive ? 'text-white font-semibold' : 'text-white';
                    
                    return `
                    <button
                        data-page="${link.page}"
                            class="sidebar-nav-btn ${navButtonBaseClasses} ${mobileOpen ? navButtonMobileClasses : navButtonDesktopClasses} ${isTextVisible ? 'justify-start' : 'justify-center'} ${activeClasses}"
                    >
                            <div class="flex-shrink-0">
                        ${link.icon}
                            </div>
                            <span class="${navTextDisplayClass} flex-1 ${activeTextClasses}">${link.name}</span>
                            ${isActive ? `
                                <div class="flex-shrink-0 w-2 h-2 bg-white rounded-full ${navTextDisplayClass}"></div>
                            ` : ''}
                    </button>
                    `;
                }).join('')}
            </nav>

            <!-- Logout Button -->
            ${currentLoggedInUser ? `
            <div class="${logoutContainerClasses} px-4 py-2">
                <button
                    id="logout-btn"
                    class="${logoutButtonBaseClasses} ${mobileOpen ? logoutButtonMobileClasses : logoutButtonDesktopClasses} ${isTextVisible ? 'justify-start' : 'justify-center'}"
                >
                    <div class="flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="17 17 22 12 17 7"/><line x1="22" x2="10" y1="12" y2="12"/></svg>
                    </div>
                    <span class="${logoutTextDisplayClass} flex-1">Logout</span>
                </button>
            </div>
            ` : ''}
        </div>
    `;
    
    // Setup animations for buttons in this page
    setupButtonAnimations();
};

// --- Page Rendering Functions (equivalent to src/pages/*) ---

// LoginPage
const renderLoginPage = () => {
    const appRoot = document.getElementById('app-root');
    appRoot.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-indigo-900 p-4 w-full">
            <div class="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md transform transition-all duration-300 ease-in-out hover:scale-105">
                <h2 id="login-signup-title" class="text-4xl font-extrabold text-center text-gray-800 mb-8">
                    Welcome Back!
                </h2>
                <form id="auth-form" class="space-y-6">
                    <div>
                        <label for="email" class="block text-gray-700 text-sm font-semibold mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                            placeholder="your.email@example.com"
                            required
                            ${loadingAuth ? 'disabled' : ''}
                        />
                    </div>
                    <div>
                        <label for="password" class="block text-gray-700 text-sm font-semibold mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                            placeholder="********"
                            required
                            ${loadingAuth ? 'disabled' : ''}
                        />
                    </div>

                    <div id="signup-fields" style="display: none;">
                        <div>
                            <label for="userName" class="block text-gray-700 text-sm font-semibold mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                id="userName"
                                class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                placeholder="Your Full Name"
                                ${loadingAuth ? 'disabled' : ''}
                            />
                        </div>
                        <div>
                            <label for="role" class="block text-gray-700 text-sm font-semibold mb-2">
                                Select Role
                            </label>
                            <select
                                id="role"
                                class="w-full px-5 py-3 border border-gray-300 rounded-xl bg-white focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                ${loadingAuth ? 'disabled' : ''}
                            >
                                <option value="prefect">Prefect</option>
                                <option value="council">Council Member</option>
                                <option value="teacher">Teacher</option>
                            </select>
                        </div>

                        <div id="council-role-div" style="display: none;">
                            <label for="councilRole" class="block text-gray-700 text-sm font-semibold mb-2">
                                Specific Council Role
                            </label>
                            <select
                                id="councilRole"
                                class="w-full px-5 py-3 border border-gray-300 rounded-xl bg-white focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                ${loadingAuth ? 'disabled' : ''}
                            >
                                <option value="">-- Select Specific Council Role --</option>
                                <option value="council_ketua">Ketua Pengawas</option>
                                <option value="council_timbalan_i">Timbalan Ketua Pengawas I</option>
                                <option value="council_timbalan_ii">Timbalan Ketua Pengawas II</option>
                                <option value="council_setiausaha_kehormat_i">Setiausaha Kehormat I</option>
                                <option value="council_setiausaha_kehormat_ii">Setiausaha Kehormat II</option>
                                <option value="council_bendahari_kehormat_i">Bendahari Kehormat I</option>
                                <option value="council_bendahari_kehormat_ii">Bendahari Kehormat II</option>
                                <option value="council_konsul_disiplin_i">Konsul Disiplin I</option>
                                <option value="council_konsul_disiplin_ii">Konsul Disiplin II</option>
                                <option value="council_keselamatan_i">Konsul Keselamatan I</option>
                                <option value="council_keselamatan_ii">Konsul Keselamatan II</option>
                                <option value="council_penerangan_kerohanian_i">Konsul Penerangan & Kerohanian I</option>
                                <option value="council_penerangan_kerohanian_ii">Konsul Penerangan & Kerohanian II</option>
                                <option value="council_pendidikan_keceriaan_i">Konsul Pendidikan & Keceriaan I</option>
                                <option value="council_pendidikan_keceriaan_ii">Konsul Pendidikan & Keceriaan II</option>
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        id="auth-submit-btn"
                        class="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-3 rounded-xl hover:from-purple-700 hover:to-indigo-800 transition duration-300 ease-in-out font-bold text-lg shadow-lg transform hover:-translate-y-1"
                        ${loadingAuth ? 'disabled' : ''}
                    >
                        Login
                    </button>
                </form>

                <p class="mt-8 text-center text-gray-600">
                    <span id="login-signup-toggle-text">Don't have an account?</span>
                    <button
                        id="login-signup-toggle-btn"
                        class="text-purple-600 hover:text-purple-800 font-bold transition-colors duration-200 ml-1"
                        ${loadingAuth ? 'disabled' : ''}
                    >
                        Sign Up Now
                    </button>
                </p>
            </div>
        </div>
    `;

    // Event Listeners for LoginPage
    const authForm = document.getElementById('auth-form');
    const toggleBtn = document.getElementById('login-signup-toggle-btn');
    const toggleText = document.getElementById('login-signup-toggle-text');
    const submitBtn = document.getElementById('auth-submit-btn');
    const signupFields = document.getElementById('signup-fields');
    const roleSelect = document.getElementById('role');
    const councilRoleDiv = document.getElementById('council-role-div');
    let isLoginMode = true; // Internal state for login mode

    const updateFormMode = () => {
        if (isLoginMode) {
            toggleText.textContent = "Don't have an account?";
            toggleBtn.textContent = "Sign Up Now";
            submitBtn.textContent = "Login";
            document.getElementById('login-signup-title').textContent = "Welcome Back!";
            signupFields.style.display = 'none';
            councilRoleDiv.style.display = 'none'; // Hide council role if not in signup/council mode
        } else {
            toggleText.textContent = "Already have an account?";
            toggleBtn.textContent = "Login Here";
            submitBtn.textContent = "Create Account";
            document.getElementById('login-signup-title').textContent = "Join the Board";
            signupFields.style.display = 'block';
            if (roleSelect.value === 'council') {
                councilRoleDiv.style.display = 'block';
            }
        }
    };

    toggleBtn.onclick = (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        updateFormMode();
        // Clear fields on mode switch for a cleaner experience
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
        if (document.getElementById('userName')) document.getElementById('userName').value = '';
        if (document.getElementById('role')) document.getElementById('role').value = 'prefect';
        if (document.getElementById('councilRole')) document.getElementById('councilRole').value = '';
        hideMessageBox();
    };

    roleSelect.onchange = () => {
        if (roleSelect.value === 'council') {
            councilRoleDiv.style.display = 'block';
            document.getElementById('councilRole').required = true;
        } else {
            councilRoleDiv.style.display = 'none';
            document.getElementById('councilRole').required = false;
        }
    };

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        hideMessageBox(); // Clear previous messages
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        let success = false;
        let error = 'An unknown error occurred.';

        if (isLoginMode) {
            if (!email || !password) {
                showMessageBox('Please enter both email and password.', 'error');
                return;
            }
            try {
                await attemptLogin(e);
                success = true;
            } catch (errObj) {
                success = false;
                error = (errObj && (errObj.message || String(errObj))) || 'Failed to login.';
            }
        } else {
            const userName = document.getElementById('userName').value;
            if (!email || !password || !userName.trim()) {
                showMessageBox('Please fill in all required fields (Email, Password, User Name).', 'error');
                return;
            }
            if (password.length < 6) {
                showMessageBox('Password should be at least 6 characters long.', 'error');
                return;
            }

            let finalRole = roleSelect.value;
            if (roleSelect.value === 'council') {
                const councilRole = document.getElementById('councilRole').value;
                if (!councilRole) {
                    showMessageBox('Please select a specific council role.', 'error');
                    return;
                }
                finalRole = councilRole;
            }

            try {
                await attemptSignup(e);
                success = true;
            } catch (errObj) {
                success = false;
                error = (errObj && (errObj.message || String(errObj))) || 'Failed to create account.';
            }
        }

        if (success) {
            showMessageBox(isLoginMode ? 'Login successful!' : 'Account created successfully! You are now logged in.', 'info');
            // Auth state change listener will handle page redirection
        } else {
            showMessageBox(error || 'An unknown error occurred.', 'error');
        }
    };

    updateFormMode(); // Initialize form mode on render
};

// HomePage
const renderHomePage = async (currentUserProfile) => {
    const mainContentDiv = document.getElementById('main-content');
    if (!mainContentDiv) return;

    // Check user roles
    const isTeacher = currentUserProfile.role === 'teacher';
    const isCouncil = currentUserProfile.role && currentUserProfile.role.startsWith('council');
    const isPrefect = currentUserProfile.role === 'prefect';

    console.log('renderHomePage - User role:', currentUserProfile.role);
    console.log('renderHomePage - isTeacher:', isTeacher, 'isCouncil:', isCouncil, 'isPrefect:', isPrefect);
    
    if (isTeacher) {
        console.log('Rendering teacher dashboard');
        // Teacher Dashboard - simplified for now
        mainContentDiv.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 py-12">
                <h1 class="text-4xl font-bold text-purple-700 mb-6">Teacher Dashboard</h1>
                <p class="text-lg text-gray-600 mb-4">Welcome, ${currentUserProfile.name}!</p>
                <div class="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
                    <p>Teacher dashboard content will be implemented here.</p>
                </div>
            </div>
        `;
    } else if (isCouncil || isPrefect) {
        console.log('Rendering council/prefect dashboard for:', currentUserProfile.role);
        
        // Council and Prefect Dashboard with real data
        let totalAnnouncements = 0;
        let recentAnnouncements = [];
        let myRating = currentUserProfile.averageRating || 0;
        let totalRatings = currentUserProfile.totalRatings || 0;
        
        try {
            // Get announcements data
            const announcementsRef = collection(db, 'announcements');
            const announcementQuery = query(announcementsRef, orderBy('createdAt', 'desc'), limit(5));
            const announcementSnapshot = await getDocs(announcementQuery);
            
            totalAnnouncements = announcementSnapshot.size;
            
            announcementSnapshot.forEach((doc) => {
                const data = doc.data();
                const timeAgo = getTimeAgo(data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt));
                recentAnnouncements.push({
                    title: data.title,
                    time: timeAgo,
                    creator: data.creatorName
                });
            });
            
        } catch (error) {
            console.error('Error fetching council/prefect dashboard data:', error);
        }
        
        const roleDisplayName = currentUserProfile.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Penerangan Kerohanian', 'Penerangan & Kerohanian');
        const showPerformance = isPrefect || isCouncil;
        
        mainContentDiv.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 py-12">
                <!-- Welcome Section -->
                <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-10">
                    <div>
                        <div class="mb-2">
                            <span class="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">Welcome back, ${isCouncil ? 'Council Member' : 'Prefect'}!</span>
                        </div>
                        <h1 class="text-5xl font-extrabold text-gray-900 mb-2">Hello, ${currentUserProfile.name}</h1>
                        <p class="text-lg text-gray-600 mb-4">Ready to make today amazing as a <span class="font-bold text-purple-700">${roleDisplayName}</span>?</p>
                        <div class="flex space-x-4">
                            <button onclick="handleNavigate('duty-council')" class="click-animate bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300">View Today's Duties</button>
                            <button onclick="handleNavigate('announcements')" class="click-animate bg-white border border-purple-200 text-purple-700 px-6 py-3 rounded-xl font-semibold shadow hover:bg-purple-50 transition-all duration-300">Check Announcements</button>
                        </div>
                    </div>
                    <div class="mt-8 md:mt-0">
                        ${showPerformance ? `
                        <div class="bg-gradient-to-br from-yellow-400 to-orange-400 rounded-3xl shadow-xl p-8 flex flex-col items-center">
                            <span class="text-white text-2xl font-bold mb-2">Your Performance</span>
                            <span class="text-6xl font-extrabold text-white mb-2">${myRating.toFixed(1)}</span>
                            <span class="text-white text-lg font-medium">Outstanding Rating</span>
                            <span class="text-white text-sm mt-2">${totalRatings} ratings received</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Quick Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Check Duties</p>
                                <p class="text-lg font-bold text-gray-900">View Schedule</p>
                            </div>
                            <div class="bg-purple-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-600"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">Total Announcements</p>
                                <p class="text-3xl font-bold text-gray-900">${totalAnnouncements}</p>
                            </div>
                            <div class="bg-green-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="m3 11 18-2L13 22 3 11Z"/><path d="M7 7v7"/><path d="M21 9v.5c0 .8-.5 1.5-1.3 1.8l-4 1.2c-.7.2-1.5.1-2.1-.3l-.7-.9c-.5-.6-1.3-1-2.2-1H3"/></svg>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">My Rating</p>
                                <p class="text-3xl font-bold text-gray-900">${myRating.toFixed(1)}</p>
                            </div>
                            <div class="bg-yellow-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-600"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm font-medium text-gray-600">My Role</p>
                                <p class="text-lg font-bold text-gray-900">${roleDisplayName}</p>
                            </div>
                            <div class="bg-blue-100 p-3 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Content Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Recent Announcements -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-600"><path d="m3 11 18-2L13 22 3 11Z"/><path d="M7 7v7"/><path d="M21 9v.5c0 .8-.5 1.5-1.3 1.8l-4 1.2c-.7.2-1.5.1-2.1-.3l-.7-.9c-.5-.6-1.3-1-2.2-1H3"/></svg>
                            <span>Recent Announcements</span>
                        </h2>
                        <div class="space-y-4">
                            ${recentAnnouncements.length > 0 ? recentAnnouncements.map(announcement => `
                                <div class="flex items-center space-x-3 p-3 bg-purple-50 rounded-xl">
                                    <div class="bg-purple-500 p-2 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="m3 11 18-2L13 22 3 11Z"/><path d="M7 7v7"/><path d="M21 9v.5c0 .8-.5 1.5-1.3 1.8l-4 1.2c-.7.2-1.5.1-2.1-.3l-.7-.9c-.5-.6-1.3-1-2.2-1H3"/></svg>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900">${announcement.title}</p>
                                        <p class="text-sm text-gray-600">${announcement.time} • By ${announcement.creator}</p>
                                    </div>
                                </div>
                            `).join('') : `
                                <div class="text-center py-8 text-gray-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-gray-300"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                                    <p>No recent announcements</p>
                                </div>
                            `}
                        </div>
                    </div>

                    <!-- My Duties & Tasks -->
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <h2 class="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-600"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/></svg>
                            <span>My Duties & Tasks</span>
                        </h2>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                                <div class="flex items-center space-x-3">
                                    <div class="bg-blue-500 p-2 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900">Check duty schedule</p>
                                        <p class="text-sm text-gray-600">View today's duties and assignments</p>
                                    </div>
                                </div>
                                <button onclick="handleNavigate('duty-council')" class="click-animate bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">View</button>
                            </div>
                            
                            ${isCouncil ? `
                                <div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                                    <div class="flex items-center space-x-3">
                                        <div class="bg-blue-500 p-2 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                                        </div>
                                        <div>
                                            <p class="font-semibold text-gray-900">Rate prefects</p>
                                            <p class="text-sm text-gray-600">Provide feedback to prefects</p>
                                        </div>
                                    </div>
                                    <button onclick="handleNavigate('rate-prefects')" class="click-animate bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">Rate</button>
                                </div>
                            ` : ''}
                            
                            <div class="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
                                <div class="flex items-center space-x-3">
                                    <div class="bg-purple-500 p-2 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900">View my profile</p>
                                        <p class="text-sm text-gray-600">Check my information and ratings</p>
                                    </div>
                                </div>
                                <button onclick="handleNavigate('profile')" class="click-animate bg-purple-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors">View</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        console.log('No condition matched! Rendering fallback content');
        mainContentDiv.innerHTML = `
            <div class="max-w-4xl mx-auto px-6 py-12">
                <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-red-500"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <h2 class="text-2xl font-bold text-red-700 mb-2">Error</h2>
                    <p class="text-red-600">Unable to determine user role for home page rendering.</p>
                    <p class="text-red-500 text-sm mt-2">Role: ${currentUserProfile?.role || 'undefined'}</p>
                </div>
            </div>
        `;
    }
    
    console.log('Home page rendering complete');
    setupButtonAnimations();
};

// Profile setup page (for completing minimal auto-created profiles)
const renderProfileSetupPage = () => {
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    appRoot.innerHTML = `
        <div class="max-w-3xl mx-auto p-8">
            <h1 class="text-3xl font-bold mb-4">Complete your profile</h1>
            <p class="mb-6 text-gray-600">A few more details to finish setting up your account.</p>
            <form id="profile-setup-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Full name</label>
                    <input id="profile-name" name="name" type="text" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${userProfile.name || ''}" required />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Role</label>
                    <select id="profile-role" name="role" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                        <option value="prefect" ${userProfile.role === 'prefect' ? 'selected' : ''}>Prefect</option>
                        <option value="council_ketua" ${userProfile.role === 'council_ketua' ? 'selected' : ''}>Council - Ketua</option>
                        <option value="teacher" ${userProfile.role === 'teacher' ? 'selected' : ''}>Teacher</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Photo URL (optional)</label>
                    <input id="profile-photo" name="photoUrl" type="url" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" value="${userProfile.photoUrl || ''}" />
                </div>
                <div class="flex items-center space-x-4">
                    <button id="save-profile-btn" class="px-4 py-2 bg-purple-600 text-white rounded">Save and Continue</button>
                    <button id="skip-profile-btn" class="px-4 py-2 bg-gray-200 rounded">Skip for now</button>
                </div>
            </form>
        </div>
    `;

    // Form handlers
    const form = document.getElementById('profile-setup-form');
    form.onsubmit = handleProfileSave;
    document.getElementById('skip-profile-btn').onclick = (e) => {
        e.preventDefault();
        // Mark profile as complete but leave defaults
        (async () => {
            try {
                const updated = { ...userProfile, isProfileComplete: true };
                await setDoc(doc(db, 'userProfiles', userProfile.uid), updated, { merge: true });
                userProfile = updated;
                renderApp();
            } catch (err) {
                console.error('Error skipping profile setup:', err);
                showMessageBox('Failed to skip profile setup. Please try again.', 'error');
            }
        })();
    };
};

// Handle saving the profile setup form
const handleProfileSave = async (event) => {
    event.preventDefault();
    const name = document.getElementById('profile-name').value.trim();
    const role = document.getElementById('profile-role').value;
    const photoUrl = document.getElementById('profile-photo').value.trim() || userProfile.photoUrl || null;

    if (!name) {
        showMessageBox('Please enter your full name.', 'error');
        return;
    }

    try {
        showMessageBox('Saving profile...', 'info');
        const updated = {
            ...userProfile,
            name,
            role,
            photoUrl,
            isProfileComplete: true
        };
        await setDoc(doc(db, 'userProfiles', userProfile.uid), updated, { merge: true });
        userProfile = updated;
        showMessageBox('Profile updated successfully!', 'success');
        // Continue to main app
        renderApp();
    } catch (err) {
        console.error('handleProfileSave: Error updating profile', err);
        showMessageBox('Failed to save profile. Please try again.', 'error');
    }
};

// Duty & Council Info Page
const renderDutyCouncilPage = (currentUserProfile) => {
    const mainContentDiv = document.getElementById('main-content');
    if (!mainContentDiv) return;

    const isTeacher = currentUserProfile.role === 'teacher';

    mainContentDiv.innerHTML = `
        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-bold text-purple-700 flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list text-purple-600"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
                    <span>Duty & Council Information</span>
                </h1>
                ${isTeacher ? `
                    <div class="flex space-x-3">
                        <button onclick="handleAddCouncilMember()" class="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                            <span>Add Member</span>
                        </button>
                        <button onclick="handleEditCouncilList()" class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            <span>Edit List</span>
                        </button>
                    </div>
                ` : ''}
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-1 gap-8">
                <!-- Council Members -->
                <div class="w-9/10 mx-auto">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900">Council Members</h2>
                            ${isTeacher ? `
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm text-gray-600">Teacher Access:</span>
                                    <span class="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">Full Control</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'jeriel\')"' : ''}>
                                <img src="https://placehold.co/48x48/A78BFA/fff?text=JL" class="w-12 h-12 rounded-full border-2 border-purple-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Jeriel Ling Heng Xu</p>
                                    <p class="text-sm text-purple-600">Ketua Pengawas Junior</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'kelvin\')"' : ''}>
                                <img src="https://placehold.co/48x48/60A5FA/fff?text=KL" class="w-12 h-12 rounded-full border-2 border-blue-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Kelvin Ling Lee Jie</p>
                                    <p class="text-sm text-blue-600">Timbalan Ketua Pengawas I</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'clarence\')"' : ''}>
                                <img src="https://placehold.co/48x48/34D399/fff?text=CL" class="w-12 h-12 rounded-full border-2 border-green-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Clarence Lee Meng Ang</p>
                                    <p class="text-sm text-green-600">Timbalan Ketua Pengawas II</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'jonathan\')"' : ''}>
                                <img src="https://placehold.co/48x48/3B82F6/fff?text=JT" class="w-12 h-12 rounded-full border-2 border-blue-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Jonathan Ting Lian Jing</p>
                                    <p class="text-sm text-blue-600">Setiausaha Kehormat I</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'benjamin\')"' : ''}>
                                <img src="https://placehold.co/48x48/06B6D4/fff?text=BT" class="w-12 h-12 rounded-full border-2 border-cyan-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Benjamin Tay Liang Xiao</p>
                                    <p class="text-sm text-cyan-600">Setiausaha Kehormat II</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'ansom\')"' : ''}>
                                <img src="https://placehold.co/48x48/14B8A6/fff?text=AW" class="w-12 h-12 rounded-full border-2 border-teal-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Ansom Wong Jun Jie</p>
                                    <p class="text-sm text-teal-600">Bendahari Kehormat I</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'ling\')"' : ''}>
                                <img src="https://placehold.co/48x48/10B981/fff?text=LK" class="w-12 h-12 rounded-full border-2 border-emerald-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Ling Kuon Fon</p>
                                    <p class="text-sm text-emerald-600">Bendahari Kehormat II</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'cristian\')"' : ''}>
                                <img src="https://placehold.co/48x48/F97316/fff?text=CL" class="w-12 h-12 rounded-full border-2 border-orange-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Cristian Labon</p>
                                    <p class="text-sm text-orange-600">Konsul Disiplin I</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'ivan\')"' : ''}>
                                <img src="https://placehold.co/48x48/EF4444/fff?text=IW" class="w-12 h-12 rounded-full border-2 border-red-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Ivan Wong</p>
                                    <p class="text-sm text-red-600">Konsul Disiplin II</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'morgan\')"' : ''}>
                                <img src="https://placehold.co/48x48/EC4899/fff?text=MN" class="w-12 h-12 rounded-full border-2 border-pink-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Morgan Noah</p>
                                    <p class="text-sm text-pink-600">Konsul Keselamatan I</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'ozgon\')"' : ''}>
                                <img src="https://placehold.co/48x48/F43F5E/fff?text=ON" class="w-12 h-12 rounded-full border-2 border-rose-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Ozgon Ngu</p>
                                    <p class="text-sm text-rose-600">Konsul Keselamatan II</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'abraham\')"' : ''}>
                                <img src="https://placehold.co/48x48/EAB308/fff?text=AT" class="w-12 h-12 rounded-full border-2 border-yellow-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Abraham Ting Lik Yue</p>
                                    <p class="text-sm text-yellow-600">Konsul Penerangan & Kerohanian I</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'bryan\')"' : ''}>
                                <img src="https://placehold.co/48x48/D97706/fff?text=BW" class="w-12 h-12 rounded-full border-2 border-amber-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Bryan Wong Qi Lun</p>
                                    <p class="text-sm text-amber-600">Konsul Penerangan & Kerohanian II</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'phan\')"' : ''}>
                                <img src="https://placehold.co/48x48/84CC16/fff?text=PY" class="w-12 h-12 rounded-full border-2 border-lime-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Phan Yi Cheng</p>
                                    <p class="text-sm text-lime-600">Konsul Pendidikan & Kecerian I</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors ${isTeacher ? 'cursor-pointer' : ''}" ${isTeacher ? 'onclick="handleEditCouncilMember(\'asyri\')"' : ''}>
                                <img src="https://placehold.co/48x48/64748B/fff?text=AS" class="w-12 h-12 rounded-full border-2 border-slate-400" />
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-900">Asyri Syukri</p>
                                    <p class="text-sm text-slate-600">Konsul Pendidikan & Kecerian II</p>
                                </div>
                                ${isTeacher ? `
                                    <button class="text-gray-400 hover:text-blue-600 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    setupButtonAnimations();
};

// Announcement Board Page
const renderAnnouncementBoard = async (currentUserProfile) => {
    const mainContentDiv = document.getElementById('main-content');
    if (!mainContentDiv) return;

    // Debug: Log the user's role to help identify the issue
    console.log('Announcement Board - User Role:', currentUserProfile.role);
    
    // Check if user can create announcements (only specific roles)
    const canCreateAnnouncement = currentUserProfile.role === 'teacher' || 
                                 currentUserProfile.role === 'council_ketua' ||
                                 currentUserProfile.role === 'council_timbalan_i' ||
                                 currentUserProfile.role === 'council_timbalan_ii' ||
                                 currentUserProfile.role === 'council_penerangan_kerohanian_i' ||
                                 currentUserProfile.role === 'council_penerangan_kerohanian_ii';
    
    console.log('Can create announcement:', canCreateAnnouncement);

    // Function to check if announcement is one day old
    const isOneDayOld = (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffTime = now - created;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays >= 1;
    };

    // Function to check if announcement should be deleted (more than one day old)
    const shouldDelete = (createdAt) => {
        const now = new Date();
        const created = new Date(createdAt);
        const diffTime = now - created;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);
        return diffDays > 1;
    };

    // Function to clean up old announcements
    const cleanupOldAnnouncements = () => {
        announcements = announcements.filter(announcement => !shouldDelete(announcement.createdAt));
    };

    // Get announcement-related tasks
    let announcementTasks = [];
    try {
        const announcementsRef = collection(db, 'announcements');
        const announcementQuery = query(announcementsRef, orderBy('createdAt', 'desc'));
        const announcementSnapshot = await getDocs(announcementQuery);
        
        if (announcementSnapshot.size === 0) {
            announcementTasks.push({
                type: 'create',
                title: 'Create first announcement',
                description: 'Welcome students to the new semester',
                priority: 'medium',
                icon: '📢'
            });
        } else {
            const today = new Date();
            const oneDayAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
            
            let expiringCount = 0;
            let oldCount = 0;
            
            announcementSnapshot.forEach((doc) => {
                const data = doc.data();
                const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                
                // Count expiring announcements (6-24 hours old)
                const sixHoursAgo = new Date(today.getTime() - 6 * 60 * 60 * 1000);
                if (createdAt < sixHoursAgo && createdAt > oneDayAgo) {
                    expiringCount++;
                }
                
                // Count old announcements (24+ hours)
                if (createdAt < oneDayAgo) {
                    oldCount++;
                }
            });
            
            if (expiringCount > 0) {
                announcementTasks.push({
                    type: 'expiring',
                    title: `${expiringCount} announcement${expiringCount > 1 ? 's' : ''} expiring soon`,
                    description: 'Will be marked as "END" soon',
                    priority: 'high',
                    icon: '⚠️'
                });
            }
            
            if (oldCount > 0) {
                announcementTasks.push({
                    type: 'cleanup',
                    title: `${oldCount} announcement${oldCount > 1 ? 's' : ''} need cleanup`,
                    description: 'Over 24 hours old',
                    priority: 'medium',
                    icon: '🧹'
                });
            }
            
            // Check if no recent announcements
            const latestAnnouncement = announcementSnapshot.docs[0];
            if (latestAnnouncement) {
                const latestData = latestAnnouncement.data();
                const latestCreatedAt = latestData.createdAt.toDate ? latestData.createdAt.toDate() : new Date(latestData.createdAt);
                const hoursSinceLast = (today - latestCreatedAt) / (1000 * 60 * 60);
                
                if (hoursSinceLast > 24) {
                    announcementTasks.push({
                        type: 'create',
                        title: 'Create new announcement',
                        description: 'No announcements in 24+ hours',
                        priority: 'medium',
                        icon: '📝'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error fetching announcement tasks:', error);
    }

            mainContentDiv.innerHTML = `
        <div class="max-w-4xl mx-auto px-6 py-12">
            <div class="flex items-center justify-between mb-8">
                <h1 class="text-4xl font-bold text-indigo-700 flex items-center space-x-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-megaphone text-indigo-600"><path d="m3 11 18-2L13 22 3 11Z"/><path d="M7 7v7"/><path d="M21 9v.5c0 .8-.5 1.5-1.3 1.8l-4 1.2c-.7.2-1.5.1-2.1-.3l-.7-.9c-.5-.6-1.3-1-2.2-1H3"/></svg>
                    <span>Announcement Board</span>
                </h1>
                                ${canCreateAnnouncement ? `<button id="create-announcement-btn" class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Create</span>
                                </button>` : ''}
                            </div>
                            
                            ${announcementTasks.length > 0 ? `
                                <!-- Announcement Tasks Section -->
                                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
                                    <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600 mr-2">
                                            <path d="M9 12l2 2 4-4"/>
                                            <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                                        </svg>
                                        Announcement Tasks
                        </h2>
                                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        ${announcementTasks.map(task => `
                                            <div class="bg-white rounded-lg p-4 border-l-4 ${task.priority === 'high' ? 'border-orange-500' : 'border-blue-500'} shadow-sm">
                                                <div class="flex items-start space-x-3">
                                                    <span class="text-2xl">${task.icon}</span>
                                                    <div class="flex-1">
                                                        <h3 class="font-semibold text-gray-900">${task.title}</h3>
                                                        <p class="text-sm text-gray-600">${task.description}</p>
                                                        <span class="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full ${task.priority === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}">
                                                            ${task.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
            
            <!-- Create Announcement Form (Hidden by default) -->
            <div id="create-announcement-form" class="hidden bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
                <h2 class="text-2xl font-bold text-gray-900 mb-6">Create New Announcement</h2>
                <form id="announcement-form" class="space-y-6">
                            <div>
                        <label for="announcement-title" class="block text-gray-700 text-sm font-semibold mb-2">Title</label>
                                <input
                                    type="text"
                                    id="announcement-title"
                            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                            placeholder="Enter announcement title"
                                    required
                                />
                            </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                            <label for="announcement-date" class="block text-gray-700 text-sm font-semibold mb-2">Date</label>
                                <input
                                type="date"
                                id="announcement-date"
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                required
                                />
                            </div>
                            <div>
                            <label for="announcement-time" class="block text-gray-700 text-sm font-semibold mb-2">Time</label>
                            <input
                                type="time"
                                id="announcement-time"
                                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label for="announcement-summary" class="block text-gray-700 text-sm font-semibold mb-2">Summary</label>
                                <textarea
                            id="announcement-summary"
                                    rows="4"
                            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 resize-y"
                            placeholder="Enter announcement details..."
                                    required
                                ></textarea>
                            </div>
                    <div class="flex space-x-4">
                                <button
                                    type="submit"
                            class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
                        >
                            Create Announcement
                        </button>
                        <button
                            type="button"
                            id="cancel-create-btn"
                            class="bg-gray-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:bg-gray-600 transition-all duration-300"
                        >
                            Cancel
                                </button>
                            </div>
                        </form>
                    </div>

                    <div id="announcements-list" class="space-y-6">
                <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-purple-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">No Announcements</h2>
                    <p class="text-gray-600">There are currently no announcements. Check back later!</p>
                </div>
                    </div>
                </div>
            `;



    // Add event listeners for the Create button functionality
    const createBtn = document.getElementById('create-announcement-btn');
    const createForm = document.getElementById('create-announcement-form');
    const cancelBtn = document.getElementById('cancel-create-btn');
                const announcementForm = document.getElementById('announcement-form');

    if (createBtn) {
        createBtn.addEventListener('click', () => {
            createForm.classList.remove('hidden');
            createBtn.classList.add('hidden');
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            createForm.classList.add('hidden');
            createBtn.classList.remove('hidden');
            announcementForm.reset();
        });
    }

    if (announcementForm) {
        announcementForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
            
            const title = document.getElementById('announcement-title').value;
            const date = document.getElementById('announcement-date').value;
            const time = document.getElementById('announcement-time').value;
            const summary = document.getElementById('announcement-summary').value;

            if (!title || !date || !time || !summary) {
                showMessageBox('Please fill in all fields.', 'error');
                        return;
                    }

                    try {
                // Create new announcement object
                const newAnnouncement = {
                    title: title,
                    date: date,
                    time: time,
                    summary: summary
                };

                // Save to Firebase
                await saveAnnouncementToFirebase(newAnnouncement);

                // Reload announcements from Firebase
                await loadAnnouncementsFromFirebase();

                // Show success message
                showMessageBox('Announcement created successfully!', 'info');
                
                // Reset form and hide it
                announcementForm.reset();
                createForm.classList.add('hidden');
                createBtn.classList.remove('hidden');
                
                        } catch (error) {
                console.error('Error creating announcement:', error);
                showMessageBox('Failed to create announcement.', 'error');
            }
        });
    }

    // Load announcements from Firebase when page loads
    loadAnnouncementsFromFirebase();

    // Set up automatic cleanup every hour
    setInterval(async () => {
        await loadAnnouncementsFromFirebase(); // This will clean up old announcements and reload
    }, 60 * 60 * 1000); // Check every hour
    
    // Setup animations for buttons in this page
    setupButtonAnimations();
};

// Rate Council Members Page
        const renderRatePrefectsPage = (currentUserProfile) => {
            const mainContentDiv = document.getElementById('main-content');
    const isTeacher = currentUserProfile?.role === 'teacher';
    const isCouncil = currentUserProfile?.role && currentUserProfile.role.startsWith('council');
    const canRate = isTeacher || isCouncil;

            if (!canRate) {
                mainContentDiv.innerHTML = `
                    <div class="container mx-auto p-6 bg-white rounded-2xl shadow-lg my-8">
                <h1 class="text-4xl font-extrabold text-gray-900 mb-6">Rate</h1>
                <p class="text-gray-600 italic">Only teachers can rate council members and prefects, and only council members can rate prefects.</p>
                    </div>
                `;
                return;
            }

    // Determine who can be rated
    let rateTargets = [];
    let rateTargetLabel = '';
    let ratePageTitle = '';
    if (isTeacher) {
        rateTargetLabel = 'Member';
        ratePageTitle = 'Rate Members';
    } else if (isCouncil) {
        rateTargetLabel = 'Prefect';
        ratePageTitle = 'Rate Prefects';
            }

            mainContentDiv.innerHTML = `
                <div class="container mx-auto p-6 bg-white rounded-2xl shadow-lg my-8">
            <h1 class="text-4xl font-extrabold text-gray-900 mb-6">${ratePageTitle}</h1>

                    <div class="bg-indigo-50 p-6 rounded-2xl shadow-inner mb-8">
                        <h2 class="text-3xl font-bold text-gray-800 mb-4">Submit a Rating</h2>
                        <form id="rating-form" class="space-y-5">
                            <div>
                        <label for="prefectSelect" class="block text-gray-700 text-sm font-semibold mb-2">Select ${rateTargetLabel}</label>
                                <select
                                    id="prefectSelect"
                                    class="w-full px-5 py-3 border border-gray-300 rounded-xl bg-white focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                    required
                                >
                            <option value="">-- Select a ${rateTargetLabel} --</option>
                            <!-- Options will be loaded here -->
                                </select>
                            </div>
                            <div>
                                <label class="block text-gray-700 text-sm font-semibold mb-2">Star Rating</label>
                                <div id="star-rating-container" class="flex space-x-1">
                                    <!-- Stars will be rendered here -->
                                </div>
                            </div>
                            <div>
                                <label for="feedback" class="block text-gray-700 text-sm font-semibold mb-2">Feedback (Optional)</label>
                                <textarea
                                    id="feedback"
                                    rows="4"
                                    class="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500 resize-y"
                                    placeholder="Provide optional feedback..."
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                class="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl hover:from-purple-700 hover:to-indigo-800 transition duration-300 ease-in-out font-bold text-lg shadow-lg transform hover:-translate-y-1"
                            >
                                Submit Rating
                            </button>
                        </form>
                    </div>

                    <div class="bg-gray-100 p-6 rounded-2xl shadow-inner">
                        <h2 class="text-3xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users text-indigo-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                    <span>All ${rateTargetLabel}s</span>
                        </h2>
                        <div id="active-prefects-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <p class="text-gray-600 italic text-lg">Loading ${rateTargetLabel.toLowerCase()}s...</p>
                        </div>
                    </div>
                </div>
            `;

            let currentStars = 0; // State for stars selected in form

            const prefectSelect = document.getElementById('prefectSelect');
            const starRatingContainer = document.getElementById('star-rating-container');
            const feedbackTextarea = document.getElementById('feedback');
            const ratingForm = document.getElementById('rating-form');
            const activePrefectsList = document.getElementById('active-prefects-list');

            const renderStars = (selectedCount) => {
                starRatingContainer.innerHTML = [1, 2, 3, 4, 5].map(s => `
                    <button
                        type="button"
                        data-star="${s}"
                        class="text-5xl transition-colors duration-200 ${s <= selectedCount ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}"
                    >
                        ★
                    </button>
                `).join('');
                starRatingContainer.querySelectorAll('button').forEach(btn => {
                    btn.onclick = () => {
                        currentStars = parseInt(btn.dataset.star);
                        renderStars(currentStars);
                    };
                });
            };
            renderStars(currentStars); // Initial render

    const updatePrefectAverageRating = async (targetId) => {
                try {
            const ratingsQuery = query(collection(db, 'ratings'), where('ratedPrefectId', '==', targetId));
                    const ratingsSnapshot = await getDocs(ratingsQuery);
                    let totalStars = 0;
                    let numRatings = 0;
                    ratingsSnapshot.forEach(doc => {
                        totalStars += doc.data().stars;
                        numRatings++;
                    });

                    const averageRating = numRatings > 0 ? (totalStars / numRatings) : 0;

            const targetProfileRef = doc(db, 'userProfiles', targetId);
            await updateDoc(targetProfileRef, { averageRating: averageRating });
                } catch (error) {
            console.error("Error updating average rating:", error);
                }
            };

            ratingForm.onsubmit = async (e) => {
                e.preventDefault();
                hideMessageBox();

                if (!prefectSelect.value || currentStars === 0) {
            showMessageBox(`Please select a ${rateTargetLabel.toLowerCase()} and give a star rating.`, 'error');
                    return;
                }
                try {
                    await addDoc(collection(db, 'ratings'), {
                        raterId: userId,
                        ratedPrefectId: prefectSelect.value,
                        stars: currentStars,
                        feedback: feedbackTextarea.value,
                        timestamp: new Date(),
                    });

                    await updatePrefectAverageRating(prefectSelect.value);

                    prefectSelect.value = '';
                    currentStars = 0;
                    renderStars(currentStars); // Reset stars display
                    feedbackTextarea.value = '';
            showMessageBox(`${rateTargetLabel} rating submitted successfully!`, 'info');
                } catch (error) {
                    console.error("Error submitting rating:", error);
            showMessageBox(`Failed to submit ${rateTargetLabel.toLowerCase()} rating.`, 'error');
        }
    };

    // Fetch and display targets for selection and list
    const profilesRef = collection(db, 'userProfiles');
    let q;
    if (isTeacher) {
        // Teachers: can rate both council and prefects
        q = query(profilesRef, where('role', 'in', ['council', 'prefect']));
    } else if (isCouncil) {
        // Council: can rate only prefects
        q = query(profilesRef, where('role', '==', 'prefect'));
    }

            onSnapshot(q, (snapshot) => {
        const fetchedTargets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Populate select dropdown
        prefectSelect.innerHTML = `<option value="">-- Select a ${rateTargetLabel} --</option>` + 
            fetchedTargets.map(target => `<option value="${target.id}">${target.name} (${target.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())})</option>`).join('');

        // Render active targets list
        if (fetchedTargets.length > 0) {
            activePrefectsList.innerHTML = fetchedTargets.map(target => `
                        <div class="bg-white p-5 rounded-xl shadow-md border border-gray-200 flex flex-col items-center text-center hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300">
                    <img src="${target.photoUrl}" alt="${target.name}" class="w-28 h-28 rounded-full object-cover mb-4 border-4 border-purple-400 shadow-sm" onerror="this.onerror=null;this.src='https://placehold.co/120x120/A78BFA/ffffff?text=NA'" />
                    <p class="text-xl font-semibold text-gray-800">${target.name}</p>
                    <p class="text-gray-600 text-sm font-medium">Role: ${target.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                                <div class="flex items-center space-x-2 mt-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star"><polygon points="12 2 15.09 8.26 22 9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12 2"/></svg>
                        <span class="text-2xl font-bold text-gray-800">${(target.averageRating || 0).toFixed(1)}</span>
                                    <span class="text-lg text-gray-600">/ 5</span>
                                </div>
                        </div>
                    `).join('');
                } else {
            activePrefectsList.innerHTML = `<p class="text-gray-600 italic text-lg">No ${rateTargetLabel.toLowerCase()}s found to rate.</p>`;
                }
            }, (error) => {
        console.error(`Error fetching ${rateTargetLabel.toLowerCase()}s:`, error);
        showMessageBox(`Failed to fetch ${rateTargetLabel.toLowerCase()}s. Please try again later.`, 'error');
            });
        };
        
        // Setup animations for buttons in this page
        setupButtonAnimations();

// Core function to render the appropriate app state (loading, login, or main app)
const renderApp = async () => {
    console.log('renderApp called with state:', { loadingAuth, currentUser: !!currentUser, userProfile: !!userProfile });
    
    const appRoot = document.getElementById('app-root');
    if (!appRoot) {
        console.error('App root element not found!');
                return;
            }

    console.log('App root found, current innerHTML length:', appRoot.innerHTML.length);
    
    // Clear all existing children only if we are transitioning to a completely different state (e.g., from app to login or loading)
    // Or if it's the very first render and we need to display loading.
    if (loadingAuth || !currentUser || !userProfile) { // If going to loading or login screen
         appRoot.innerHTML = ''; // Clear everything to display the new state cleanly
         console.log('Cleared app root for new state');
    }

    if (loadingAuth) {
        console.log("Displaying 'Loading Application...' screen.");
        appRoot.className = "min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-700 to-indigo-900 w-full";
        appRoot.innerHTML = `
            <div class="text-white text-4xl font-bold animate-pulse">Loading Application...</div>
        `;
        return; // Stop here if loading
    }

    // If not loading and no user/userProfile, show login page
    if (!currentUser || !userProfile) {
        console.log("Rendering LoginPage: user or userProfile missing.");
        appRoot.className = "flex-grow flex flex-col md:flex-row min-h-screen"; // Reset classes for login page
        renderLoginPage();
        return;
    }

    // If profile exists but is incomplete, show profile setup
    if (currentUser && userProfile && userProfile.isProfileComplete === false) {
        console.log('User profile incomplete — showing profile setup page');
        appRoot.className = "flex-grow flex flex-col md:flex-row min-h-screen";
        renderProfileSetupPage();
        return;
    }

    // If loading is false AND user/userProfile exist, render main app layout
    console.log("Rendering main app layout.");
    // Fixed: Completely reset the app root to ensure no loading text remains
    appRoot.innerHTML = '';
    appRoot.className = "min-h-screen bg-gray-50 font-sans antialiased flex flex-col md:flex-row w-full"; // Main app container class

    renderAppShellAndContent(); // Render/update the main app UI components
};

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    renderApp();
});

// Also initialize on window load as backup
window.addEventListener('load', () => {
    console.log('Window loaded, checking app state...');
    if (!document.getElementById('app-root').children.length) {
        console.log('App root is empty, re-initializing...');
        renderApp();
    }
});

        // Helper to fetch user profile
        const fetchUserProfile = async (uid) => {
            if (!uid) {
                console.log("fetchUserProfile: UID is null. Clearing userProfile.");
                userProfile = null;
                return null;
            }
            try {
                const ref = doc(db, 'userProfiles', uid);
                console.log(`fetchUserProfile: Fetching userProfiles/${uid}`);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const profileData = snap.data();
                    console.log('fetchUserProfile: Profile loaded', profileData);
                    userProfile = profileData;
                    return profileData;
                } else {
                    console.log('fetchUserProfile: No profile document found for UID:', uid);
                    userProfile = null;
                    return null;
                }
            } catch (error) {
                console.error('fetchUserProfile: Error fetching profile:', error);
                userProfile = null;
                return null;
            }
        };

// Auth state listener
onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged triggered. currentUser:', user ? user.email : 'null', 'UID:', user ? user.uid : 'null');
    console.log('Current loadingAuth state:', loadingAuth);
    
    currentUser = user;
    
    if (user) {
        console.log('User is logged in, fetching profile...');
        const profile = await fetchUserProfile(user.uid);
        console.log('Profile fetched in onAuthStateChanged:', profile ? `${profile.name} ${profile.role}` : 'null');

        // If no profile exists yet, create a minimal one so the UI can proceed.
        if (!profile) {
            try {
                const emailLocal = (user.email || '').split('@')[0] || 'User';
                const minimalProfile = {
                    uid: user.uid,
                    email: user.email || null,
                    name: emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1),
                    role: 'prefect',
                    photoUrl: `https://placehold.co/100x100/A78BFA/ffffff?text=${(emailLocal[0]||'U').toUpperCase()}`,
                    createdAt: new Date(),
                    averageRating: 0,
                    totalRatings: 0,
                    isProfileComplete: false // flag to indicate user must finish setup
                };
                console.log('No profile found — creating minimal profile for user:', minimalProfile.name);
                await setDoc(doc(db, 'userProfiles', user.uid), minimalProfile);
                userProfile = minimalProfile;
                console.log('Minimal profile created for UID:', user.uid);
            } catch (err) {
                console.error('Failed to create minimal profile for user:', err);
            }
        } else {
            userProfile = profile;
        }
    } else {
        console.log('User is not logged in, clearing profile...');
        userProfile = null;
    }
    
    console.log('Setting loadingAuth to false');
    loadingAuth = false;
    console.log('Calling renderApp after auth state change');
                renderApp();
}, (error) => {
    console.error('Auth state listener error:', error);
    loadingAuth = false;
    renderApp();
});

// Navigation and UI control functions
        const handleNavigate = async (page) => {
            console.log('handleNavigate called with page:', page);
            currentPage = page;
            console.log('Current page set to:', currentPage);
            await renderPageContent(page); // Re-render only the main content area
            // Always re-render the app shell to update sidebar highlighting
            renderAppShellAndContent();
        };
        
        // Make handleNavigate globally accessible
        window.handleNavigate = handleNavigate;

        const toggleMobileMenu = () => {
            isMobileMenuOpen = !isMobileMenuOpen;
    renderAppShellAndContent();
        };

        // Toggle sidebar visibility (for desktop)
        const toggleSidebarVisibility = () => {
            console.log('Sidebar toggle clicked. Current state:', isSidebarVisible);
            isSidebarVisible = !isSidebarVisible;
            console.log('Sidebar state changed to:', isSidebarVisible);
            renderAppShellAndContent(); // Re-render to update classes based on new state
        };

const handleLogout = async () => {
    loadingAuth = true;
    renderApp(); // Show loading screen
    try {
        await signOut(auth);
        console.log('handleLogout: User logged out');
        // Auth state listener will handle clearing states and setting loadingAuth = false
    } catch (error) {
        console.error("handleLogout: Error logging out:", error);
        loadingAuth = false; // Turn off loading if logout fails
        renderApp();
    }
        };

        // Renders the main app layout (sidebar, navbar, main content wrapper)
        // Creates elements if they don't exist, updates their content and classes otherwise.
        const renderAppShellAndContent = () => {
            const appRoot = document.getElementById('app-root');

            // --- Ensure top-level containers exist ---
            let sidebarContainer = document.getElementById('sidebar-container');
            let mainContentWrapper = document.getElementById('main-content-wrapper');
            let mainContentDiv = document.getElementById('main-content'); // Main content area

            // Create containers if they don't exist
            if (!sidebarContainer) {
                sidebarContainer = document.createElement('div');
                sidebarContainer.id = 'sidebar-container';
                appRoot.appendChild(sidebarContainer);
            }
            if (!mainContentWrapper) {
                mainContentWrapper = document.createElement('div');
                mainContentWrapper.id = 'main-content-wrapper';
                mainContentWrapper.className = 'flex-grow flex-col transition-all duration-300';
                appRoot.appendChild(mainContentWrapper);
            }
            // mainContentDiv must be inside mainContentWrapper
            if (!mainContentDiv || !mainContentWrapper.contains(mainContentDiv)) {
                mainContentDiv = document.createElement('main');
                mainContentDiv.id = 'main-content';
                mainContentDiv.className = 'flex-grow flex-col';
                mainContentWrapper.appendChild(mainContentDiv);
            }
            
            // Add page indicator
            let pageIndicator = document.getElementById('page-indicator');
            if (!pageIndicator) {
                pageIndicator = document.createElement('div');
                pageIndicator.id = 'page-indicator';
                pageIndicator.className = 'bg-white border-b border-gray-200 px-6 py-3 shadow-sm';
                mainContentWrapper.insertBefore(pageIndicator, mainContentDiv);
            }
            
            // Update page indicator content
            const getPageTitle = (page) => {
                const pageTitles = {
                    'home': 'Home',
                    'duty-council': 'Duty & Council Info',
                    'announcements': 'Announcement Board',
                    'profile': 'My Profile',
                    'students': 'All Students',
                    'rate-prefects': 'Rate Students'
                };
                return pageTitles[page] || 'Home';
            };
            
            console.log('Updating page indicator for page:', currentPage, 'Title:', getPageTitle(currentPage));
            pageIndicator.innerHTML = `
                <div class="flex items-center space-x-2">
                    <div class="w-2 h-2 bg-purple-600 rounded-full"></div>
                    <h1 class="text-lg font-semibold text-gray-800">${getPageTitle(currentPage)}</h1>
                </div>
            `;
            // Add mobile navbar to mainContentWrapper if it doesn't exist
            if (!document.getElementById('mobile-navbar')) {
                const navbarTempDiv = document.createElement('div');
                navbarTempDiv.innerHTML = renderNavbar(toggleMobileMenu);
                mainContentWrapper.prepend(navbarTempDiv.firstElementChild); // Prepend to put it at the top
            }
            // Ensure message box container is present (append to body for consistent fixed positioning)
            let msgBox = document.getElementById('message-box');
            if (!msgBox) {
                msgBox = document.createElement('div');
                msgBox.id = 'message-box';
                msgBox.className = 'fixed top-4 right-4 p-4 rounded-lg shadow-lg flex items-center space-x-2 z-50 transition-transform duration-300 transform translate-x-full';
                document.body.appendChild(msgBox);
            }

            // --- Update Sidebar Content and Classes ---
            console.log('Rendering sidebar with state - isSidebarVisible:', isSidebarVisible, 'isMobileMenuOpen:', isMobileMenuOpen);
            const sidebarHtml = renderSidebar(userProfile, handleNavigate, handleLogout, isMobileMenuOpen, isSidebarVisible);
            sidebarContainer.innerHTML = sidebarHtml; // Update innerHTML of existing sidebar
            // Update sidebar container classes
    const sidebarBaseClasses = "flex-col bg-gradient-to-b from-gray-800 via-gray-900 to-gray-800 text-white shadow-2xl fixed top-0 left-0 z-30 transition-all duration-300 ease-in-out h-screen";
    const sidebarMobileClasses = "fixed inset-0 flex w-full h-full p-6 py-10 animate-fade-in-left z-50"; // Full mobile overlay
            const sidebarDesktopCollapsedClasses = "md:w-20 md:overflow-hidden md:items-center"; // Collapsed desktop: fixed width, hide overflow, center items
    const sidebarDesktopExpandedClasses = "md:w-80 md:flex"; // Expanded desktop: wider fixed width, flex display

            let finalDisplayClasses = '';
    if (isMobileMenuOpen) { // Mobile overlay takes precedence
                finalDisplayClasses = sidebarMobileClasses;
    } else if (isSidebarVisible) { // Desktop visible
                finalDisplayClasses = sidebarDesktopExpandedClasses;
    } else { // Desktop hidden/collapsed
        finalDisplayClasses = 'md:hidden'; // Completely hide when collapsed
            }
    // Add `hidden` class for desktop if it's supposed to be completely hidden
    finalDisplayClasses += isSidebarVisible || isMobileMenuOpen ? '' : ' md:hidden';

            sidebarContainer.className = `${sidebarBaseClasses} ${finalDisplayClasses}`;

            // --- Update Main Content Wrapper Classes (for margin adjustment) ---
            if (mainContentWrapper) {
        // Use margin-based layout for fixed sidebar
                if (isSidebarVisible && !isMobileMenuOpen) { // Expanded desktop sidebar
            mainContentWrapper.className = `flex-grow flex-col transition-all duration-300 relative`;
            mainContentWrapper.style.marginLeft = '320px'; // 80 * 4 = 320px for md:w-80
        } else { // Sidebar hidden or mobile
            mainContentWrapper.className = `flex-grow flex-col transition-all duration-300 relative`;
            mainContentWrapper.style.marginLeft = '0px'; // No margin when sidebar is hidden
        }
        
        // Add floating toggle button when sidebar is collapsed
        if (!isSidebarVisible && !isMobileMenuOpen) {
            const existingToggle = mainContentWrapper.querySelector('#main-content-toggle');
            if (!existingToggle) {
                const toggleButton = document.createElement('button');
                toggleButton.id = 'main-content-toggle';
                toggleButton.className = 'fixed top-4 left-4 z-50 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-3 rounded-full shadow-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-300 hover:scale-110 md:block';
                toggleButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`;
                toggleButton.addEventListener('click', toggleSidebarVisibility);
                mainContentWrapper.appendChild(toggleButton);
            }
        } else {
            // Remove toggle button when sidebar is visible
            const existingToggle = mainContentWrapper.querySelector('#main-content-toggle');
            if (existingToggle) {
                existingToggle.remove();
            }
                }
            }


            // --- Re-attach Event Listeners (crucial after innerHTML updates) ---
            document.getElementById('mobile-menu-toggle')?.addEventListener('click', toggleMobileMenu);
    document.getElementById('desktop-sidebar-toggle')?.addEventListener('click', toggleSidebarVisibility);
    document.getElementById('floating-sidebar-toggle')?.addEventListener('click', toggleSidebarVisibility);
            document.getElementById('close-mobile-menu')?.addEventListener('click', toggleMobileMenu); // Mobile sidebar close
            document.getElementById('logout-btn')?.addEventListener('click', handleLogout); // Logout button
            document.getElementById('sidebar-toggle-btn-internal')?.addEventListener('click', toggleSidebarVisibility); // Internal sidebar toggle button

            // Remove existing event listeners to prevent duplicates
            document.querySelectorAll('.sidebar-nav-btn').forEach(button => {
                button.removeEventListener('click', button._navClickHandler);
            });
            
            // Add new event listeners
            document.querySelectorAll('.sidebar-nav-btn').forEach(button => {
                const clickHandler = (event) => {
                    const page = event.currentTarget.dataset.page;
                    console.log('Sidebar nav clicked:', page);
                    
                    // Add immediate visual feedback
                    button.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        button.style.transform = 'scale(1)';
                    }, 150);
                    
                    handleNavigate(page);
                };
                button._navClickHandler = clickHandler; // Store reference for removal
                button.addEventListener('click', clickHandler);
            });
            
            // Add click animations to all buttons with onclick attributes
            document.querySelectorAll('button[onclick]').forEach(button => {
                const originalOnclick = button.getAttribute('onclick');
                if (originalOnclick && !button._hasClickAnimation) {
                    button._hasClickAnimation = true;
                    button.removeAttribute('onclick');
                    button.addEventListener('click', (event) => {
                        // Add immediate visual feedback
                        button.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            button.style.transform = 'scale(1)';
                        }, 150);
                        
                        // Execute the original onclick
                        eval(originalOnclick);
                    });
                }
            });
            
            // Add click animations to all buttons with class 'click-animate'
            document.querySelectorAll('.click-animate').forEach(button => {
                if (!button._hasClickAnimation) {
                    button._hasClickAnimation = true;
                    button.addEventListener('click', (event) => {
                        // Add immediate visual feedback
                        button.style.transform = 'scale(0.95)';
                        setTimeout(() => {
                            button.style.transform = 'scale(1)';
                        }, 150);
                    });
                }
            });
            
            // Setup animations for newly rendered content
            setupButtonAnimations();

            // --- Render the current page content into mainContentDiv ---
            renderPageContent(currentPage);
        };

// Renders the main content area based on the current page
const renderPageContent = async (page) => {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) {
        console.error('renderPageContent: main-content element not found');
                return;
            }

    console.log(`renderPageContent: Rendering page: ${page}`);
    
            switch (page) {
                case 'home':
                    console.log('Rendering home page for user:', userProfile?.role);
            await renderHomePage(userProfile);
                    break;
                case 'duty-council':
                    renderDutyCouncilPage(userProfile);
                    break;
                case 'announcements':
            await renderAnnouncementBoard(userProfile);
            break;
                case 'profile':
            renderProfilePage(userProfile);
            break;
        case 'students':
            await renderStudentsPage(userProfile);
                    break;
                case 'rate-prefects':
                    renderRatePrefectsPage(userProfile);
                    break;
                default:
            renderHomePage(userProfile);
    }
};

// Profile Page
const renderProfilePage = (currentUserProfile) => {
    const mainContentDiv = document.getElementById('main-content');
    if (!mainContentDiv) return;

                    mainContentDiv.innerHTML = `
        <div class="max-w-7xl mx-auto px-6 py-12">
            <h1 class="text-4xl font-bold text-purple-700 mb-8 flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user text-purple-600"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>My Profile</span>
            </h1>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Profile Card -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
                        <div class="flex items-center space-x-6 mb-8">
                            <img src="${currentUserProfile.photoUrl}" alt="${currentUserProfile.name}" class="w-24 h-24 rounded-full border-4 border-purple-200">
                            <div>
                                <h2 class="text-3xl font-bold text-gray-900">${currentUserProfile.name}</h2>
                                <p class="text-lg text-purple-600 font-semibold">${currentUserProfile.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Penerangan Kerohanian', 'Penerangan & Kerohanian')}</p>
                                <p class="text-gray-600">Member since ${new Date(currentUserProfile.createdAt.toDate()).toLocaleDateString()}</p>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
                                <h3 class="text-lg font-bold mb-2">Personal Info</h3>
                                <div class="space-y-2 text-sm">
                                    <p><span class="font-semibold">Name:</span> ${currentUserProfile.name}</p>
                                    <p><span class="font-semibold">Role:</span> ${currentUserProfile.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace('Penerangan Kerohanian', 'Penerangan & Kerohanian')}</p>
                                    <p><span class="font-semibold">Joined:</span> ${new Date(currentUserProfile.createdAt.toDate()).toLocaleDateString()}</p>
                                </div>
                            </div>
                            
                            ${currentUserProfile.role === 'prefect' || (currentUserProfile.role && currentUserProfile.role.startsWith('council')) ? `
                            <div class="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-2xl p-6 shadow-lg text-center">
                                <h3 class="text-lg font-bold mb-2">Performance Rating</h3>
                                <p class="text-3xl font-extrabold">${(currentUserProfile.averageRating || 0).toFixed(1)}</p>
                                <p class="text-sm opacity-90">/ 5.0</p>
                            </div>
                            ` : `
                            <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg text-center">
                                <h3 class="text-lg font-bold mb-2">Role</h3>
                                <p class="text-3xl font-extrabold">Teacher</p>
                                <p class="text-sm opacity-90">Rater</p>
                            </div>
                            `}
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="space-y-6">
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                        <h3 class="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
                        <div class="space-y-3">
                            <button onclick="handleEditProfile()" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold shadow-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300">Edit Profile</button>
                            <button onclick="handleChangePhoto()" class="w-full bg-white border border-purple-200 text-purple-700 px-4 py-3 rounded-xl font-semibold shadow hover:bg-purple-50 transition-all duration-300">Change Photo</button>
                            <button onclick="handleDeleteAccount()" class="w-full bg-white border border-red-200 text-red-700 px-4 py-3 rounded-xl font-semibold shadow hover:bg-red-50 transition-all duration-300">Delete Account</button>
                        </div>
                    </div>
                    
                    <div class="bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl p-6 shadow-lg">
                        <h3 class="text-lg font-bold mb-2">Account Status</h3>
                        <div class="flex items-center space-x-2 mb-2">
                            <div class="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span class="text-sm">Active</span>
                        </div>
                        <p class="text-sm opacity-90">Your account is in good standing</p>
                    </div>
                </div>
            </div>
                        </div>
                    `;
};

// Signup function
const attemptSignup = async (event) => {
    event.preventDefault();
    
    const email = document.getElementById('userEmail').value;
    const password = document.getElementById('userPassword').value;
    const userName = document.getElementById('userName').value;
    const userRole = document.getElementById('userRole').value;
    const specificRole = document.getElementById('specificRole').value;
    
    if (!email || !password || !userName || !userRole) {
        showMessageBox('Please fill in all required fields.', 'error');
        return;
    }
    
    loadingAuth = true;
    renderApp(); // Show loading state
    
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile
        const finalRole = userRole === 'council' ? specificRole : userRole;
        const profileData = {
            uid: user.uid,
            name: userName,
            role: finalRole,
            photoUrl: `https://placehold.co/100x100/A78BFA/ffffff?text=${userName[0] || 'U'}`,
            createdAt: new Date(),
            averageRating: userRole === 'prefect' ? 0 : undefined
        };
        
        // Save profile to Firestore
        await setDoc(doc(db, 'userProfiles', user.uid), profileData);
        
        console.log('attemptSignup: User account and profile created successfully');
        showMessageBox('Account created successfully! Welcome to the Prefectorial Board.', 'success');
        
        // Auth state listener will handle the rest (setting currentUser, userProfile, etc.)
        
    } catch (error) {
        console.error('attemptSignup: Error creating account:', error);
        loadingAuth = false;
        renderApp(); // Remove loading state
        
        let errorMessage = 'Failed to create account. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters long.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
        }
        
        showMessageBox(errorMessage, 'error');
    }
};

// Login function
const attemptLogin = async (event) => {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showMessageBox('Please enter both email and password.', 'error');
        return;
    }
    
    loadingAuth = true;
    renderApp(); // Show loading state
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('attemptLogin: User logged in successfully');
        showMessageBox('Login successful! Welcome back.', 'success');
        
        // Auth state listener will handle the rest (setting currentUser, userProfile, etc.)
        
                    } catch (error) {
        console.error('attemptLogin: Error logging in:', error);
        loadingAuth = false;
        renderApp(); // Remove loading state
        
        let errorMessage = 'Failed to login. Please check your credentials.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password. Please try again.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Please enter a valid email address.';
        }
        
        showMessageBox(errorMessage, 'error');
    }
};



// Function to check if announcement is one day old
const isOneDayOld = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = now - created;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 1;
};

// Firebase functions for announcements
const loadAnnouncementsFromFirebase = async () => {
    try {
        const announcementsRef = collection(db, 'announcements');
        const q = query(announcementsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        announcements = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            announcements.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
            });
        });
        
        console.log('Loaded announcements from Firebase:', announcements.length);
        await renderAnnouncements();
    } catch (error) {
        console.error('Error loading announcements:', error);
        showMessageBox('Failed to load announcements. Please try again.', 'error');
    }
};

const saveAnnouncementToFirebase = async (announcementData) => {
    try {
        const announcementsRef = collection(db, 'announcements');
        const docRef = await addDoc(announcementsRef, {
            ...announcementData,
            createdAt: new Date(),
            creatorId: userProfile.uid,
            creatorName: userProfile.name
        });
        
        console.log('Announcement saved to Firebase with ID:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('Error saving announcement:', error);
        throw new Error('Failed to save announcement. Please try again.');
    }
};

const deleteAnnouncement = async (announcementId) => {
    try {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
            return;
        }
        
        // Delete from Firebase
        const announcementRef = doc(db, 'announcements', announcementId);
        await deleteDoc(announcementRef);
        
        console.log('Announcement deleted from Firebase:', announcementId);
        
        // Remove from local array
        announcements = announcements.filter(a => a.id !== announcementId);
        
        // Re-render announcements
        await renderAnnouncements();
        
        // Show success message
        showMessageBox('Announcement deleted successfully!', 'success');
        
    } catch (error) {
        console.error('Error deleting announcement:', error);
        showMessageBox('Failed to delete announcement. Please try again.', 'error');
    }
};

// Make deleteAnnouncement globally accessible
window.deleteAnnouncement = deleteAnnouncement;

const renderAnnouncements = async () => {
    // Clean up old announcements first
    await cleanupOldAnnouncements();
    
    const announcementsList = document.getElementById('announcements-list');
    if (!announcementsList) return;
    
    if (announcements.length === 0) {
        announcementsList.innerHTML = `
            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-purple-400"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">No Announcements</h2>
                <p class="text-gray-600">There are currently no announcements. Check back later!</p>
            </div>
        `;
            } else {
                    announcementsList.innerHTML = announcements.map(a => {
                const isOld = isOneDayOld(a.createdAt);
                const canDelete = userProfile && (userProfile.role === 'teacher' || 
                                                userProfile.role === 'council_ketua' ||
                                                userProfile.role === 'council_timbalan_i' ||
                                                userProfile.role === 'council_timbalan_ii' ||
                                                userProfile.role === 'council_penerangan_kerohanian_i' ||
                                                userProfile.role === 'council_penerangan_kerohanian_ii');
                const isCreator = userProfile && a.creatorId === userProfile.uid;
                const showDeleteButton = canDelete && isCreator;
                
                return `
                    <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 class="text-xl font-bold text-gray-900 mb-1">${a.title}</h3>
                            <p class="text-gray-600 mb-2">${a.summary}</p>
                            <div class="flex space-x-2">
                                <span class="inline-block bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full">${a.date}</span>
                                <span class="inline-block bg-gradient-to-r from-green-100 to-green-200 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">${a.time}</span>
                                <span class="inline-block bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">By: ${a.creatorName || 'Unknown'}</span>
                                ${isOld ? `<span class="inline-block bg-gradient-to-r from-red-100 to-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">END</span>` : ''}
                            </div>
                        </div>
                        <div class="flex space-x-2 mt-4 md:mt-0">
                            <button class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-xl font-semibold shadow hover:from-purple-700 hover:to-indigo-700 transition-all duration-300">Read More</button>
                            ${showDeleteButton ? `
                                <button 
                                    onclick="deleteAnnouncement('${a.id}')" 
                                    class="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2 rounded-xl font-semibold shadow hover:from-red-600 hover:to-red-700 transition-all duration-300 flex items-center space-x-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                    <span>Delete</span>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
    }
};

const shouldDelete = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = now - created;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays > 1;
};

const cleanupOldAnnouncements = async () => {
    const oldAnnouncements = announcements.filter(announcement => shouldDelete(announcement.createdAt));
    
    // Delete old announcements from Firebase
    for (const announcement of oldAnnouncements) {
        try {
            const announcementRef = doc(db, 'announcements', announcement.id);
            await deleteDoc(announcementRef);
            console.log('Deleted old announcement:', announcement.id);
        } catch (error) {
            console.error('Error deleting old announcement:', error);
        }
    }
    
    // Remove from local array
    announcements = announcements.filter(announcement => !shouldDelete(announcement.createdAt));
};

// Helper function to get time ago
const getTimeAgo = (date) => {
    const now = new Date();
    const diffTime = now - date;
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
};

// Students Page - Shows all students (prefects and council members)
const renderStudentsPage = async (currentUserProfile) => {
    const mainContentDiv = document.getElementById('main-content');
    if (!mainContentDiv) return;

    // Check if user is a teacher (only teachers should view all students)
    if (currentUserProfile.role !== 'teacher') {
        mainContentDiv.innerHTML = `
            <div class="max-w-4xl mx-auto px-6 py-12">
                <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-red-500"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <h2 class="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
                    <p class="text-red-600">Only teachers can view all students.</p>
                </div>
            </div>
        `;
        return;
    }

    let students = [];
    let loading = true;

    try {
        // Fetch all students (prefects and council members)
        const userProfilesRef = collection(db, 'userProfiles');
        const studentsQuery = query(userProfilesRef, where('role', 'in', ['prefect', 'council_ketua', 'council_timbalan_i', 'council_timbalan_ii', 'council_setiausaha_kehormat_i', 'council_setiausaha_kehormat_ii', 'council_bendahari_kehormat_i', 'council_bendahari_kehormat_ii', 'council_konsul_disiplin_i', 'council_konsul_disiplin_ii', 'council_keselamatan_i', 'council_keselamatan_ii', 'council_penerangan_kerohanian_i', 'council_penerangan_kerohanian_ii', 'council_pendidikan_keceriaan_i', 'council_pendidikan_keceriaan_ii']));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        studentsSnapshot.forEach((doc) => {
            const data = doc.data();
            students.push({
                id: doc.id,
                name: data.name,
                role: data.role,
                email: data.email,
                averageRating: data.averageRating || 0,
                totalRatings: data.totalRatings || 0,
                createdAt: data.createdAt
            });
        });

        // Sort students by role and then by name
        students.sort((a, b) => {
            const roleOrder = {
                'council_ketua': 1,
                'council_timbalan_i': 2,
                'council_timbalan_ii': 3,
                'council_setiausaha_kehormat_i': 4,
                'council_setiausaha_kehormat_ii': 5,
                'council_bendahari_kehormat_i': 6,
                'council_bendahari_kehormat_ii': 7,
                'council_konsul_disiplin_i': 8,
                'council_konsul_disiplin_ii': 9,
                'council_keselamatan_i': 10,
                'council_keselamatan_ii': 11,
                'council_penerangan_kerohanian_i': 12,
                'council_penerangan_kerohanian_ii': 13,
                'council_pendidikan_keceriaan_i': 14,
                'council_pendidikan_keceriaan_ii': 15,
                'prefect': 16
            };
            
            if (roleOrder[a.role] !== roleOrder[b.role]) {
                return roleOrder[a.role] - roleOrder[b.role];
            }
            return a.name.localeCompare(b.name);
        });

        loading = false;
    } catch (error) {
        console.error('Error fetching students:', error);
        loading = false;
    }

    const getRoleDisplayName = (role) => {
        const roleNames = {
            'council_ketua': 'Ketua Pengawas Junior',
            'council_timbalan_i': 'Timbalan Ketua Pengawas I',
            'council_timbalan_ii': 'Timbalan Ketua Pengawas II',
            'council_setiausaha_kehormat_i': 'Setiausaha Kehormat I',
            'council_setiausaha_kehormat_ii': 'Setiausaha Kehormat II',
            'council_bendahari_kehormat_i': 'Bendahari Kehormat I',
            'council_bendahari_kehormat_ii': 'Bendahari Kehormat II',
            'council_konsul_disiplin_i': 'Konsul Disiplin I',
            'council_konsul_disiplin_ii': 'Konsul Disiplin II',
            'council_keselamatan_i': 'Konsul Keselamatan I',
            'council_keselamatan_ii': 'Konsul Keselamatan II',
            'council_penerangan_kerohanian_i': 'Konsul Penerangan & Kerohanian I',
            'council_penerangan_kerohanian_ii': 'Konsul Penerangan & Kerohanian II',
            'council_pendidikan_keceriaan_i': 'Konsul Pendidikan & Kecerian I',
            'council_pendidikan_keceriaan_ii': 'Konsul Pendidikan & Kecerian II',
            'prefect': 'Prefect'
        };
        return roleNames[role] || role;
    };

    const getRoleColor = (role) => {
        if (role.startsWith('council_ketua')) return 'purple';
        if (role.startsWith('council_timbalan')) return 'blue';
        if (role.startsWith('council_setiausaha')) return 'cyan';
        if (role.startsWith('council_bendahari')) return 'teal';
        if (role.startsWith('council_konsul_disiplin')) return 'orange';
        if (role.startsWith('council_konsul_keselamatan')) return 'pink';
        if (role.startsWith('council_konsul_penerangan')) return 'yellow';
        if (role.startsWith('council_konsul_pendidikan')) return 'lime';
        if (role === 'prefect') return 'green';
        return 'gray';
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    mainContentDiv.innerHTML = `
        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1 class="text-4xl font-bold text-gray-900 mb-2">All Students</h1>
                    <p class="text-lg text-gray-600">View and manage all prefects and council members</p>
                </div>
                <div class="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg">
                    <span class="font-semibold">${students.length} Students</span>
                </div>
            </div>

            ${loading ? `
                <div class="text-center py-12">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p class="text-gray-600">Loading students...</p>
                </div>
            ` : students.length === 0 ? `
                <div class="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 text-gray-300"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">No Students Found</h2>
                    <p class="text-gray-600">There are currently no students registered.</p>
                </div>
            ` : `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${students.map(student => {
                        const roleColor = getRoleColor(student.role);
                        const initials = getInitials(student.name);
                        const roleDisplay = getRoleDisplayName(student.role);
                        
                        return `
                            <div class="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300">
                                <div class="flex items-center space-x-4 mb-4">
                                    <div class="w-12 h-12 bg-gradient-to-br from-${roleColor}-500 to-${roleColor}-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                        ${initials}
                                    </div>
                                    <div class="flex-1">
                                        <h3 class="font-bold text-gray-900">${student.name}</h3>
                                        <p class="text-sm text-gray-600">${roleDisplay}</p>
                                    </div>
                                </div>
                                
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Email:</span>
                                        <span class="text-sm font-medium text-gray-900">${student.email}</span>
                                    </div>
                                    
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Rating:</span>
                                        <div class="flex items-center space-x-1">
                                            <span class="text-lg font-bold text-yellow-600">${student.averageRating.toFixed(1)}</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="text-yellow-500"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Total Ratings:</span>
                                        <span class="text-sm font-medium text-gray-900">${student.totalRatings}</span>
                                    </div>
                                    
                                    <div class="flex items-center justify-between">
                                        <span class="text-sm text-gray-600">Member Since:</span>
                                        <span class="text-sm font-medium text-gray-900">${student.createdAt ? new Date(student.createdAt.toDate ? student.createdAt.toDate() : student.createdAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>
                                
                                <div class="mt-4 pt-4 border-t border-gray-100">
                                    <button onclick="handleNavigate('rate-prefects')" class="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all duration-300">
                                        Rate Student
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
    setupButtonAnimations();
};

// Quick Actions Handler Functions
const handleEditProfile = () => {
    showMessageBox('Edit Profile functionality will be implemented soon!', 'info');
    console.log('Edit Profile clicked');
};

const handleChangePhoto = () => {
    showMessageBox('Change Photo functionality will be implemented soon!', 'info');
    console.log('Change Photo clicked');
};

const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
        showMessageBox('Delete Account functionality will be implemented soon!', 'warning');
        console.log('Delete Account confirmed');
    }
};

// Teacher Council Management Functions
const handleAddCouncilMember = () => {
    // Create modal for adding new council member
    const modalHTML = `
        <div id="add-council-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Add Council Member</h2>
                    <button onclick="closeCouncilModal()" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="add-council-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input type="text" id="member-name" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <select id="member-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            <option value="">Select Role</option>
                            <option value="council_ketua">Ketua Pengawas Junior</option>
                            <option value="council_timbalan_i">Timbalan Ketua Pengawas I</option>
                            <option value="council_timbalan_ii">Timbalan Ketua Pengawas II</option>
                            <option value="council_setiausaha_kehormat_i">Setiausaha Kehormat I</option>
                            <option value="council_setiausaha_kehormat_ii">Setiausaha Kehormat II</option>
                            <option value="council_bendahari_kehormat_i">Bendahari Kehormat I</option>
                            <option value="council_bendahari_kehormat_ii">Bendahari Kehormat II</option>
                            <option value="council_konsul_disiplin_i">Konsul Disiplin I</option>
                            <option value="council_konsul_disiplin_ii">Konsul Disiplin II</option>
                            <option value="council_keselamatan_i">Konsul Keselamatan I</option>
                            <option value="council_keselamatan_ii">Konsul Keselamatan II</option>
                            <option value="council_penerangan_kerohanian_i">Konsul Penerangan & Kerohanian I</option>
                            <option value="council_penerangan_kerohanian_ii">Konsul Penerangan & Kerohanian II</option>
                            <option value="council_pendidikan_keceriaan_i">Konsul Pendidikan & Kecerian I</option>
                            <option value="council_pendidikan_keceriaan_ii">Konsul Pendidikan & Kecerian II</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" id="member-email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    </div>
                    
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="closeCouncilModal()" class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" class="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300">
                            Add Member
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle form submission
    document.getElementById('add-council-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('member-name').value;
        const role = document.getElementById('member-role').value;
        const email = document.getElementById('member-email').value;
        
        try {
            // Here you would typically save to Firebase
            showMessageBox(`Council member "${name}" added successfully!`, 'success');
            closeCouncilModal();
            
            // Refresh the page to show the new member
            setTimeout(() => {
                handleNavigate('duty-council');
            }, 1500);
            
        } catch (error) {
            showMessageBox('Error adding council member. Please try again.', 'error');
        }
    });
};

const handleEditCouncilList = () => {
    showMessageBox('Bulk edit functionality will be implemented soon!', 'info');
    console.log('Edit Council List clicked');
};

const handleEditCouncilMember = (memberId) => {
    // Get member data based on ID
    const memberData = getMemberData(memberId);
    
    const modalHTML = `
        <div id="edit-council-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-gray-900">Edit Council Member</h2>
                    <button onclick="closeCouncilModal()" class="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                
                <form id="edit-council-form" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input type="text" id="edit-member-name" value="${memberData.name}" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <select id="edit-member-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                            <option value="council_ketua" ${memberData.role === 'council_ketua' ? 'selected' : ''}>Ketua Pengawas Junior</option>
                            <option value="council_timbalan_i" ${memberData.role === 'council_timbalan_i' ? 'selected' : ''}>Timbalan Ketua Pengawas I</option>
                            <option value="council_timbalan_ii" ${memberData.role === 'council_timbalan_ii' ? 'selected' : ''}>Timbalan Ketua Pengawas II</option>
                            <option value="council_setiausaha_kehormat_i" ${memberData.role === 'council_setiausaha_kehormat_i' ? 'selected' : ''}>Setiausaha Kehormat I</option>
                            <option value="council_setiausaha_kehormat_ii" ${memberData.role === 'council_setiausaha_kehormat_ii' ? 'selected' : ''}>Setiausaha Kehormat II</option>
                            <option value="council_bendahari_kehormat_i" ${memberData.role === 'council_bendahari_kehormat_i' ? 'selected' : ''}>Bendahari Kehormat I</option>
                            <option value="council_bendahari_kehormat_ii" ${memberData.role === 'council_bendahari_kehormat_ii' ? 'selected' : ''}>Bendahari Kehormat II</option>
                            <option value="council_konsul_disiplin_i" ${memberData.role === 'council_konsul_disiplin_i' ? 'selected' : ''}>Konsul Disiplin I</option>
                            <option value="council_konsul_disiplin_ii" ${memberData.role === 'council_konsul_disiplin_ii' ? 'selected' : ''}>Konsul Disiplin II</option>
                            <option value="council_keselamatan_i" ${memberData.role === 'council_keselamatan_i' ? 'selected' : ''}>Konsul Keselamatan I</option>
                            <option value="council_keselamatan_ii" ${memberData.role === 'council_keselamatan_ii' ? 'selected' : ''}>Konsul Keselamatan II</option>
                            <option value="council_penerangan_kerohanian_i" ${memberData.role === 'council_penerangan_kerohanian_i' ? 'selected' : ''}>Konsul Penerangan & Kerohanian I</option>
                            <option value="council_penerangan_kerohanian_ii" ${memberData.role === 'council_penerangan_kerohanian_ii' ? 'selected' : ''}>Konsul Penerangan & Kerohanian II</option>
                            <option value="council_pendidikan_keceriaan_i" ${memberData.role === 'council_pendidikan_keceriaan_i' ? 'selected' : ''}>Konsul Pendidikan & Kecerian I</option>
                            <option value="council_pendidikan_keceriaan_ii" ${memberData.role === 'council_pendidikan_keceriaan_ii' ? 'selected' : ''}>Konsul Pendidikan & Kecerian II</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" id="edit-member-email" value="${memberData.email || ''}" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    </div>
                    
                    <div class="flex space-x-3 pt-4">
                        <button type="button" onclick="closeCouncilModal()" class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300">
                            Update Member
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Handle form submission
    document.getElementById('edit-council-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('edit-member-name').value;
        const role = document.getElementById('edit-member-role').value;
        const email = document.getElementById('edit-member-email').value;
        
        try {
            // Here you would typically update Firebase
            showMessageBox(`Council member "${name}" updated successfully!`, 'success');
            closeCouncilModal();
            
            // Refresh the page to show the updated member
            setTimeout(() => {
                handleNavigate('duty-council');
            }, 1500);
            
        } catch (error) {
            showMessageBox('Error updating council member. Please try again.', 'error');
        }
    });
};

// Helper function to get member data
const getMemberData = (memberId) => {
    const memberMap = {
        'jeriel': { name: 'Jeriel Ling Heng Xu', role: 'council_ketua', email: 'jeriel@example.com' },
        'kelvin': { name: 'Kelvin Ling Lee Jie', role: 'council_timbalan_i', email: 'kelvin@example.com' },
        'clarence': { name: 'Clarence Lee Meng Ang', role: 'council_timbalan_ii', email: 'clarence@example.com' },
        'jonathan': { name: 'Jonathan Ting Lian Jing', role: 'council_setiausaha_kehormat_i', email: 'jonathan@example.com' },
        'benjamin': { name: 'Benjamin Tay Liang Xiao', role: 'council_setiausaha_kehormat_ii', email: 'benjamin@example.com' },
        'ansom': { name: 'Ansom Wong Jun Jie', role: 'council_bendahari_kehormat_i', email: 'ansom@example.com' },
        'ling': { name: 'Ling Kuon Fon', role: 'council_bendahari_kehormat_ii', email: 'ling@example.com' },
        'cristian': { name: 'Cristian Labon', role: 'council_konsul_disiplin_i', email: 'cristian@example.com' },
        'ivan': { name: 'Ivan Wong', role: 'council_konsul_disiplin_ii', email: 'ivan@example.com' },
        'morgan': { name: 'Morgan Noah', role: 'council_keselamatan_i', email: 'morgan@example.com' },
        'ozgon': { name: 'Ozgon Ngu', role: 'council_keselamatan_ii', email: 'ozgon@example.com' },
        'abraham': { name: 'Abraham Ting Lik Yue', role: 'council_penerangan_kerohanian_i', email: 'abraham@example.com' },
        'bryan': { name: 'Bryan Wong Qi Lun', role: 'council_penerangan_kerohanian_ii', email: 'bryan@example.com' },
        'phan': { name: 'Phan Yi Cheng', role: 'council_pendidikan_keceriaan_i', email: 'phan@example.com' },
        'asyri': { name: 'Asyri Syukri', role: 'council_pendidikan_keceriaan_ii', email: 'asyri@example.com' }
    };
    
    return memberMap[memberId] || { name: 'Unknown Member', role: 'council_ketua', email: '' };
};

// Function to close modal
const closeCouncilModal = () => {
    const modal = document.getElementById('add-council-modal') || document.getElementById('edit-council-modal');
    if (modal) {
        modal.remove();
    }
};

// Make functions globally accessible
window.handleEditProfile = handleEditProfile;
window.handleChangePhoto = handleChangePhoto;
window.handleDeleteAccount = handleDeleteAccount;
window.handleAddCouncilMember = handleAddCouncilMember;
window.handleEditCouncilList = handleEditCouncilList;
window.handleEditCouncilMember = handleEditCouncilMember;
window.closeCouncilModal = closeCouncilModal;