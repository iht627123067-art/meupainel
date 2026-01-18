#!/usr/bin/env node

/**
 * Parse Google News page to find the actual article link
 */

import * as cheerio from 'cheerio';

const testUrl = 'https://news.google.com/rss/articles/CBMibkFVX3lxTE5XdVREVl9XZTBzX1BXYi1VYm5NcW9CX2ZITXJFemdWTjhUY0FTeDNNMDA2dEIwNlpxOThfRDhxdi1kM2RNQlVCZUNkeGJGLVJDN0N1SVpqMGFEMHlsa2NhcnlYTG1JSXNMVGRIM01n?oc=5';

async function parseGoogleNewsPage() {
    console.log('🔍 Parsing Google News Page\n');

    const response = await fetch(testUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
    });

    const html = await response.text();
    console.log('HTML Length:', html.length);
    console.log('HTML Preview (first 1000 chars):');
    console.log(html.substring(0, 1000));
    console.log('\n-------------------\n');

    const $ = cheerio.load(html);

    console.log('Looking for article links...\n');

    // Strategy 1: Look for "Go to the source" or "Read more" links
    const sourceLinks = $('a').filter((_, el) => {
        const text = $(el).text().toLowerCase();
        const href = $(el).attr('href');
        return href && !href.includes('google.com') &&
            (text.includes('source') || text.includes('read') || text.includes('article'));
    });

    console.log(`Found ${sourceLinks.length} potential source links:`);
    sourceLinks.each((_, el) => {
        console.log(`  - Text: "${$(el).text()}" | Href: ${$(el).attr('href')}`);
    });

    // Strategy 2: Look for any external links in article content
    console.log('\nLooking for external links in article area...');
    const articleLinks = $('article a, [role="article"] a, .article a').filter((_, el) => {
        const href = $(el).attr('href');
        return href && !href.includes('google.com') && href.startsWith('http');
    });

    console.log(`Found ${articleLinks.length} article links:`);
    articleLinks.slice(0, 5).each((_, el) => {
        console.log(`  - ${$(el).attr('href')}`);
    });

    // Strategy 5: Full text regex search for anything that looks like an external URL
    console.log('\nStrategy 5: Full text regex search for external URLs...');
    const allUrls = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
    const externalUrls = [...new Set(allUrls.filter(u =>
        !u.includes('google.com') &&
        !u.includes('gstatic.com') &&
        !u.includes('googletagmanager.com') &&
        !u.includes('google-analytics.com')
    ))];

    console.log(`Found ${externalUrls.length} unique external URLs:`);
    externalUrls.slice(0, 10).forEach(u => console.log(`  - ${u}`));

    // Strategy 6: Looking for window.location.replace
    console.log('\nStrategy 6: Looking for window.location patterns...');
    const locationMatches = html.match(/window\.location\.(?:replace|href)\s*=\s*["']([^"']+)["']/g);
    if (locationMatches) {
        locationMatches.forEach(m => console.log(`  - Match: ${m}`));
    } else {
        console.log('  - No window.location matches found.');
    }

    // Strategy 7: Looking for C-Wiz data or specific attributes
    console.log('\nStrategy 7: Looking for attributes that might contain the URL...');
    const dataAttributes = $('[data-href], [data-url], [data-link-target]').each((_, el) => {
        const h = $(el).attr('data-href') || $(el).attr('data-url') || $(el).attr('data-link-target');
        if (h && (h.startsWith('http') || h.startsWith('//')) && !h.includes('google.com')) {
            console.log(`  - Found in attr: ${h}`);
        }
    });

    // Strategy 4: Check meta tags
    console.log('\nChecking meta tags...');
    const ogUrl = $('meta[property="og:url"]').attr('content');
    const canonicalUrl = $('link[rel="canonical"]').attr('href');

    // Strategy 8: Decode the base64 part of the URL
    console.log('\nStrategy 8: Decoding Base64 part of the URL...');
    const urlParts = testUrl.split('/articles/');
    if (urlParts.length > 1) {
        const base64Part = urlParts[1].split('?')[0];
        console.log(`  - Base64 Part: ${base64Part}`);
        try {
            // Buffer in Node.js handles base64
            const buffer = Buffer.from(base64Part, 'base64');
            console.log(`  - Decoded Bytes (Hex): ${buffer.toString('hex')}`);
            console.log(`  - Decoded Content (Latin1): ${buffer.toString('latin1')}`);

            const innerB64 = buffer.slice(4).toString('utf-8');
            console.log(`  - Inner Base64 part: ${innerB64}`);
            try {
                const innerBuffer = Buffer.from(innerB64, 'base64');
                console.log(`  - Inner Decoded Bytes (Hex): ${innerBuffer.toString('hex')}`);
                console.log(`  - Inner Decoded Content (UTF-8): ${innerBuffer.toString('utf-8')}`);
                console.log(`  - Inner Decoded Content (Latin1): ${innerBuffer.toString('latin1')}`);

                if (innerBuffer.toString('latin1').includes('http')) {
                    console.log('    [!] Found "http" in inner decoded buffer!');
                }
            } catch (e) {
                console.log(`  - Failed to decode inner: ${e.message}`);
            }
        } catch (e) {
            console.log(`  - Failed to decode: ${e.message}`);
        }
        // Strategy 9: Search for consent or cookie keywords
        console.log('\nStrategy 9: Searching for consent/cookie keywords...');
        const consentKeywords = ['consent', 'cookie', 'aceitar', 'concordar', 'termos', 'privacy'];
        consentKeywords.forEach(kw => {
            if (html.toLowerCase().includes(kw)) {
                console.log(`  - Found keyword: "${kw}"`);
            }
        });

        // Strategy 10: Look for "Redirecting" or "Aguarde"
        console.log('\nStrategy 10: Searching for redirect markers...');
        if (html.includes('Redirecting')) console.log('  - Found "Redirecting"');
        if (html.includes('refresh')) console.log('  - Found "refresh"');
    }
    // Strategy 11: Look for large JSON blobs in script tags
    console.log('\nStrategy 11: Searching for large JSON blobs...');
    $('script').each((_, el) => {
        const text = $(el).text();
        if (text.length > 1000 && text.includes('http')) {
            console.log(`  - Found script tag with length ${text.length}`);
            // Look for the SCIRP URL in the text
            if (text.includes('scirp.org')) {
                console.log('    [!] Found "scirp.org" in this script!');
                // Try to extract the full URL
                const m = text.match(/https?:\/\/www\.scirp\.org\/[^\s"'\\]+/);
                if (m) console.log(`    [!] Extracted URL: ${m[0]}`);
            }
        }
    });
}

parseGoogleNewsPage().catch(console.error);
