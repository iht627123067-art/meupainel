#!/usr/bin/env node

/**
 * Parse Google News page HTML with regex to find article link
 */

const testUrl = 'https://news.google.com/rss/articles/CBMinwFBVV95cUxPM0c1TzdheXk2LVRRMXJsUkp2dkZVa0dkRDNJX2xucDNjUmdjRDBpN2pZc1c0YzRCdGFOV3FiOXc2azFjLU1vcF80UEVlNzVkVXAwRG1BUzNuTnRlLUhELWVpSkpaeUg5VGxvTVBnaWgwVm50SnQxaFB1dXBMRkxpZDNaazV5UmdjWHJZMmlxeUJBOGJ3OS1lVnA3N0hpdms?oc=5';

async function parseGoogleNewsPage() {
    console.log('🔍 Parsing Google News Page with Regex\n');

    const response = await fetch(testUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });

    const html = await response.text();

    // Look for politico.eu links (the publisher from the title)
    console.log('Looking for politico.eu links...');
    const politicoLinks = html.match(/https?:\/\/[^"'\s<>]*politico\.eu[^"'\s<>]*/gi);
    if (politicoLinks) {
        console.log(`Found ${politicoLinks.length} politico.eu links:`);
        politicoLinks.forEach(link => console.log(`  - ${link}`));
    }

    // Look for any article-like URLs
    console.log('\nLooking for article URLs (excluding google.com, gstatic, etc)...');
    const allLinks = html.match(/https?:\/\/[^"'\s<>]+/gi) || [];
    const articleLinks = allLinks.filter(link =>
        !link.includes('google.com') &&
        !link.includes('gstatic.com') &&
        !link.includes('googleusercontent.com') &&
        !link.includes('google-analytics.com') &&
        !link.match(/\.(jpg|jpeg|png|gif|svg|css|js|woff|woff2)$/i) &&
        link.length > 30
    );

    console.log(`Found ${articleLinks.length} potential article links:`);
    const uniqueLinks = [...new Set(articleLinks)];
    uniqueLinks.slice(0, 10).forEach(link => console.log(`  - ${link}`));

    // Try to find the "Go to source" button
    console.log('\nLooking for "Go to" or "Read" patterns...');
    const goToMatches = html.match(/href="([^"]+)"[^>]*>.*?(Go to|Read|View|Source).*?</gi);
    if (goToMatches) {
        console.log(`Found ${goToMatches.length} "Go to/Read" links:`);
        goToMatches.slice(0, 5).forEach(match => console.log(`  - ${match.substring(0, 150)}`));
    }
}

parseGoogleNewsPage().catch(console.error);
