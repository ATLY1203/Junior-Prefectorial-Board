// UI Components
import { getShieldIconSVG, getModernLogo } from './utils.js';

// Navbar component
export const renderNavbar = (onMobileMenuToggle) => {
    return `
        <nav class="bg-white shadow-lg border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 flex items-center">
                            ${getShieldIconSVG(32, 'text-blue-600')}
                            <span class="ml-2 text-xl font-bold text-gray-900">Junior Prefectorial Board</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center">
                        <button onclick="${onMobileMenuToggle}" class="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `;
};

// Sidebar component
export const renderSidebar = (currentLoggedInUser, onNavigate, onLogout, mobileOpen, sidebarVisible) => {
    const isTeacher = currentLoggedInUser && currentLoggedInUser.role === 'teacher';
    const isCouncil = currentLoggedInUser && currentLoggedInUser.role && currentLoggedInUser.role.startsWith('council_');
    
    let rateTargetRole = 'prefect';
    let rateTargetLabel = 'Prefects';
    let ratePageTitle = 'Rate Prefects';
    
    if (isTeacher) {
        rateTargetRole = 'all';
        rateTargetLabel = 'Students';
        ratePageTitle = 'Rate Students';
    } else if (isCouncil) {
        rateTargetRole = 'prefect';
        rateTargetLabel = 'Prefects';
        ratePageTitle = 'Rate Prefects';
    }

    const sidebarDesktopExpandedClasses = `fixed left-0 top-0 h-full bg-gradient-to-b from-blue-600 to-blue-800 text-white w-64 md:w-80 transform transition-transform duration-300 ease-in-out z-30 ${sidebarVisible ? 'translate-x-0' : '-translate-x-full'}`;
    const sidebarMobileClasses = `fixed left-0 top-0 h-full bg-gradient-to-b from-blue-600 to-blue-800 text-white w-64 transform transition-transform duration-300 ease-in-out z-30 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`;
    const finalDisplayClasses = `${sidebarDesktopExpandedClasses} ${sidebarMobileClasses}`;

    return `
        <div class="${finalDisplayClasses}">
            <div class="flex flex-col h-full">
                <!-- Header -->
                <div class="flex items-center justify-between p-6 border-b border-blue-500">
                    <div class="flex items-center space-x-3">
                        ${getShieldIconSVG(32, 'text-white')}
                        <div>
                            <h1 class="text-xl font-bold">Junior Prefectorial Board</h1>
                            <p class="text-blue-200 text-sm">Once A Prefect, Forever A Prefect</p>
                        </div>
                    </div>
                    <button onclick="toggleSidebarVisibility()" class="text-blue-200 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <!-- Navigation -->
                <nav class="flex-1 p-6 space-y-4">
                    <button onclick="${onNavigate}('home')" class="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9,22 9,12 15,12 15,22"/>
                        </svg>
                        <span>Home</span>
                    </button>
                    
                    <button onclick="${onNavigate}('duty-council')" class="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                            <path d="M12 11h4"/>
                            <path d="M12 16h4"/>
                            <path d="M8 11h.01"/>
                            <path d="M8 16h.01"/>
                        </svg>
                        <span>Duty & Council Info</span>
                    </button>
                    
                    <button onclick="${onNavigate}('announcements')" class="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m3 11 18-2L13 22 3 11Z"/>
                            <path d="M7 7v7"/>
                            <path d="M21 9v.5c0 .8-.5 1.5-1.3 1.8l-4 1.2c-.7.2-1.5.1-2.1-.3l-.7-.9c-.5-.6-1.3-1-2.2-1H3"/>
                        </svg>
                        <span>Announcement Board</span>
                    </button>
                    
                    ${isTeacher || isCouncil ? `
                        <button onclick="${onNavigate}('rate-prefects')" class="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
                            </svg>
                            <span>Rate ${rateTargetLabel}</span>
                        </button>
                    ` : ''}
                    
                    <button onclick="${onNavigate}('profile')" class="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-700 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                        </svg>
                        <span>Profile</span>
                    </button>
                </nav>

                <!-- User Info & Logout -->
                <div class="p-6 border-t border-blue-500">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                            </svg>
                        </div>
                        <div>
                            <p class="font-semibold">${currentLoggedInUser ? currentLoggedInUser.name : 'User'}</p>
                            <p class="text-blue-200 text-sm">${currentLoggedInUser ? currentLoggedInUser.role : 'Role'}</p>
                        </div>
                    </div>
                    <button onclick="${onLogout}" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    `;
};

// Floating sidebar toggle button
export const renderFloatingSidebarToggle = () => {
    return `
        <button onclick="toggleSidebarVisibility()" class="fixed top-20 left-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
        </button>
    `;
}; 