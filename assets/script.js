// Theme and Font Size Management
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'purple';
        this.currentFontScale = parseFloat(localStorage.getItem('fontScale')) || 1;
        this.init();
    }
    
    init() {
        // Apply saved theme and font scale
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        document.documentElement.style.setProperty('--font-scale', this.currentFontScale);
        
        // Set up event listeners
        const themeButton = document.getElementById('theme-switcher');
        const fontSlider = document.getElementById('font-slider');
        
        if (themeButton) {
            themeButton.addEventListener('click', () => this.toggleTheme());
        }
        
        if (fontSlider) {
            fontSlider.value = this.currentFontScale;
            fontSlider.addEventListener('input', (e) => this.updateFontSize(e.target.value));
        }
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'purple' ? 'brown' : 'purple';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
        
        // Update button emoji
        const themeButton = document.getElementById('theme-switcher');
        themeButton.textContent = this.currentTheme === 'purple' ? '🟤' : '🟣';
    }
    
    updateFontSize(scale) {
        this.currentFontScale = parseFloat(scale);
        document.documentElement.style.setProperty('--font-scale', this.currentFontScale);
        localStorage.setItem('fontScale', this.currentFontScale);
        
        // Update font size display
        const fontSizeValue = document.getElementById('font-size-value');
        if (fontSizeValue) {
            const baseFontSize = 16;
            const currentSize = Math.round(baseFontSize * this.currentFontScale);
            fontSizeValue.textContent = `${currentSize}px`;
        }
    }
}

// Font control expand/collapse functionality
class FontControl {
    constructor() {
        this.fontControl = document.getElementById('font-control');
        this.fontControlTimeout = null;
        this.init();
    }
    
    init() {
        if (!this.fontControl) return;
        
        this.fontControl.addEventListener('click', () => {
            this.fontControl.classList.toggle('expanded');
            clearTimeout(this.fontControlTimeout);
            
            if (this.fontControl.classList.contains('expanded')) {
                this.fontControlTimeout = setTimeout(() => {
                    this.fontControl.classList.remove('expanded');
                }, 5000);
            }
        });

        this.fontControl.addEventListener('mouseleave', () => {
            if (!this.fontControl.classList.contains('expanded')) {
                clearTimeout(this.fontControlTimeout);
            }
        });
    }
}

// Hamburger menu functionality
class HamburgerMenu {
    constructor() {
        this.hamburger = document.getElementById('hamburger');
        this.nav = document.getElementById('nav');
        this.init();
    }
    
    init() {
        if (!this.hamburger || !this.nav) return;
        
        this.hamburger.addEventListener('click', () => {
            this.hamburger.classList.toggle('active');
            this.nav.classList.toggle('active');
            document.body.classList.toggle('nav-open');
        });
        
        // Close menu when clicking on a link
        document.querySelectorAll('.navbar a').forEach(link => {
            link.addEventListener('click', () => {
                this.hamburger.classList.remove('active');
                this.nav.classList.remove('active');
                document.body.classList.remove('nav-open');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.hamburger.contains(e.target) && !this.nav.contains(e.target)) {
                this.hamburger.classList.remove('active');
                this.nav.classList.remove('active');
                document.body.classList.remove('nav-open');
            }
        });
    }
}

// Dial navigation functionality
class DialNavigation {
    constructor() {
        this.dialItems = document.querySelectorAll('.dial-item');
        this.dialCenter = document.querySelector('.dial-center');
        this.init();
    }
    
    init() {
        if (!this.dialItems.length) return;
        
        // Smooth scrolling for dial navigation
        this.dialItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = item.getAttribute('data-target');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
}

// Back to top functionality
class BackToTop {
    constructor() {
        this.backToTopBtn = document.getElementById('back-to-top');
        this.init();
    }
    
    init() {
        if (!this.backToTopBtn) return;
        
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                this.backToTopBtn.classList.add('show');
            } else {
                this.backToTopBtn.classList.remove('show');
            }
        });
        
        this.backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Draggable dial indicator for scrolling
class DraggableDialIndicator {
    constructor() {
        this.dialIndicator = document.querySelector('.dial-indicator');
        this.dialCenter = document.querySelector('.dial-center');
        this.sections = document.querySelectorAll('section[id]');
        this.isDragging = false;
        this.startY = 0;
        this.startTop = 0;
        this.init();
    }

    init() {
        if (!this.dialIndicator || !this.dialCenter) return;

        this.dialIndicator.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        this.dialIndicator.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }

    handleMouseDown(e) {
        this.startDrag(e.clientY);
        e.preventDefault();
        e.stopPropagation();
    }

    handleTouchStart(e) {
        this.startDrag(e.touches[0].clientY);
        e.preventDefault();
        e.stopPropagation();
    }

    startDrag(clientY) {
        this.isDragging = true;
        this.startY = clientY;
        const indicatorRect = this.dialIndicator.getBoundingClientRect();
        this.startTop = indicatorRect.top + window.scrollY;
        this.dialIndicator.classList.add('dragging');
    }

    handleMouseMove(e) {
        if (!this.isDragging) return;
        this.updatePosition(e.clientY);
    }

    handleTouchMove(e) {
        if (!this.isDragging) return;
        this.updatePosition(e.touches[0].clientY);
        e.preventDefault();
    }

    updatePosition(clientY) {
        const deltaY = clientY - this.startY;
        const centerRect = this.dialCenter.getBoundingClientRect();
        
        // Calculate new position relative to the center bar
        const centerTop = centerRect.top;
        const centerHeight = centerRect.height;
        const newIndicatorY = this.startTop + deltaY - centerTop;
        
        // Constrain to center bar bounds
        const constrainedY = Math.max(0, Math.min(centerHeight, newIndicatorY));
        const percentage = constrainedY / centerHeight;
        
        // Update indicator position
        this.dialIndicator.style.top = `${percentage * 100}%`;
        
        // Calculate corresponding scroll position
        const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
        const targetScrollY = percentage * documentHeight;
        
        // Scroll to the calculated position
        window.scrollTo({
            top: targetScrollY,
            behavior: 'auto' // Use auto for smooth dragging
        });
    }

    handleMouseUp() {
        this.endDrag();
    }

    handleTouchEnd() {
        this.endDrag();
    }

    endDrag() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.dialIndicator.classList.remove('dragging');
    }
}

// Infinity scroll navigation logic
class InfinityScrollNavigation {
    constructor() {
        this.sections = document.querySelectorAll('section[id]');
        this.dialItems = document.querySelectorAll('.dial-item');
        this.init();
    }
    
    init() {
        if (!this.sections.length || !this.dialItems.length) return;
        
        window.addEventListener('scroll', () => this.updateInfinityNavigation());
        
        // Initialize on load
        this.updateInfinityNavigation();
    }
    
    updateInfinityNavigation() {
        let current = '';
        let currentIndex = -1;
        
        // Find current section
        this.sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            if (window.pageYOffset >= sectionTop - 200) {
                current = section.getAttribute('id');
                currentIndex = index;
            }
        });
        
        // Update dial items with infinity scroll effect
        this.dialItems.forEach((item, index) => {
            const targetId = item.getAttribute('data-target').substring(1);
            const sectionIndex = Array.from(this.sections).findIndex(s => s.id === targetId);
            
            item.classList.remove('active', 'above', 'below', 'hidden');
            
            if (sectionIndex === currentIndex) {
                item.classList.add('active');
            } else if (sectionIndex === currentIndex - 1) {
                item.classList.add('above');
            } else if (sectionIndex === currentIndex + 1) {
                item.classList.add('below');
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Update indicator position
        const activeItem = document.querySelector('.dial-item.active');
        if (activeItem) {
            const indicator = document.querySelector('.dial-indicator');
            if (indicator) {
                const progress = (currentIndex / (this.sections.length - 1)) * 100;
                indicator.style.top = `${Math.max(10, Math.min(90, progress))}%`;
            }
        }
    }
}

// Initialize all components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    const themeManager = new ThemeManager();
    const fontControl = new FontControl();
    const hamburgerMenu = new HamburgerMenu();
    const dialNavigation = new DialNavigation();
    const backToTop = new BackToTop();
    const draggableDialIndicator = new DraggableDialIndicator();
    const infinityScrollNavigation = new InfinityScrollNavigation();
});