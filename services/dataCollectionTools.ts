
import { performSinglePassScan, fetchRawHtml } from './api';

export async function fetchAndAnalyzeHTML(url: string) {
  let html = '';

  try {
      // Use the robust fetcher from API service
      html = await fetchRawHtml(url);
  } catch (e) {
      console.warn("fetchRawHtml failed, trying scan fallback", e);
  }

  // If fetch failed, try the backend scan (even if it might 500, worth a shot)
  if (!html || html.length < 100) {
      const result = await performSinglePassScan(url);
      if (result.success && result.data) {
          html = result.data.html;
      }
  }

  // If still empty, we can't do much, but we shouldn't throw if we can avoid it.
  // We return a basic object so the analysis can proceed with "No Data" mode.
  if (!html) {
      console.warn(`Failed to fetch HTML for ${url}. Returning empty analysis.`);
      return {
        html: '',
        htmlLength: 0,
        headers: {},
        emails: [],
        phoneNumbers: [],
        techStack: [],
        hasViewport: false,
        hasSSL: url.startsWith('https'),
        pageTitle: 'Unknown',
        metaDescription: '',
        server: 'Unknown',
        error: 'Could not access website content'
      };
  }
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = Array.from(new Set(html.match(emailRegex) || []))
    .filter(email => !email.includes('example.com') && !email.includes('sentry') && !email.includes('wixpress'))
    .slice(0, 10);
  
  const phoneRegex = /\+?[0-9]{1,4}?[-.\s]?\(?[0-9]{1,3}?\)?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/g;
  const phoneNumbers = Array.from(new Set(html.match(phoneRegex) || [])).slice(0, 5);
  
  const techStack: string[] = [];
  const htmlLower = html.toLowerCase();
  if (htmlLower.includes('wp-content')) techStack.push('WordPress');
  if (htmlLower.includes('_next')) techStack.push('Next.js');
  if (htmlLower.includes('react')) techStack.push('React');
  if (htmlLower.includes('ng-')) techStack.push('Angular');
  if (htmlLower.includes('vue')) techStack.push('Vue.js');
  if (htmlLower.includes('shopify')) techStack.push('Shopify');
  if (htmlLower.includes('wix.com')) techStack.push('Wix');
  if (htmlLower.includes('squarespace')) techStack.push('Squarespace');
  if (htmlLower.match(/jquery[.-]/i)) techStack.push('jQuery');
  if (htmlLower.includes('bootstrap')) techStack.push('Bootstrap');
  if (htmlLower.includes('tailwind')) techStack.push('Tailwind');
  
  const hasViewport = htmlLower.includes('viewport');
  const hasSSL = url.startsWith('https://');
  const pageTitle = html.match(/<title>(.*?)<\/title>/i)?.[1] || '';
  const metaDescription = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)?.[1] || '';
  
  return {
    html: html.substring(0, 50000),
    htmlLength: html.length,
    headers: {},
    emails,
    phoneNumbers,
    techStack,
    hasViewport,
    hasSSL,
    pageTitle,
    metaDescription,
    server: 'Unknown'
  };
}
