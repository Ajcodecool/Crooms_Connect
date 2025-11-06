// Array of Linux-themed wallpaper image URLs
const linuxWallpapers = [
    'https://images.unsplash.com/photo-1629654297299-c8506221ca97?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Linux penguin
    'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Terminal
    'https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Code
    'https://images.unsplash.com/photo-1556075798-4825dfaaf498?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Server
    'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Open source
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Linux logo
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Tech
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Programming
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80', // Computer
    'https://images.unsplash.com/photo-1486312338219-ce68e2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80'  // Workspace
];

// Function to get current wallpaper index from localStorage
function getCurrentWallpaperIndex() {
    return parseInt(localStorage.getItem('currentWallpaperIndex')) || 0;
}

// Function to set current wallpaper index in localStorage
function setCurrentWallpaperIndex(index) {
    localStorage.setItem('currentWallpaperIndex', index);
}

// Function to apply wallpaper to body
function applyWallpaper(index) {
    const wallpaperUrl = linuxWallpapers[index];
    document.body.style.backgroundImage = `url('${wallpaperUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
}

// Function to change to next wallpaper
function changeWallpaper() {
    let currentIndex = getCurrentWallpaperIndex();
    currentIndex = (currentIndex + 1) % linuxWallpapers.length;
    setCurrentWallpaperIndex(currentIndex);
    applyWallpaper(currentIndex);
}

// Apply current wallpaper on page load
document.addEventListener('DOMContentLoaded', function() {
    const currentIndex = getCurrentWallpaperIndex();
    applyWallpaper(currentIndex);
});
