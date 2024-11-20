const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeMediumArticle(url) {
    let browser = null;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({
            headless: "new",  // Use headless mode for articles
            defaultViewport: null
        });
        
        console.log('Creating new page...');
        const page = await browser.newPage();

        // Set user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`Navigating to ${url}...`);
        await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log('Extracting article content...');
        const articleData = await page.evaluate(() => {
            // Get article title
            const title = document.querySelector('h1')?.textContent.trim();
            
            // Get author info
            const author = document.querySelector('[data-testid="authorName"]')?.textContent.trim();
            
            // Get publication date
            const date = document.querySelector('time')?.textContent.trim();
            
            // Get article content
            const contentElements = Array.from(document.querySelectorAll('article p, article h1, article h2, article h3'));
            const content = contentElements.map(element => ({
                type: element.tagName.toLowerCase(),
                text: element.textContent.trim()
            }));

            // Get images if any
            const images = Array.from(document.querySelectorAll('article img'))
                .map(img => ({
                    src: img.src,
                    alt: img.alt
                }));

            // Get reading time
            const readingTime = document.querySelector('article')
                ?.textContent.split(' ')
                .filter(word => word.length > 0).length / 200; // Approximate words per minute

            return {
                title,
                author,
                date,
                content,
                images,
                estimatedReadingTime: Math.round(readingTime) + ' minutes'
            };
        });

        console.log('Successfully scraped article');
        return articleData;

    } catch (error) {
        console.error('Error during scraping:', error);
        throw error;
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
}

async function main() {
    try {
        const url = 'https://murtazash123.medium.com/ab-tum-hi-kaho-kiya-karna-hai-653e0d72acd8';
        console.log('Starting scraper...');
        const articleData = await scrapeMediumArticle(url);
        
        // Format the content for better readability
        const formattedContent = {
            ...articleData,
            content: articleData.content.map(item => ({
                ...item,
                text: item.text.replace(/\s+/g, ' ').trim() // Clean up whitespace
            }))
        };

        // Save as JSON
        fs.writeFileSync('article.json', JSON.stringify(formattedContent, null, 2), 'utf8');
        console.log('Article data saved to article.json');

        // Save as formatted text
        const textContent = `
Title: ${articleData.title}
Author: ${articleData.author}
Date: ${articleData.date}
Estimated Reading Time: ${articleData.estimatedReadingTime}

Content:
${articleData.content.map(item => item.text).join('\n\n')}

Images:
${articleData.images.map(img => `- ${img.src} (${img.alt})`).join('\n')}
`;

        fs.writeFileSync('article.txt', textContent.trim(), 'utf8');
        console.log('Article text saved to article.txt');

        // Print summary
        console.log('\nArticle Summary:');
        console.log('Title:', articleData.title);
        console.log('Author:', articleData.author);
        console.log('Date:', articleData.date);
        console.log('Reading Time:', articleData.estimatedReadingTime);
        console.log('Content Length:', articleData.content.length, 'paragraphs');
        console.log('Images:', articleData.images.length);

    } catch (error) {
        console.error('Main error:', error);
        process.exit(1);
    }
}

main();