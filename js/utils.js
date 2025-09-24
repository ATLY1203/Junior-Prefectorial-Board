// Utility Functions

// Message box functions
export const showMessageBox = (message, type = 'info') => {
    // Defensive normalization: ensure we never display null/undefined or raw objects
    let text;
    if (message === null || typeof message === 'undefined') {
        text = 'An unknown error occurred.';
    } else if (typeof message === 'object') {
        text = message.message || JSON.stringify(message);
    } else {
        text = String(message);
    }

    const messageBox = document.getElementById('messageBox');
    const messageText = document.getElementById('messageText');
    
    if (messageBox && messageText) {
        messageText.textContent = text;
        messageBox.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-0 ${getMessageBoxClasses(type)}`;
        messageBox.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideMessageBox();
        }, 5000);
    }
};

export const hideMessageBox = () => {
    const messageBox = document.getElementById('messageBox');
    if (messageBox) {
        messageBox.style.display = 'none';
    }
};

const getMessageBoxClasses = (type) => {
    switch (type) {
        case 'success':
            return 'bg-green-500 text-white';
        case 'error':
            return 'bg-red-500 text-white';
        case 'warning':
            return 'bg-yellow-500 text-white';
        default:
            return 'bg-blue-500 text-white';
    }
};

// Time formatting functions
export const getTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
};

export const isOneDayOld = (createdAt) => {
    const now = new Date();
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffInHours = (now - createdDate) / (1000 * 60 * 60);
    return diffInHours >= 24;
};

export const shouldDelete = (createdAt) => {
    const now = new Date();
    const createdDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const diffInHours = (now - createdDate) / (1000 * 60 * 60);
    return diffInHours >= 24;
};

// SVG Icon functions
export const getShieldIconSVG = (size = 32, className = 'text-white') => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>`;
};

export const getModernLogo = (size = 32, className = 'text-white') => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${className}">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
        <path d="M2 17l10 5 10-5"/>
        <path d="M2 12l10 5 10-5"/>
    </svg>`;
};

// Role checking functions
export const isTeacher = (userProfile) => {
    return userProfile && userProfile.role === 'teacher';
};

export const isCouncil = (userProfile) => {
    return userProfile && userProfile.role && userProfile.role.startsWith('council_');
};

export const canCreateAnnouncement = (userProfile) => {
    if (!userProfile) return false;
    
    const allowedRoles = [
        'teacher',
        'council_ketua',
        'council_timbalan_i',
        'council_timbalan_ii',
        'council_penerangan_kerohanian_i',
        'council_penerangan_kerohanian_ii'
    ];
    
    return allowedRoles.includes(userProfile.role);
};

export const canDeleteAnnouncement = (userProfile) => {
    return canCreateAnnouncement(userProfile);
}; 