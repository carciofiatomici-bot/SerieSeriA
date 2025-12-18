/**
 * ====================================================================
 * PULL-TO-REFRESH.JS - Sistema di aggiornamento swipe
 * ====================================================================
 * Versione corretta: Soglia 80px per facile attivazione su PWA.
 */

window.PullToRefresh = {
    threshold: 80,           // Pixel minimi (prima era 150, troppo alto)
    maxPull: 140,            // Massimo spostamento visivo
    resistance: 2.2,         // Resistenza (prima era 4, troppo pesante)

    startY: 0,
    currentY: 0,
    isPulling: false,
    isRefreshing: false,

    indicator: null,
    spinner: null,

    init() {
        if (!('ontouchstart' in window || navigator.maxTouchPoints > 0)) return;

        this.createIndicator();
        this.bindEvents();
        console.log('[PTR] Sistema inizializzato (Soglia: 80px)');
    },

    createIndicator() {
        if (document.getElementById('pull-refresh-indicator')) return;

        this.indicator = document.createElement('div');
        this.indicator.id = 'pull-refresh-indicator';
        this.indicator.className = 'fixed top-0 left-0 right-0 z-[99999] flex items-center justify-center pointer-events-none opacity-0';
        this.indicator.style.transform = 'translateY(-100%)';

        this.spinner = document.createElement('div');
        this.spinner.className = 'bg-gray-800 border-2 border-green-500 rounded-full p-3 shadow-2xl';
        this.spinner.innerHTML = `
            <svg class="w-6 h-6 text-green-400" id="ptr-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15">
                </path>
            </svg>
        `;

        this.indicator.appendChild(this.spinner);
        document.body.appendChild(this.indicator);
    },

    bindEvents() {
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY > 5 || this.isRefreshing) return;
            this.startY = e.touches[0].clientY;
            this.isPulling = true;
            this.indicator.style.transition = 'none';
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!this.isPulling || this.isRefreshing) return;

            this.currentY = e.touches[0].clientY;
            const diff = (this.currentY - this.startY) / this.resistance;

            if (diff > 0) {
                if (e.cancelable) e.preventDefault();
                this.updateUI(diff);
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (!this.isPulling || this.isRefreshing) return;

            const finalDiff = (this.currentY - this.startY) / this.resistance;
            if (finalDiff >= this.threshold) {
                this.triggerRefresh();
            } else {
                this.resetUI();
            }
            this.isPulling = false;
        }, { passive: true });
    },

    updateUI(dist) {
        const pull = Math.min(dist, this.maxPull);
        this.indicator.style.opacity = Math.min(pull / this.threshold, 1);
        this.indicator.style.transform = `translateY(${Math.min(pull - 40, 40)}px)`;
        
        const icon = document.getElementById('ptr-icon-svg');
        if (icon) icon.style.transform = `rotate(${dist * 2}deg)`;
    },

    resetUI() {
        this.indicator.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s';
        this.indicator.style.transform = 'translateY(-100%)';
        this.indicator.style.opacity = '0';
    },

    triggerRefresh() {
        this.isRefreshing = true;
        this.indicator.style.transition = 'transform 0.2s ease';
        this.indicator.style.transform = 'translateY(40px)';
        
        const icon = document.getElementById('ptr-icon-svg');
        if (icon) icon.classList.add('animate-spin');

        setTimeout(() => window.location.reload(), 600);
    }
};

window.PullToRefresh.init();