document.addEventListener('DOMContentLoaded', function() {
    console.log('[ReelSense Debug] DOM fully loaded and parsed.');

    // --- Global Constants & Variables ---
    const BASE_URL = 'reelsense.netlify.app'; // *** REPLACE ***
    window.BASE_URL = BASE_URL || '';

    // --- Element References ---
    const getElement = (selector) => document.querySelector(selector);
    const getAllElements = (selector) => document.querySelectorAll(selector);

    // --- State Variables ---
    let allReviewsData = [];
    let currentFilters = { genre: 'all', search: '' };
    let currentSort = 'newest';
    let currentPage = 1;
    const reviewsPerPage = 6;

    // --- Page Type Detection ---
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const isHomePage = currentPath === 'index.html';
    const isAllReviewsPage = currentPath === 'all-reviews.html';
    const isReviewPage = !isHomePage && !isAllReviewsPage;

    // --- Main Initialization Flow ---
    function initializePage() {
        console.log('[ReelSense Debug] Initializing page...');
        try {
            // Setup UI elements FIRST - these should be reliable
            setupStaticUI();
            // THEN load data and render dynamic content
            loadDataAndRenderDynamicContent()
                .catch(handleAsyncError); // Central error handling for async operations
        } catch (error) {
             console.error("[ReelSense Critical Error] During initial sync setup:", error);
             document.body.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Error loading page components. Please refresh.</p>';
        }
    }

    // Setup UI elements that don't depend on fetched data
    function setupStaticUI() {
        console.log('[ReelSense Debug] Setting up static UI...');
        setupThemeSwitcher(); // ** Run this early and ensure it works **
        setupMobileMenu();
        setupFooterYear();
        setupBackToTop();
        setupForms();
        setupEventListeners(); // Listeners for non-data dependent things like search submit
        updateActiveNavLink();
        console.log('[ReelSense Debug] Static UI setup complete.');
    }

    // Load data and render content that depends on it
    async function loadDataAndRenderDynamicContent() {
        console.log('[ReelSense Debug] Starting async data load/render...');
        const reviewsGrid = getElement('.reviews-grid');

        if (isHomePage || isAllReviewsPage) {
            showSkeletons();
            if(reviewsGrid) reviewsGrid.style.display = 'none';
        }

        // Moved try/catch outside to handleAsyncError
        allReviewsData = await fetchReviews(); // Let error propagate if fetch fails
        console.log(`[ReelSense Debug] Fetched ${allReviewsData.length} reviews.`);

        if (isHomePage) {
            displayLatestReviews(allReviewsData);
        } else if (isAllReviewsPage) {
            populateFilterOptions(allReviewsData);
            handleUrlParameters();
            updateReviewDisplay(); // Includes rendering grid/pagination
            injectItemListSchema(allReviewsData);
        } else if (isReviewPage) {
            renderSinglePageRatings();
        }

        // Hide skeletons only after successful rendering steps for grid pages
        if (isHomePage || isAllReviewsPage) {
             hideSkeletons();
             if(reviewsGrid) reviewsGrid.style.display = 'grid';
         }
         console.log('[ReelSense Debug] Async data load/render complete.');
    }

    // Central error handler for the async part
    function handleAsyncError(error) {
        console.error('[ReelSense Error] During async data loading/rendering:', error);
        const reviewsStatus = getElement('#reviews-status');
        if (reviewsStatus) {
            reviewsStatus.textContent = 'Failed to load reviews. Please try refreshing.';
            reviewsStatus.classList.add('error');
        }
        const reviewsGrid = getElement('.reviews-grid');
        if(reviewsGrid) reviewsGrid.innerHTML = ''; // Clear grid
        const paginationContainer = getElement('#pagination-container');
        if(paginationContainer) paginationContainer.innerHTML = ''; // Clear pagination
        hideSkeletons(); // Still hide skeletons on error
    }


    // --- Data Fetching ---
    async function fetchReviews() {
        console.log('[ReelSense Debug] Fetching reviews from reviews.json...');
        // Ensure path is correct relative to the HTML file requesting it
        const response = await fetch('reviews.json');
        if (!response.ok) {
             const errorMsg = `Fetch Error: ${response.status} - ${response.statusText}. URL: ${response.url}`;
             console.error(`[ReelSense Error] ${errorMsg}`);
             throw new Error(errorMsg);
        }
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const errorMsg = `Received non-JSON response for reviews.json. Content-Type: ${contentType}`;
            console.error(`[ReelSense Error] ${errorMsg}`);
            throw new TypeError(errorMsg);
        }
        try {
            const data = await response.json();
            console.log('[ReelSense Debug] reviews.json fetched and parsed.');
            return data.sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0));
        } catch (jsonError) {
             console.error('[ReelSense Error] Failed to parse reviews.json:', jsonError);
             throw jsonError; // Re-throw parse error
        }
    }

    // --- Review Display & Rendering ---
    function displayLatestReviews(reviews) {
        const reviewsGrid = getElement('.reviews-grid');
        const reviewsStatus = getElement('#reviews-status');
        const viewAllContainer = getElement('.view-all-container');
        if (!reviewsGrid) return;

        reviewsGrid.innerHTML = '';
        const latestReviews = reviews.slice(0, 3);

        if (latestReviews.length === 0 && reviewsStatus) {
             reviewsStatus.textContent = 'No reviews available.';
             return;
        } else if (reviewsStatus) {
             reviewsStatus.textContent = '';
        }

        latestReviews.forEach((review, index) => {
            const reviewCard = createReviewCard(review);
            if (reviewCard) {
                reviewCard.style.animationDelay = `${index * 0.08}s`;
                reviewsGrid.appendChild(reviewCard);
            }
        });
        if (viewAllContainer) viewAllContainer.classList.toggle('hidden', reviews.length <= 3);
        console.log("[ReelSense Debug] Latest reviews displayed.");
    }

    function updateReviewDisplay() {
        const reviewsGrid = getElement('.reviews-grid');
        if (!isAllReviewsPage || !reviewsGrid) return;
        console.log(`[ReelSense Debug] Updating display. Filters: ${JSON.stringify(currentFilters)}, Sort: ${currentSort}, Page: ${currentPage}`);
        let filteredReviews = filterAndSortReviews();
        renderPaginatedReviews(filteredReviews);
    }

    function filterAndSortReviews() {
        let filtered = [...allReviewsData];
        const searchTerm = currentFilters.search.toLowerCase();
        const currentGenre = currentFilters.genre.toLowerCase();
        if (searchTerm) { filtered = filtered.filter(r => r.title.toLowerCase().includes(searchTerm) || (r.director && r.director.toLowerCase().includes(searchTerm)) || (r.genre && r.genre.some(g => g.toLowerCase().includes(searchTerm)))); }
        if (currentGenre !== 'all') { filtered = filtered.filter(r => r.genre && r.genre.map(g => g.toLowerCase()).includes(currentGenre)); }
        sortReviews(filtered, currentSort);
        return filtered;
    }

    function renderPaginatedReviews(filteredReviews) {
        const reviewsGrid = getElement('.reviews-grid');
        const reviewsStatus = getElement('#reviews-status');
        const paginationContainer = getElement('#pagination-container');
        const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
        currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
        const startIndex = (currentPage - 1) * reviewsPerPage;
        const endIndex = startIndex + reviewsPerPage;
        const paginatedReviews = filteredReviews.slice(startIndex, endIndex);
        renderReviewGrid(paginatedReviews);
        renderPagination(totalPages, currentPage);
        if (reviewsStatus) {
            if (filteredReviews.length === 0) { reviewsStatus.textContent = `No reviews found${currentFilters.search ? ` matching "${currentFilters.search}"` : ''}${currentFilters.genre !== 'all' ? ` in the "${currentFilters.genre}" genre` : ''}.`; }
            else { reviewsStatus.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, filteredReviews.length)} of ${filteredReviews.length} reviews.`; }
            reviewsStatus.classList.remove("error");
        }
    }

     function renderReviewGrid(reviewsToDisplay) {
         const reviewsGrid = getElement('.reviews-grid');
         if (!reviewsGrid) return; reviewsGrid.innerHTML = '';
         if (reviewsToDisplay.length === 0) return;
         reviewsToDisplay.forEach((review, index) => { const reviewCard = createReviewCard(review); if (reviewCard) { reviewCard.style.animationDelay = `${index * 0.08}s`; reviewsGrid.appendChild(reviewCard); } });
     }

    function createReviewCard(review) {
        //... (keep implementation the same) ...
        if (!review || !review.title || !review.fullReviewLink) return null; const card = document.createElement('article'); card.className = 'review-card'; card.dataset.reviewId = review.id; const ratingValue = review.rating || 0; card.innerHTML = ` <a href="${review.fullReviewLink}" class="card-link-wrapper" aria-label="Read full review for ${review.title}"> <img src="${review.image || 'placeholder-image.jpg'}" alt="${review.imageAlt || `Movie poster for ${review.title}`}" loading="lazy" width="340" height="250"> </a> <div class="review-content"> <h3><a href="${review.fullReviewLink}">${review.title} (${review.year || 'N/A'})</a></h3> <div class="review-meta"> ${review.director ? `<span><i class="fas fa-user-tie" aria-hidden="true"></i> ${review.director}</span>` : ''} ${review.genre && review.genre.length > 0 ? `<span><i class="fas fa-film" aria-hidden="true"></i> ${review.genre.join(', ')}</span>` : ''} </div> <div class="rating" aria-label="Rating: ${ratingValue.toFixed(1)} out of 5 stars" style="--rating-percent: ${calculateRatingPercent(ratingValue)}%;"> <span class="stars" aria-hidden="true"></span> <span class="rating-value">${ratingValue.toFixed(1)}/5.0</span> </div> <p>${review.excerpt || 'No excerpt available.'}</p> <a href="${review.fullReviewLink}" class="btn">Read Full Review</a> </div> `; return card;
    }

    function calculateRatingPercent(rating) {
        const clampedRating = Math.max(0, Math.min(5, rating)); return (clampedRating / 5) * 100;
    }

    // --- Filtering, Sorting, Pagination Logic ---
    function populateFilterOptions(reviews) {
        const genreFilterSelect = getElement('#genre-filter'); if (!genreFilterSelect) return; genreFilterSelect.length = 1; const genres = new Set(); reviews.forEach(r => { if (r.genre) r.genre.forEach(g => genres.add(g)); }); [...genres].sort((a, b) => a.localeCompare(b)).forEach(g => { const opt = document.createElement('option'); opt.value = g.toLowerCase(); opt.textContent = g; genreFilterSelect.appendChild(opt); }); console.log('[ReelSense Debug] Genre filters populated.');
    }

     function handleUrlParameters() {
         const urlParams = new URLSearchParams(window.location.search); const searchParam = urlParams.get('search'); const genreParam = urlParams.get('genre'); const filterSearchInput = getElement('#filter-search-input'); const genreFilterSelect = getElement('#genre-filter'); if (searchParam) { currentFilters.search = searchParam; if (filterSearchInput) filterSearchInput.value = searchParam; console.log(`[ReelSense Debug] URL Search: ${searchParam}`); } if (genreParam && genreFilterSelect) { const lowerGenre = genreParam.toLowerCase(); if ([...genreFilterSelect.options].some(o => o.value === lowerGenre)) { currentFilters.genre = lowerGenre; genreFilterSelect.value = lowerGenre; console.log(`[ReelSense Debug] URL Genre: ${lowerGenre}`); } else console.warn(`[ReelSense] URL Genre ('${genreParam}') not found.`); }
     }

    function sortReviews(reviews, sortBy) {
         switch (sortBy) { case 'rating_high': reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break; case 'rating_low': reviews.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break; case 'year_new': reviews.sort((a, b) => (b.year || 0) - (a.year || 0)); break; case 'year_old': reviews.sort((a, b) => (a.year || 0) - (b.year || 0)); break; case 'title_az': reviews.sort((a, b) => a.title.localeCompare(b.title)); break; case 'title_za': reviews.sort((a, b) => b.title.localeCompare(a.title)); break; case 'newest': default: reviews.sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0)); break; }
    }

    function renderPagination(totalPages, currentPage) {
        const paginationContainer = getElement('#pagination-container'); if (!paginationContainer || totalPages <= 1) { if (paginationContainer) paginationContainer.innerHTML = ''; return; } let html = '<nav aria-label="Reviews pagination"><ul class="pagination">'; html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous Page">«</a></li>`; for (let i = 1; i <= totalPages; i++) { html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`; } html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next Page">»</a></li>`; html += '</ul></nav>'; paginationContainer.innerHTML = html;
    }

    // --- Star Rendering (Single Page) ---
    function renderSinglePageRatings() {
         const mainRating = getElement('.review-header .rating[data-rating]'); if (mainRating) { const val = parseFloat(mainRating.dataset.rating); if (!isNaN(val)) renderStarsInElement(mainRating, val); }
         getAllElements('.review-body .rating-inline[data-rating]').forEach(el => { const val = parseFloat(el.dataset.rating); if (!isNaN(val)) renderStarsInElement(el, val); });
         console.log("[ReelSense Debug] Single page ratings rendered.");
    }

    function renderStarsInElement(element, rating) {
        //... (keep implementation the same) ...
        if (!element) return; const ratingValue = parseFloat(rating); if (isNaN(ratingValue)) return; let starsSpan = element.querySelector('.stars-direct'); if (!starsSpan) { starsSpan = document.createElement('span'); starsSpan.className = 'stars-direct'; const valueSpan = element.querySelector('.rating-value'); if (valueSpan) element.insertBefore(starsSpan, valueSpan); else element.prepend(starsSpan); } const fullStars = Math.floor(ratingValue); const hasHalfStar = ratingValue % 1 >= 0.4; let starsHTML = ''; for (let i = 0; i < 5; i++) { if (i < fullStars) starsHTML += '<i class="fas fa-star" aria-hidden="true"></i>'; else if (i === fullStars && hasHalfStar) starsHTML += '<i class="fas fa-star-half-alt" aria-hidden="true"></i>'; else starsHTML += '<i class="far fa-star" aria-hidden="true"></i>'; } starsSpan.innerHTML = starsHTML;
    }

    // --- Skeleton Loaders ---
    function showSkeletons() {
        const skeletonContainer = getElement('#skeleton-container');
        const reviewsGrid = getElement('.reviews-grid');
         if (!skeletonContainer || !(isHomePage || isAllReviewsPage)) return;
         skeletonContainer.innerHTML = ''; skeletonContainer.style.display = 'grid';
         if (reviewsGrid) reviewsGrid.style.display = 'none'; // Hide real grid
         const count = isHomePage ? 3 : reviewsPerPage;
         for (let i = 0; i < count; i++) { const skel = document.createElement('div'); skel.className = 'skeleton-card'; skel.innerHTML = `<div class="skeleton-image"></div><div class="skeleton-content"><div class="skeleton-line title"></div><div class="skeleton-line text"></div><div class="skeleton-line text short"></div><div class="skeleton-line button"></div></div>`; skeletonContainer.appendChild(skel); }
         console.log("[ReelSense Debug] Skeletons shown.");
    }

    function hideSkeletons() {
          const skeletonContainer = getElement('#skeleton-container');
          if (skeletonContainer) { skeletonContainer.style.display = 'none'; skeletonContainer.innerHTML = ''; }
          console.log("[ReelSense Debug] Skeletons hidden.");
    }

    // --- Back to Top Button ---
    function setupBackToTop() {
        const backToTopButton = getElement('#back-to-top');
         if (!backToTopButton) { console.warn("[ReelSense] Back-to-top button not found."); return; }
         window.addEventListener('scroll', () => { backToTopButton.classList.toggle('visible', window.scrollY > 300); });
         backToTopButton.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
         console.log("[ReelSense Debug] Back-to-top listener attached.");
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log('[ReelSense Debug] Setting up event listeners...');
        const filterControls = getElement('#filter-controls');
        const paginationContainer = getElement('#pagination-container');
        const heroSearchForm = getElement('#search-form');

        if (filterControls) { filterControls.addEventListener('input', handleFilterChange); filterControls.addEventListener('change', handleFilterChange); console.log('[ReelSense Debug] Filter/Sort listeners attached.'); }
        else if (isAllReviewsPage) console.warn('[ReelSense] Filter controls not found on All Reviews page.');

        if (paginationContainer) { paginationContainer.addEventListener('click', handlePaginationClick); console.log('[ReelSense Debug] Pagination listener attached.'); }
        else if (isAllReviewsPage) console.warn('[ReelSense] Pagination container not found on All Reviews page.');

        if (heroSearchForm) { heroSearchForm.addEventListener('submit', handleHeroSearch); console.log('[ReelSense Debug] Hero search listener attached.'); }
        else if (isHomePage) console.warn('[ReelSense] Hero search form not found on homepage.');
    }

    function handleFilterChange(event) {
        const targetId = event.target.id;
        let filterChanged = false;
        if (targetId === 'filter-search-input') { currentFilters.search = event.target.value; filterChanged = true; }
        else if (targetId === 'genre-filter') { currentFilters.genre = event.target.value; filterChanged = true; }
        else if (targetId === 'sort-select') { currentSort = event.target.value; filterChanged = true; }
        if (filterChanged) { currentPage = 1; updateReviewDisplay(); }
    }

    function handlePaginationClick(event) {
        event.preventDefault();
        const link = event.target.closest('.page-link'); // Target the link itself
        if (link) {
            const page = parseInt(link.dataset.page, 10);
            const parentLi = link.closest('.page-item');
            if (!isNaN(page) && page !== currentPage && parentLi && !parentLi.classList.contains('disabled')) {
                 currentPage = page;
                 updateReviewDisplay();
                 const targetElement = getElement('#filter-controls') || getElement('.reviews-grid');
                 if(targetElement) {
                    const headerOffset = getElement('header')?.offsetHeight || 80;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.scrollY - headerOffset - 20;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                 } else window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }

    function handleHeroSearch(event) {
         event.preventDefault();
         const searchInput = getElement('#search-input');
         const query = searchInput?.value.trim();
         if (query) { window.location.href = `all-reviews.html?search=${encodeURIComponent(query)}`; }
         else { console.log('[ReelSense Debug] Hero search query empty.'); if(searchInput) searchInput.focus(); }
     }

    // --- Other Setup Functions ---
    function setupThemeSwitcher() {
        const themeSwitcher = getElement('#theme-switcher');
        const body = document.body;
        if (!themeSwitcher) { console.warn('[ReelSense Error] Theme switcher button (#theme-switcher) not found!'); return; }
        const moonIcon = themeSwitcher.querySelector('.fa-moon');
        const sunIcon = themeSwitcher.querySelector('.fa-sun');
        if (!moonIcon || !sunIcon) { console.warn('[ReelSense Error] Theme switcher icons (.fa-moon, .fa-sun) not found!'); return; }

        function applyTheme(theme) {
            body.dataset.theme = theme;
            moonIcon.style.display = (theme === 'dark' ? 'none' : 'inline-block');
            sunIcon.style.display = (theme === 'dark' ? 'inline-block' : 'none');
            themeSwitcher.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
            // console.log(`[ReelSense Debug] Applied theme: ${theme}`); // Less verbose log
        }

        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

        themeSwitcher.addEventListener('click', () => {
            const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            console.log(`[ReelSense Debug] Theme toggled to: ${newTheme}`);
        });
        console.log("[ReelSense Debug] Theme switcher listener attached.");
    }

    function setupMobileMenu() {
        const menuToggle = getElement('.mobile-menu-toggle'); const mainNav = getElement('#main-nav'); if (menuToggle && mainNav) { const barsIcon = menuToggle.querySelector('.fa-bars'); const timesIcon = menuToggle.querySelector('.fa-times'); if (barsIcon && timesIcon) { timesIcon.style.display = 'none'; barsIcon.style.display = 'inline-block'; menuToggle.addEventListener('click', () => { const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true'; menuToggle.setAttribute('aria-expanded', !isExpanded); mainNav.classList.toggle('active'); barsIcon.style.display = isExpanded ? 'inline-block' : 'none'; timesIcon.style.display = isExpanded ? 'none' : 'inline-block'; }); console.log("[ReelSense Debug] Mobile menu listener attached."); } else console.warn("[ReelSense] Mobile menu icons missing."); } else console.warn("[ReelSense] Mobile menu toggle or nav not found.");
    }
    function setupFooterYear() {
        const yearSpan = getElement('#current-year'); if (yearSpan) yearSpan.textContent = new Date().getFullYear(); else console.warn("[ReelSense] Footer year span not found.");
    }
    function setupForms() {
        const contactForm = getElement('#contact-form'); const formStatus = getElement('#form-status'); if (contactForm && formStatus) { contactForm.addEventListener('submit', function(event) { event.preventDefault(); formStatus.textContent = 'Sending...'; formStatus.className = 'form-status sending'; const formData = new FormData(contactForm); const endpoint = contactForm.action || 'YOUR_FORM_SUBMISSION_ENDPOINT'; setTimeout(() => { console.log('[ReelSense Debug] Contact form submitted (simulated). Endpoint:', endpoint, 'Data:', Object.fromEntries(formData)); formStatus.textContent = 'Message sent successfully!'; formStatus.className = 'form-status success'; contactForm.reset(); }, 1500); }); console.log("[ReelSense Debug] Contact form listener attached."); } else if (isHomePage) console.warn("[ReelSense] Contact form or status element not found on homepage.");
    }
     function updateActiveNavLink() {
         const navLinks = getAllElements('.main-nav .nav-link'); let isLinkActive = false; navLinks.forEach(link => { link.classList.remove('active'); const linkHref = link.getAttribute('href'); const linkPath = linkHref.split('#')[0]; if (linkPath === currentPath || (linkPath === 'index.html' && currentPath === 'index.html')) { link.classList.add('active'); isLinkActive = true; } if (isHomePage && linkHref.startsWith('#') && window.location.hash === linkHref) { navLinks.forEach(l => l.classList.remove('active')); link.classList.add('active'); isLinkActive = true; } }); if (!isLinkActive && isHomePage && !window.location.hash) { const homeLink = getElement('.main-nav .nav-link[href^="index.html"]'); if (homeLink) { let otherActive = false; navLinks.forEach(l => { if(l !== homeLink && l.classList.contains('active')) otherActive = true; }); if (!otherActive) { homeLink.classList.add('active'); } } }
         window.removeEventListener('hashchange', updateActiveNavLink); window.addEventListener('hashchange', updateActiveNavLink);
         console.log("[ReelSense Debug] Active nav link updated.");
    }
     function injectItemListSchema(reviews) {
         if (!isAllReviewsPage || !BASE_URL || BASE_URL === 'reelsense.netlify.app') { if (isAllReviewsPage) console.warn("[ReelSense] Cannot generate ItemList schema: BASE_URL not configured."); return; }
         const schema = { "@context": "https://schema.org", "@type": "ItemList", name: "Movie Reviews on ReelSense", description: "A collection of movie reviews published on ReelSense.", url: `${BASE_URL}/all-reviews.html`, itemListElement: reviews.map((review, index) => ({ "@type": "ListItem", position: index + 1, item: { "@type": "Review", itemReviewed: { "@type": "Movie", name: review.title, director: review.director || undefined, datePublished: review.year ? `${review.year}-01-01` : undefined }, name: `Review of ${review.title} (${review.year})`, author: { "@type": "Organization", name: "ReelSense" }, reviewRating: { "@type": "Rating", "ratingValue": (review.rating || 0).toString(), "bestRating": "5", "worstRating": "1" }, reviewBody: review.excerpt, url: `${BASE_URL}/${review.fullReviewLink}` } })) };
         try { let scriptTag = document.head.querySelector('script[type="application/ld+json"][data-schema="itemList"]'); if (scriptTag) scriptTag.textContent = JSON.stringify(schema); else { scriptTag = document.createElement('script'); scriptTag.type = 'application/ld+json'; scriptTag.dataset.schema = 'itemList'; scriptTag.textContent = JSON.stringify(schema); document.head.appendChild(scriptTag); } console.log("[ReelSense Debug] ItemList schema injected/updated."); } catch (e) { console.error("[ReelSense Error] Injecting schema:", e); }
     }

    // --- Start the Application ---
    initializePage();

}); // End DOMContentLoaded