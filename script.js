// --- START OF MODIFIED script.js ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ReelSense DETAILED] DOMContentLoaded event fired.'); // New Log

    // --- Global Constants & Variables ---
    const BASE_URL = 'https://reelsense.netlify.app'; // Ensure this is correct
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

    console.log(`[ReelSense DETAILED] Page Type Detected: path=${currentPath}, isHomePage=${isHomePage}, isAllReviewsPage=${isAllReviewsPage}, isReviewPage=${isReviewPage}`); // New Log

    // --- Main Initialization Flow ---
    function initializePage() {
        console.log('[ReelSense DETAILED] Initializing page START...'); // Modified Log
        try {
            setupStaticUI();
            loadDataAndRenderDynamicContent()
                .catch(handleAsyncError);
        } catch (error) {
            console.error("[ReelSense Critical Error] During initial sync setup:", error);
            handleAsyncError(error); // Use central handler
        }
         console.log('[ReelSense DETAILED] Initializing page END.'); // New Log
    }

    // Setup UI elements that don't depend on fetched data
    function setupStaticUI() {
        console.log('[ReelSense DETAILED] Setting up static UI START...'); // Modified Log
        setupThemeSwitcher();
        setupMobileMenu();
        setupFooterYear();
        setupBackToTop();
        setupForms();
        setupEventListeners();
        updateActiveNavLink();
        console.log('[ReelSense DETAILED] Setting up static UI END.'); // Modified Log
    }

    // Load data and render content that depends on it
    async function loadDataAndRenderDynamicContent() {
        console.log('[ReelSense DETAILED] Starting async data load/render START...'); // Modified Log
        const reviewsGrid = getElement('.reviews-grid');

        if (isHomePage || isAllReviewsPage) {
            console.log('[ReelSense DETAILED] Showing skeletons...'); // New Log
            showSkeletons();
            if(reviewsGrid) reviewsGrid.style.display = 'none';
        }

        // Fetch data
        allReviewsData = await fetchReviews(); // Let error propagate
        console.log(`[ReelSense DETAILED] Fetched ${allReviewsData.length} reviews.`); // Modified Log

        // Render based on page type
        if (isHomePage) {
            console.log('[ReelSense DETAILED] Rendering for HomePage...'); // New Log
            displayLatestReviews(allReviewsData);
        } else if (isAllReviewsPage) {
            console.log('[ReelSense DETAILED] Rendering for AllReviewsPage...'); // New Log
            populateFilterOptions(allReviewsData);
            handleUrlParameters();
            updateReviewDisplay(); // Includes rendering grid/pagination
            // Inject schema removed for now to simplify debugging, re-add later
            // injectItemListSchema(allReviewsData);
        } else if (isReviewPage) {
             console.log('[ReelSense DETAILED] Rendering for ReviewPage...'); // New Log
             renderSinglePageRatings();
         }


        // Hide skeletons only after successful rendering steps for grid pages
        if (isHomePage || isAllReviewsPage) {
            console.log('[ReelSense DETAILED] Hiding skeletons...'); // New Log
             hideSkeletons();
             if(reviewsGrid) {
                reviewsGrid.style.display = 'grid';
                console.log('[ReelSense DETAILED] reviewsGrid display set to grid.'); // New Log
             } else {
                console.warn('[ReelSense DETAILED] reviewsGrid element not found for display update.'); // New Log
             }
         }
         console.log('[ReelSense DETAILED] Async data load/render END.'); // Modified Log
    }

    // Central error handler for the async part
    function handleAsyncError(error) {
        console.error('[ReelSense Error] During async data loading/rendering:', error); // Keep original error log
        console.log('[ReelSense DETAILED] handleAsyncError triggered.'); // New Log
        const reviewsStatus = getElement('#reviews-status');
        if (reviewsStatus) {
            reviewsStatus.textContent = 'Failed to load reviews. Please try refreshing.';
            reviewsStatus.classList.add('error');
        }
        const reviewsGrid = getElement('.reviews-grid');
        if(reviewsGrid) reviewsGrid.innerHTML = '';
        const paginationContainer = getElement('#pagination-container');
        if(paginationContainer) paginationContainer.innerHTML = '';
        hideSkeletons();
    }


    // --- Data Fetching ---
    async function fetchReviews() {
        console.log('[ReelSense DETAILED] Fetching reviews from reviews.json START...'); // Modified Log
        try {
            const response = await fetch('reviews.json'); // Assuming reviews.json is in the root
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
            const data = await response.json();
            console.log('[ReelSense DETAILED] reviews.json fetched and parsed OK.'); // Modified Log
            // Sort newest first
            const sortedData = data.sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0));
            console.log('[ReelSense DETAILED] Reviews sorted by date.'); // New Log
            return sortedData;
        } catch (error) {
             console.error('[ReelSense Error] Failure inside fetchReviews:', error); // New Log
             throw error; // Re-throw to be caught by handleAsyncError
        }
    }

    // --- Review Display & Rendering ---
    function displayLatestReviews(reviews) {
         console.log('[ReelSense DETAILED] displayLatestReviews START.'); // New Log
         const reviewsGrid = getElement('.reviews-grid');
         const reviewsStatus = getElement('#reviews-status');
         const viewAllContainer = getElement('.view-all-container');
         if (!reviewsGrid) {
            console.warn('[ReelSense DETAILED] reviewsGrid not found in displayLatestReviews.'); // New Log
            return;
        }

        reviewsGrid.innerHTML = '';
        const latestReviews = reviews.slice(0, 3);

         if (latestReviews.length === 0 && reviewsStatus) {
             reviewsStatus.textContent = 'No reviews available.';
             return;
         } else if (reviewsStatus) {
             reviewsStatus.textContent = '';
         }

         console.log(`[ReelSense DETAILED] Displaying ${latestReviews.length} latest reviews.`); // New Log
        latestReviews.forEach((review, index) => {
            const reviewCard = createReviewCard(review);
            if (reviewCard) {
                reviewCard.style.animationDelay = `${index * 0.08}s`;
                reviewsGrid.appendChild(reviewCard);
            } else {
                console.warn(`[ReelSense DETAILED] Failed to create card for latest review:`, review); // New Log
            }
        });
        if (viewAllContainer) viewAllContainer.classList.toggle('hidden', reviews.length <= 3);
         console.log("[ReelSense DETAILED] displayLatestReviews END."); // New Log
    }

    function updateReviewDisplay() {
        const reviewsGrid = getElement('.reviews-grid');
        if (!isAllReviewsPage || !reviewsGrid) {
             console.log('[ReelSense DETAILED] updateReviewDisplay skipped (not AllReviewsPage or no grid).'); // New Log
             return;
        }
         console.log(`[ReelSense DETAILED] updateReviewDisplay START. Filters: ${JSON.stringify(currentFilters)}, Sort: ${currentSort}, Page: ${currentPage}`); // Modified Log
        let filteredReviews = filterAndSortReviews();
        renderPaginatedReviews(filteredReviews);
         console.log('[ReelSense DETAILED] updateReviewDisplay END.'); // New Log
    }

    function filterAndSortReviews() {
        console.log('[ReelSense DETAILED] filterAndSortReviews START.'); // New Log
        let filtered = [...allReviewsData];
        const searchTerm = currentFilters.search.toLowerCase();
        const currentGenre = currentFilters.genre.toLowerCase();
        if (searchTerm) { filtered = filtered.filter(r => r.title.toLowerCase().includes(searchTerm) || (r.director && r.director.toLowerCase().includes(searchTerm)) || (r.genre && r.genre.some(g => g.toLowerCase().includes(searchTerm)))); }
        if (currentGenre !== 'all') { filtered = filtered.filter(r => r.genre && r.genre.map(g => g.toLowerCase()).includes(currentGenre)); }
         console.log(`[ReelSense DETAILED] Reviews filtered (count: ${filtered.length}). Sorting by ${currentSort}...`); // New Log
        sortReviews(filtered, currentSort);
         console.log('[ReelSense DETAILED] filterAndSortReviews END.'); // New Log
        return filtered;
    }

    function renderPaginatedReviews(filteredReviews) {
        console.log('[ReelSense DETAILED] renderPaginatedReviews START.'); // New Log
        const reviewsGrid = getElement('.reviews-grid');
        const reviewsStatus = getElement('#reviews-status');
        const paginationContainer = getElement('#pagination-container');
        const totalPages = Math.ceil(filteredReviews.length / reviewsPerPage);
        currentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
        const startIndex = (currentPage - 1) * reviewsPerPage;
        const endIndex = startIndex + reviewsPerPage;
        const paginatedReviews = filteredReviews.slice(startIndex, endIndex);

         console.log(`[ReelSense DETAILED] Total pages: ${totalPages}, Current Page: ${currentPage}, Rendering reviews ${startIndex + 1} to ${Math.min(endIndex, filteredReviews.length)}`); // New Log

        renderReviewGrid(paginatedReviews); // Calls function with detailed logs
        renderPagination(totalPages, currentPage); // Assuming pagination itself isn't the issue

        if (reviewsStatus) {
            if (filteredReviews.length === 0) { reviewsStatus.textContent = `No reviews found${currentFilters.search ? ` matching "${currentFilters.search}"` : ''}${currentFilters.genre !== 'all' ? ` in the "${currentFilters.genre}" genre` : ''}.`; }
            else { reviewsStatus.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, filteredReviews.length)} of ${filteredReviews.length} reviews.`; }
            reviewsStatus.classList.remove("error");
             console.log(`[ReelSense DETAILED] reviewsStatus updated: "${reviewsStatus.textContent}"`); // New Log
         } else {
             console.warn('[ReelSense DETAILED] reviewsStatus element not found.'); // New Log
         }
         console.log('[ReelSense DETAILED] renderPaginatedReviews END.'); // New Log
    }

     function renderReviewGrid(reviewsToDisplay) {
         console.log('[ReelSense DETAILED] renderReviewGrid START.'); // Modified Log
         const reviewsGrid = getElement('.reviews-grid');
         if (!reviewsGrid) {
            console.warn('[ReelSense DETAILED] reviewsGrid not found in renderReviewGrid.'); // New Log
            return;
        }
        reviewsGrid.innerHTML = ''; // Clear existing

         // *** Added Log Here ***
         console.log(`[ReelSense DETAILED] About to loop through ${reviewsToDisplay.length} reviews to create cards.`);

         if (reviewsToDisplay.length === 0) {
             console.log('[ReelSense DETAILED] No reviews to display in grid.'); // New Log
             return; // Exit if no reviews
         }

         reviewsToDisplay.forEach((review, index) => {
             // *** Added Log Here ***
             console.log(`[ReelSense DETAILED] Creating card for index ${index}, title: ${review ? review.title : 'undefined review'}`);

             const reviewCard = createReviewCard(review); // Calls function with detailed logs
             if (reviewCard) {
                 reviewCard.style.animationDelay = `${index * 0.08}s`;
                 reviewsGrid.appendChild(reviewCard);
                 // *** Added Log Here ***
                 console.log(`[ReelSense DETAILED]   Successfully appended card for: ${review.title}`);
             } else {
                 // Warning already logged in createReviewCard if it returns null
                 console.warn(`[ReelSense DETAILED]   Card creation returned null/undefined for index ${index}.`);
             }
         });
         console.log('[ReelSense DETAILED] renderReviewGrid END.'); // Modified Log
     }

    function createReviewCard(review) {
         // *** Added Log Here ***
         // console.log(`[ReelSense DETAILED] createReviewCard called for: ${review ? review.title : 'undefined review'}`);

         if (!review || !review.title || !review.fullReviewLink) {
             console.warn(`[ReelSense DETAILED] Skipping card creation - Missing data for review ID: ${review ? review.id : 'N/A'}. Title: ${review ? review.title : 'N/A'}, Link: ${review ? review.fullReviewLink : 'N/A'}`); // Modified Log
             return null;
         }
         const card = document.createElement('article');
         card.className = 'review-card';
         card.dataset.reviewId = review.id;
         const ratingValue = review.rating || 0;
         const reviewYear = review.year || 'N/A';
         const director = review.director || '';
         const genres = Array.isArray(review.genre) ? review.genre.join(', ') : '';
         const imageSrc = review.image || '/images/placeholder-poster.jpg'; // Use a fallback
         const imageAlt = review.imageAlt || `${review.title} (${reviewYear}) Movie Poster`;

         card.innerHTML = `
             <a href="${review.fullReviewLink}" class="card-link-wrapper" aria-label="Read full review for ${review.title}">
                 <img src="${imageSrc}" alt="${imageAlt}" loading="lazy" width="340" height="220"> <!-- Adjusted height to match CSS potentially -->
             </a>
             <div class="review-content">
                 <h3><a href="${review.fullReviewLink}">${review.title} (${reviewYear})</a></h3>
                 <div class="review-meta">
                     ${director ? `<span><i class="fas fa-user-tie" aria-hidden="true"></i> ${director}</span>` : ''}
                     ${genres ? `<span><i class="fas fa-film" aria-hidden="true"></i> ${genres}</span>` : ''}
                 </div>
                 <div class="rating" aria-label="Rating: ${ratingValue.toFixed(1)} out of 5 stars" style="--rating-percent: ${calculateRatingPercent(ratingValue)}%;">
                     <span class="stars" aria-hidden="true"></span>
                     <span class="rating-value">${ratingValue.toFixed(1)}/5.0</span>
                 </div>
                 <p>${review.excerpt || 'No excerpt available.'}</p>
                 <a href="${review.fullReviewLink}" class="btn">Read Full Review</a>
             </div>
         `;

         // *** Added Log Here ***
         // console.log(`[ReelSense DETAILED]   Created card HTML for: ${review.title}`);

         return card;
     }


    function calculateRatingPercent(rating) {
        const clampedRating = Math.max(0, Math.min(5, rating)); return (clampedRating / 5) * 100;
    }

    // --- Filtering, Sorting, Pagination Logic ---
    function populateFilterOptions(reviews) {
        console.log('[ReelSense DETAILED] populateFilterOptions START.'); // New Log
        const genreFilterSelect = getElement('#genre-filter'); if (!genreFilterSelect) { console.warn('[ReelSense DETAILED] Genre filter select not found.'); return; } genreFilterSelect.length = 1; const genres = new Set(); reviews.forEach(r => { if (r.genre) r.genre.forEach(g => genres.add(g)); }); [...genres].sort((a, b) => a.localeCompare(b)).forEach(g => { const opt = document.createElement('option'); opt.value = g.toLowerCase(); opt.textContent = g; genreFilterSelect.appendChild(opt); }); console.log('[ReelSense DETAILED] populateFilterOptions END.'); // New Log
    }

     function handleUrlParameters() {
        console.log('[ReelSense DETAILED] handleUrlParameters START.'); // New Log
         const urlParams = new URLSearchParams(window.location.search); const searchParam = urlParams.get('search'); const genreParam = urlParams.get('genre'); const filterSearchInput = getElement('#filter-search-input'); const genreFilterSelect = getElement('#genre-filter'); if (searchParam) { currentFilters.search = searchParam; if (filterSearchInput) filterSearchInput.value = searchParam; console.log(`[ReelSense DETAILED] URL Search: ${searchParam}`); } if (genreParam && genreFilterSelect) { const lowerGenre = genreParam.toLowerCase(); if ([...genreFilterSelect.options].some(o => o.value === lowerGenre)) { currentFilters.genre = lowerGenre; genreFilterSelect.value = lowerGenre; console.log(`[ReelSense DETAILED] URL Genre: ${lowerGenre}`); } else console.warn(`[ReelSense DETAILED] URL Genre ('${genreParam}') not found in dropdown.`); }
        console.log('[ReelSense DETAILED] handleUrlParameters END.'); // New Log
     }

    function sortReviews(reviews, sortBy) {
        // console.log(`[ReelSense DETAILED] Sorting reviews by: ${sortBy}`); // Log added in filterAndSortReviews
         switch (sortBy) { case 'rating_high': reviews.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break; case 'rating_low': reviews.sort((a, b) => (a.rating || 0) - (b.rating || 0)); break; case 'year_new': reviews.sort((a, b) => (b.year || 0) - (a.year || 0)); break; case 'year_old': reviews.sort((a, b) => (a.year || 0) - (b.year || 0)); break; case 'title_az': reviews.sort((a, b) => a.title.localeCompare(b.title)); break; case 'title_za': reviews.sort((a, b) => b.title.localeCompare(a.title)); break; case 'newest': default: reviews.sort((a, b) => new Date(b.publishedDate || 0) - new Date(a.publishedDate || 0)); break; }
    }

    function renderPagination(totalPages, currentPage) {
        // console.log(`[ReelSense DETAILED] renderPagination called. Total: ${totalPages}, Current: ${currentPage}`); // Less critical for now
        const paginationContainer = getElement('#pagination-container'); if (!paginationContainer || totalPages <= 1) { if (paginationContainer) paginationContainer.innerHTML = ''; return; } let html = '<nav aria-label="Reviews pagination"><ul class="pagination">'; html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Previous Page">«</a></li>`; for (let i = 1; i <= totalPages; i++) { html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`; } html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Next Page">»</a></li>`; html += '</ul></nav>'; paginationContainer.innerHTML = html;
    }

    // --- Star Rendering (Single Page) ---
    function renderSinglePageRatings() {
         console.log("[ReelSense DETAILED] renderSinglePageRatings START."); // New Log
         const mainRating = getElement('.review-meta-and-rating .rating[data-rating]'); // Adjusted selector
         if (mainRating) {
             const val = parseFloat(mainRating.dataset.rating);
             if (!isNaN(val)) {
                 renderStarsInElement(mainRating, val);
                 console.log(`[ReelSense DETAILED] Rendered main rating: ${val}`); // New Log
             } else {
                console.warn('[ReelSense DETAILED] Invalid main rating value:', mainRating.dataset.rating); // New Log
             }
         } else {
            console.log('[ReelSense DETAILED] Main rating element not found on single page.'); // New Log
         }

        const inlineRatings = getAllElements('.review-body .rating-inline[data-rating]');
        console.log(`[ReelSense DETAILED] Found ${inlineRatings.length} inline ratings.`); // New Log
         inlineRatings.forEach((el, index) => {
             const val = parseFloat(el.dataset.rating);
             if (!isNaN(val)) {
                renderStarsInElement(el, val);
                // console.log(`[ReelSense DETAILED]   Rendered inline rating ${index}: ${val}`); // Can be noisy
             } else {
                 console.warn(`[ReelSense DETAILED] Invalid inline rating value at index ${index}:`, el.dataset.rating); // New Log
             }
         });
         console.log("[ReelSense DETAILED] renderSinglePageRatings END."); // New Log
    }


    function renderStarsInElement(element, rating) {
         if (!element) return; const ratingValue = parseFloat(rating); if (isNaN(ratingValue)) return; let starsSpan = element.querySelector('.stars-direct'); if (!starsSpan) { starsSpan = document.createElement('span'); starsSpan.className = 'stars-direct'; const valueSpan = element.querySelector('.rating-value'); if (valueSpan) element.insertBefore(starsSpan, valueSpan); else element.prepend(starsSpan); } const fullStars = Math.floor(ratingValue); const hasHalfStar = ratingValue % 1 >= 0.4; let starsHTML = ''; for (let i = 0; i < 5; i++) { if (i < fullStars) starsHTML += '<i class="fas fa-star" aria-hidden="true"></i>'; else if (i === fullStars && hasHalfStar) starsHTML += '<i class="fas fa-star-half-alt" aria-hidden="true"></i>'; else starsHTML += '<i class="far fa-star" aria-hidden="true"></i>'; } starsSpan.innerHTML = starsHTML;
     }

    // --- Skeleton Loaders ---
    function showSkeletons() {
        const skeletonContainer = getElement('#skeleton-container');
        const reviewsGrid = getElement('.reviews-grid');
         if (!skeletonContainer || !(isHomePage || isAllReviewsPage)) return;
         skeletonContainer.innerHTML = ''; skeletonContainer.style.display = 'grid';
         if (reviewsGrid) reviewsGrid.style.display = 'none';
         const count = isHomePage ? 3 : reviewsPerPage;
         for (let i = 0; i < count; i++) { const skel = document.createElement('div'); skel.className = 'skeleton-card'; skel.innerHTML = `<div class="skeleton-image"></div><div class="skeleton-content"><div class="skeleton-line title"></div><div class="skeleton-line text"></div><div class="skeleton-line text short"></div><div class="skeleton-line button"></div></div>`; skeletonContainer.appendChild(skel); }
         // console.log("[ReelSense DETAILED] Skeletons shown."); // Logged elsewhere
    }

    function hideSkeletons() {
          const skeletonContainer = getElement('#skeleton-container');
          if (skeletonContainer) { skeletonContainer.style.display = 'none'; skeletonContainer.innerHTML = ''; }
         // console.log("[ReelSense DETAILED] Skeletons hidden."); // Logged elsewhere
    }

    // --- Back to Top Button ---
    function setupBackToTop() {
        const backToTopButton = getElement('#back-to-top');
         if (!backToTopButton) { console.warn("[ReelSense DETAILED] Back-to-top button not found."); return; }
         window.addEventListener('scroll', () => { backToTopButton.classList.toggle('visible', window.scrollY > 300); });
         backToTopButton.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
         // console.log("[ReelSense DETAILED] Back-to-top listener attached.");
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log('[ReelSense DETAILED] Setting up event listeners START...'); // Modified Log
        const filterControls = getElement('#filter-controls');
        const paginationContainer = getElement('#pagination-container');
        const heroSearchForm = getElement('#search-form');

        if (filterControls) { filterControls.addEventListener('input', handleFilterChange); filterControls.addEventListener('change', handleFilterChange); console.log('[ReelSense DETAILED] Filter/Sort listeners attached.'); }
        else if (isAllReviewsPage) console.warn('[ReelSense DETAILED] Filter controls not found on All Reviews page.');

        if (paginationContainer) { paginationContainer.addEventListener('click', handlePaginationClick); console.log('[ReelSense DETAILED] Pagination listener attached.'); }
        else if (isAllReviewsPage) console.warn('[ReelSense DETAILED] Pagination container not found on All Reviews page.');

        if (heroSearchForm) { heroSearchForm.addEventListener('submit', handleHeroSearch); console.log('[ReelSense DETAILED] Hero search listener attached.'); }
        else if (isHomePage) console.warn('[ReelSense DETAILED] Hero search form not found on homepage.');
        console.log('[ReelSense DETAILED] Setting up event listeners END.'); // New Log
    }

    function handleFilterChange(event) {
        const targetId = event.target.id;
        let filterChanged = false;
        console.log(`[ReelSense DETAILED] handleFilterChange triggered by: ${targetId}`); // New Log
        if (targetId === 'filter-search-input') { currentFilters.search = event.target.value; filterChanged = true; }
        else if (targetId === 'genre-filter') { currentFilters.genre = event.target.value; filterChanged = true; }
        else if (targetId === 'sort-select') { currentSort = event.target.value; filterChanged = true; }
        if (filterChanged) { currentPage = 1; updateReviewDisplay(); }
    }

    function handlePaginationClick(event) {
        event.preventDefault();
        const link = event.target.closest('.page-link');
        if (link) {
            const page = parseInt(link.dataset.page, 10);
            const parentLi = link.closest('.page-item');
             console.log(`[ReelSense DETAILED] handlePaginationClick: Clicked page ${page}, Current page ${currentPage}`); // New Log
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
         console.log(`[ReelSense DETAILED] handleHeroSearch: Query='${query}'`); // New Log
         if (query) { window.location.href = `all-reviews.html?search=${encodeURIComponent(query)}`; }
         else { console.log('[ReelSense DETAILED] Hero search query empty.'); if(searchInput) searchInput.focus(); }
     }

    // --- Other Setup Functions ---
    function setupThemeSwitcher() {
        const themeSwitcher = getElement('#theme-switcher'); const body = document.body; if (!themeSwitcher) { console.warn('[ReelSense DETAILED] Theme switcher button not found!'); return; } const moonIcon = themeSwitcher.querySelector('.fa-moon'); const sunIcon = themeSwitcher.querySelector('.fa-sun'); if (!moonIcon || !sunIcon) { console.warn('[ReelSense DETAILED] Theme switcher icons not found!'); return; } function applyTheme(theme) { body.dataset.theme = theme; moonIcon.style.display = (theme === 'dark' ? 'none' : 'inline-block'); sunIcon.style.display = (theme === 'dark' ? 'inline-block' : 'none'); themeSwitcher.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); } const savedTheme = localStorage.getItem('theme'); const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; applyTheme(savedTheme || (prefersDark ? 'dark' : 'light')); themeSwitcher.addEventListener('click', () => { const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(newTheme); localStorage.setItem('theme', newTheme); console.log(`[ReelSense Debug] Theme toggled to: ${newTheme}`); }); // console.log("[ReelSense DETAILED] Theme switcher listener attached.");
    }

    function setupMobileMenu() {
        const menuToggle = getElement('.mobile-menu-toggle'); const mainNav = getElement('#main-nav'); if (menuToggle && mainNav) { const barsIcon = menuToggle.querySelector('.fa-bars'); const timesIcon = menuToggle.querySelector('.fa-times'); if (barsIcon && timesIcon) { timesIcon.style.display = 'none'; barsIcon.style.display = 'inline-block'; menuToggle.addEventListener('click', () => { const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true'; menuToggle.setAttribute('aria-expanded', !isExpanded); mainNav.classList.toggle('active'); barsIcon.style.display = isExpanded ? 'inline-block' : 'none'; timesIcon.style.display = isExpanded ? 'none' : 'inline-block'; }); } else console.warn("[ReelSense DETAILED] Mobile menu icons missing."); } else console.warn("[ReelSense DETAILED] Mobile menu toggle or nav not found."); // console.log("[ReelSense DETAILED] Mobile menu listener attached.");
    }
    function setupFooterYear() {
        const yearSpan = getElement('#current-year'); if (yearSpan) yearSpan.textContent = new Date().getFullYear(); else console.warn("[ReelSense DETAILED] Footer year span not found.");
    }
    function setupForms() {
        const contactForm = getElement('#contact-form'); const formStatus = getElement('#form-status'); if (contactForm && formStatus) { contactForm.addEventListener('submit', function(event) { event.preventDefault(); formStatus.textContent = 'Sending...'; formStatus.className = 'form-status sending'; const formData = new FormData(contactForm); const endpoint = contactForm.action || 'YOUR_FORM_SUBMISSION_ENDPOINT'; console.log('[ReelSense DETAILED] Contact form submitted (simulated). Endpoint:', endpoint); setTimeout(() => { formStatus.textContent = 'Message sent successfully!'; formStatus.className = 'form-status success'; contactForm.reset(); }, 1500); }); } else if (isHomePage) console.warn("[ReelSense DETAILED] Contact form or status element not found on homepage."); // console.log("[ReelSense DETAILED] Contact form listener attached.");
    }
     function updateActiveNavLink() {
         const navLinks = getAllElements('.main-nav .nav-link'); let isLinkActive = false; navLinks.forEach(link => { link.classList.remove('active'); const linkHref = link.getAttribute('href'); const linkPath = linkHref.split('#')[0]; if (linkPath === currentPath || (linkPath === 'index.html' && currentPath === 'index.html')) { link.classList.add('active'); isLinkActive = true; } if (isHomePage && linkHref.startsWith('#') && window.location.hash === linkHref) { navLinks.forEach(l => l.classList.remove('active')); link.classList.add('active'); isLinkActive = true; } }); if (!isLinkActive && isHomePage && !window.location.hash) { const homeLink = getElement('.main-nav .nav-link[href^="index.html"]'); if (homeLink) { let otherActive = false; navLinks.forEach(l => { if(l !== homeLink && l.classList.contains('active')) otherActive = true; }); if (!otherActive) { homeLink.classList.add('active'); } } }
         window.removeEventListener('hashchange', updateActiveNavLink); window.addEventListener('hashchange', updateActiveNavLink);
         // console.log("[ReelSense DETAILED] Active nav link updated.");
    }

    // --- Start the Application ---
     console.log('[ReelSense DETAILED] Calling initializePage...'); // New Log
    initializePage();

}); // End DOMContentLoaded
// --- END OF MODIFIED script.js ---