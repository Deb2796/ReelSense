// Import necessary Node.js modules
const fs = require('fs').promises; // Use promises for async operations
const path = require('path');

// --- Configuration ---
const JSON_DATA_PATH = path.join(__dirname, 'reviews.json');
const TEMPLATE_PATH = path.join(__dirname, '[movie-slug]-review.html');
const OUTPUT_DIR = __dirname; // Output files in the same directory as the script
const BASE_URL = 'https://reelsense.netlify.app'; // Your Netlify URL
const SITE_NAME = 'ReelSense';
const AUTHOR_NAME = 'ReelSense'; // Or your specific name/org
const PUBLISHER_NAME = 'ReelSense';
const PUBLISHER_LOGO_URL = `${BASE_URL}/images/reelsense-logo.png`; // Ensure this logo exists
const GA_MEASUREMENT_ID = 'G-9LX80PCWTJ'; // *** REPLACE THIS ***
const FALLBACK_IMAGE_CAPTION = 'Movie poster image.';
const FALLBACK_IMAGE_ALT = 'Movie poster';

// Helper function to create slugs for image filenames (simple version)
function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove non-word chars except space/hyphen
        .trim()
        .replace(/[-\s]+/g, '-') // Replace spaces/hyphens with single hyphen
        .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

// Main function to generate review pages
async function generateReviewPages() {
    console.log('Starting review page generation...');

    try {
        // 1. Read JSON data
        console.log(`Reading data from: ${JSON_DATA_PATH}`);
        const jsonData = await fs.readFile(JSON_DATA_PATH, 'utf-8');
        const reviews = JSON.parse(jsonData);
        console.log(`Found ${reviews.length} reviews in JSON data.`);

        // 2. Read HTML template
        console.log(`Reading template from: ${TEMPLATE_PATH}`);
        const templateHtml = await fs.readFile(TEMPLATE_PATH, 'utf-8');
        console.log('Template read successfully.');

        // 3. Process each review
        for (const review of reviews) {
            console.log(`Processing: ${review.title} (${review.year})...`);

            if (!review.fullReviewLink || !review.title || !review.year) {
                console.warn(`Skipping review ID ${review.id} due to missing essential data (fullReviewLink, title, or year).`);
                continue;
            }

            let reviewHtml = templateHtml; // Start with a fresh copy of the template

            // --- Prepare Data for Replacement ---
            const movieTitle = review.title || 'Untitled Movie';
            const movieYear = review.year || 'N/A';
            const directorName = review.director || 'N/A';
            const ratingValue = (review.rating || 0).toFixed(1);
            const genres = Array.isArray(review.genre) ? review.genre : [];
            const genresString = genres.join(', ');
            const publishedDateISO = review.publishedDate ? new Date(review.publishedDate).toISOString() : new Date().toISOString();
            const movieSlug = review.fullReviewLink.replace('.html', ''); // Extract slug from filename
            const reviewPageUrl = `${BASE_URL}/${review.fullReviewLink}`;
            const excerpt = review.excerpt || `Read the full review of ${movieTitle} on ${SITE_NAME}.`;

            // Construct image URLs using the slug
            const ogImageUrl = `${BASE_URL}/images/og-${movieSlug}.jpg`;
            const twitterImageUrl = `${BASE_URL}/images/twitter-${movieSlug}.jpg`;
            const mainImageUrl = review.image || `${BASE_URL}/images/placeholder-poster.jpg`; // Fallback poster
            const mainImageAlt = review.imageAlt || `${movieTitle} (${movieYear}) ${FALLBACK_IMAGE_ALT}`;
            const mainImageCaption = review.imageCaption || FALLBACK_IMAGE_CAPTION; // Add 'imageCaption' to your JSON if you want specific captions here

            // Create tags string
            const tagsArray = [
                ...genres,
                ...(directorName !== 'N/A' ? [directorName] : []),
                movieYear.toString(),
                movieTitle.split(' ')[0] // Add first word of title as basic keyword
            ];
            const articleTags = [...new Set(tagsArray)].join(', '); // Remove duplicates

            // --- Perform Replacements ---
            // Use RegExp with the 'g' flag for global replacement
            reviewHtml = reviewHtml.replace(/\[Movie Title]/g, movieTitle);
            reviewHtml = reviewHtml.replace(/\[Year]/g, movieYear);
            reviewHtml = reviewHtml.replace(/\[Director Name]/g, directorName);
            reviewHtml = reviewHtml.replace(/\[Numeric Rating]/g, ratingValue);
            reviewHtml = reviewHtml.replace(/\[Genre1, Genre2, ...]/g, genresString);
            reviewHtml = reviewHtml.replace(/YYYY-MM-DDTHH:MM:SSZ/g, publishedDateISO);
            reviewHtml = reviewHtml.replace(/\[movie-slug]/g, movieSlug); // For URLs and image paths
            reviewHtml = reviewHtml.replace(/YOUR_ABSOLUTE_URL/g, BASE_URL); // General base URL
            reviewHtml = reviewHtml.replace(/GA_MEASUREMENT_ID/g, GA_MEASUREMENT_ID);
            reviewHtml = reviewHtml.replace(/\[IMAGE_URL]/g, mainImageUrl);
            reviewHtml = reviewHtml.replace(/\[Descriptive Alt Text for Image]/g, mainImageAlt);
            reviewHtml = reviewHtml.replace(/\[Relevant caption for the image.]/g, mainImageCaption);
            reviewHtml = reviewHtml.replace(/Genre1, Genre2, Director Name, Year, Keyword1, Keyword2/g, articleTags);
            reviewHtml = reviewHtml.replace(/\[First paragraph or summary of the review text...]/g, excerpt); // Replace schema reviewBody placeholder
            reviewHtml = reviewHtml.replace(/\[Specific Review Headline]/g, `${movieTitle} Review: ${excerpt.substring(0, 50)}...`); // Generate a basic headline for schema


            // --- IMPORTANT: Review Body Content ---
            // This script REPLACES placeholders in the TEMPLATE.
            // It DOES NOT automatically write the detailed review paragraphs.
            // The sections like:
            //    <h2>[Subheading for First Section]</h2>
            //    <p>Start your review here...</p>
            // REMAIN AS THEY ARE in the template.
            // You will need to manually edit the *generated* HTML files
            // to add the actual unique review content in the review-body div,
            // OR significantly enhance your reviews.json and this script
            // to handle structured review content (e.g., paragraphs, blockquotes).
            // For now, we are only replacing metadata and header/schema placeholders.

            // --- Final Output Path ---
            const outputPath = path.join(OUTPUT_DIR, review.fullReviewLink);

            // 4. Write the generated HTML file
            await fs.writeFile(outputPath, reviewHtml, 'utf-8');
            console.log(`Successfully generated: ${outputPath}`);
        }

        console.log('Review page generation finished successfully!');

    } catch (error) {
        console.error('Error during review page generation:', error);
        process.exit(1); // Exit with an error code
    }
}

// --- Run the generator ---
generateReviewPages();