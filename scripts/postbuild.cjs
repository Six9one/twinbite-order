const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('dist/index.html not found! Run vite build first.');
  process.exit(1);
}

const baseHtml = fs.readFileSync(indexHtmlPath, 'utf8');

function customizeHtml(html, options) {
  let custom = html;

  // Title
  custom = custom.replace(/<title>.*?<\/title>/gi, `<title>${options.title}</title>`);
  custom = custom.replace(/<meta name="title" content=".*?" \/>/gi, `<meta name="title" content="${options.title}" />`);

  // Canonical
  custom = custom.replace(/<link rel="canonical" href=".*?" \/>/gi, `<link rel="canonical" href="${options.url}" />`);

  // Open Graph
  custom = custom.replace(/<meta property="og:title" content=".*?" \/>/gi, `<meta property="og:title" content="${options.title}" />`);
  custom = custom.replace(/<meta property="og:url" content=".*?" \/>/gi, `<meta property="og:url" content="${options.url}" />`);
  custom = custom.replace(/<meta property="og:image" content=".*?" \/>/gi, `<meta property="og:image" content="${options.image}" />`);

  // Manifest
  custom = custom.replace(/<link rel="manifest".*?>/gi, `<link rel="manifest" href="${options.manifest}" />`);

  // Apple Touch Icon
  custom = custom.replace(/<link rel="apple-touch-icon".*?>/gi, `<link rel="apple-touch-icon" href="${options.appleIcon}" /><link rel="apple-touch-icon" sizes="180x180" href="${options.appleIcon}" />`);

  // Apple Web App Title
  custom = custom.replace(/<meta name="apple-mobile-web-app-title".*?>/gi, `<meta name="apple-mobile-web-app-title" content="${options.shortName}" />`);

  // Theme Color
  custom = custom.replace(/<meta name="theme-color".*?>/gi, `<meta name="theme-color" content="${options.themeColor}" />`);

  return custom;
}

// 1. Courses Page (/courses and /orders)
const coursesHtml = customizeHtml(baseHtml, {
  title: 'Twin Courses',
  shortName: 'Twin Courses',
  url: 'https://twinpizza.fr/courses',
  image: 'https://twinpizza.fr/icons/courses-icon.png',
  manifest: '/courses-manifest.json',
  appleIcon: '/icons/courses-apple-touch-icon.png',
  themeColor: '#059669',
});

const coursesDir = path.join(distDir, 'courses');
if (!fs.existsSync(coursesDir)) fs.mkdirSync(coursesDir, { recursive: true });
fs.writeFileSync(path.join(coursesDir, 'index.html'), coursesHtml, 'utf8');

const ordersDir = path.join(distDir, 'orders');
if (!fs.existsSync(ordersDir)) fs.mkdirSync(ordersDir, { recursive: true });
fs.writeFileSync(path.join(ordersDir, 'index.html'), coursesHtml, 'utf8');
console.log('✓ Generated dist/courses/index.html and dist/orders/index.html');

// 2. Kitchen Page (/kitchen)
const kitchenHtml = customizeHtml(baseHtml, {
  title: 'Twin Kitchen',
  shortName: 'Twin Kitchen',
  url: 'https://twinpizza.fr/kitchen',
  image: 'https://twinpizza.fr/icons/kitchen-icon.png',
  manifest: '/kitchen-manifest.json',
  appleIcon: '/icons/kitchen-apple-touch-icon.png',
  themeColor: '#ea580c',
});

const kitchenDir = path.join(distDir, 'kitchen');
if (!fs.existsSync(kitchenDir)) fs.mkdirSync(kitchenDir, { recursive: true });
fs.writeFileSync(path.join(kitchenDir, 'index.html'), kitchenHtml, 'utf8');
console.log('✓ Generated dist/kitchen/index.html');

console.log('Postbuild finished successfully!');
