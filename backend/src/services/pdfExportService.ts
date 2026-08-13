/**
 * Escapes HTML characters to prevent XSS in rendered HTML templates.
 */
function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates an HTML string template for a Medical Case Study export.
 */
export function generateCasePdfHtml(caseData: any): string {
  const title = escapeHtml(caseData?.title || 'Untitled Case');
  const category = escapeHtml(caseData?.category || 'N/A');
  const difficulty = escapeHtml(caseData?.difficulty || 'N/A');
  const status = escapeHtml(caseData?.status || 'Open');
  const createdAt = caseData?.createdAt
    ? new Date(caseData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'N/A';
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const doctor = caseData?.doctor || caseData?.owner || {};
  const authorName = escapeHtml(
    doctor.firstName || doctor.lastName
      ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
      : doctor.name || 'Unknown'
  );
  const doctorEmail = doctor.email ? escapeHtml(doctor.email) : null;
  const doctorSpec = doctor.specialization ? escapeHtml(doctor.specialization) : null;
  const doctorInst = doctor.institution ? escapeHtml(doctor.institution) : null;

  const description = escapeHtml(caseData?.description || 'No description available.');
  const symptoms = caseData?.symptoms ? escapeHtml(caseData.symptoms) : null;
  const diagnosis = caseData?.diagnosis ? escapeHtml(caseData.diagnosis) : null;
  const treatment = caseData?.treatment ? escapeHtml(caseData.treatment) : null;

  // Format comments / discussions
  const comments = caseData?.comments || caseData?.discussions || [];
  const topDiscussions = Array.isArray(comments)
    ? comments
        .filter((d: any) => !d.replyTo)
        .sort((a: any, b: any) => (b.likes || b.likedBy?.length || 0) - (a.likes || a.likedBy?.length || 0))
        .slice(0, 5)
    : [];

  const discussionsHtml = topDiscussions.length > 0
    ? topDiscussions.map((disc: any, idx: number) => {
        const discAuthor = disc.author || {};
        const name = escapeHtml(
          discAuthor.firstName
            ? `${discAuthor.firstName} ${discAuthor.lastName || ''}`.trim()
            : discAuthor.name || 'Anonymous'
        );
        const date = disc.createdAt
          ? new Date(disc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
          : '';
        const likes = disc.likedBy?.length || disc.likes || 0;
        const content = escapeHtml(disc.content || '');
        const isPinned = disc.pinned;

        return `
          <div class="discussion-item ${isPinned ? 'pinned' : ''}">
            <div class="discussion-header">
              <strong>${idx + 1}. ${name}</strong>
              <span class="disc-meta">${date} &bull; &#128077; ${likes}</span>
              ${isPinned ? '<span class="pinned-badge">[PINNED / KEY POINT]</span>' : ''}
            </div>
            <div class="discussion-body">${content}</div>
          </div>
        `;
      }).join('')
    : '<p class="empty-text">No top discussions available for this case.</p>';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title} - Case Study Report</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #212121;
          font-size: 13px;
          line-height: 1.6;
          background: #ffffff;
        }
        .banner {
          background: linear-gradient(135deg, #1565c0 0%, #1976d2 100%);
          color: #ffffff;
          padding: 24px 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .banner h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .banner p {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #bbdefb;
        }
        .banner .timestamp {
          text-align: right;
          font-size: 11px;
          color: #e3f2fd;
        }
        .container {
          padding: 24px 30px;
        }
        .case-title {
          font-size: 20px;
          font-weight: 700;
          color: #1565c0;
          margin-top: 0;
          margin-bottom: 12px;
          border-bottom: 2px solid #1976d2;
          padding-bottom: 8px;
        }
        .grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background: #f5f7fa;
          border: 1px solid #e0e6ed;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 20px;
        }
        .grid-item {
          display: flex;
          flex-direction: column;
        }
        .grid-label {
          font-size: 10px;
          font-weight: 700;
          color: #78909c;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .grid-value {
          font-size: 13px;
          font-weight: 600;
          color: #263238;
        }
        .section-header {
          background: #1976d2;
          color: #ffffff;
          padding: 7px 12px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 4px;
          margin-top: 18px;
          margin-bottom: 10px;
        }
        .section-header.discussion-theme {
          background: #2e7d32;
        }
        .content-box {
          background: #fafafa;
          border-left: 4px solid #1976d2;
          padding: 12px 16px;
          border-radius: 0 4px 4px 0;
          margin-bottom: 14px;
          white-space: pre-wrap;
        }
        .discussion-item {
          background: #f9fbe7;
          border-left: 4px solid #8ecae6;
          padding: 10px 14px;
          border-radius: 0 4px 4px 0;
          margin-bottom: 10px;
        }
        .discussion-item.pinned {
          border-left-color: #ff9800;
          background: #fff8e1;
        }
        .discussion-header {
          font-size: 12px;
          margin-bottom: 4px;
        }
        .disc-meta {
          color: #546e7a;
          margin-left: 8px;
          font-size: 11px;
        }
        .pinned-badge {
          color: #e65100;
          font-weight: bold;
          font-size: 10px;
          margin-left: 8px;
        }
        .discussion-body {
          color: #37474f;
          font-size: 12px;
        }
        .empty-text {
          color: #90a4ae;
          font-style: italic;
        }
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #cfd8dc;
          text-align: center;
          font-size: 10px;
          color: #90a4ae;
        }
      </style>
    </head>
    <body>
      <div class="banner">
        <div>
          <h1>MedInternia</h1>
          <p>Medical Case Study Report</p>
        </div>
        <div class="timestamp">
          Generated: ${timestamp}
        </div>
      </div>
      <div class="container">
        <h2 class="case-title">${title}</h2>
        <div class="grid-container">
          <div class="grid-item">
            <span class="grid-label">Category</span>
            <span class="grid-value">${category}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">Difficulty</span>
            <span class="grid-value">${difficulty}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">Status</span>
            <span class="grid-value">${status}</span>
          </div>
          <div class="grid-item">
            <span class="grid-label">Created Date</span>
            <span class="grid-value">${createdAt}</span>
          </div>
        </div>

        <div class="section-header">Author / Doctor Details</div>
        <div class="content-box" style="border-left-color: #0288d1;">
          <strong>Name:</strong> ${authorName}<br>
          ${doctorEmail ? `<strong>Email:</strong> ${doctorEmail}<br>` : ''}
          ${doctorSpec ? `<strong>Specialization:</strong> ${doctorSpec}<br>` : ''}
          ${doctorInst ? `<strong>Institution:</strong> ${doctorInst}<br>` : ''}
        </div>

        <div class="section-header">Case Description</div>
        <div class="content-box">${description}</div>

        ${symptoms ? `<div class="section-header">Patient Symptoms</div><div class="content-box">${symptoms}</div>` : ''}
        ${diagnosis ? `<div class="section-header">Diagnosis</div><div class="content-box">${diagnosis}</div>` : ''}
        ${treatment ? `<div class="section-header">Treatment</div><div class="content-box">${treatment}</div>` : ''}

        <div class="section-header discussion-theme">Top Discussions & Peer Reviews</div>
        ${discussionsHtml}

        <div class="footer">
          MedInternia &bull; Confidential Medical Case Report
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generates an HTML string template for a User CV / Resume export.
 */
export function generateResumePdfHtml(user: any, badges: any[] = []): string {
  const fullName = escapeHtml(`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || 'User Profile');
  const userType = user.userType || 'intern';
  const roleText = escapeHtml(
    userType === 'doctor' && user.specialization
      ? `Medical Doctor - ${user.specialization}`
      : userType === 'patient'
      ? 'Patient Profile'
      : 'Medical Intern'
  );

  let contactParts: string[] = [];
  if (user.email) contactParts.push(escapeHtml(user.email));
  if (user.phone) contactParts.push(escapeHtml(user.phone));
  if (user.linkedInProfile) contactParts.push('LinkedIn Profile');
  if (user.githubProfile) contactParts.push('GitHub Profile');
  const contactInfo = contactParts.join(' &bull; ');

  const bio = user.bio ? escapeHtml(user.bio) : null;
  const medicalSchool = user.medicalSchool ? escapeHtml(user.medicalSchool) : null;
  const yearOfStudy = user.yearOfStudy ? escapeHtml(String(user.yearOfStudy)) : null;
  const experience = user.experience ? escapeHtml(String(user.experience)) : null;
  const licenseNumber = user.licenseNumber ? escapeHtml(user.licenseNumber) : null;
  const interests = Array.isArray(user.interests) && user.interests.length > 0
    ? escapeHtml(user.interests.join(', '))
    : null;

  const points = user.points || 0;
  const casesAnalyzed = user.casesAnalyzed || 0;
  const peerReviewsGiven = user.peerReviewsGiven || 0;
  const certificatesEarned = user.certificatesEarned || 0;
  const streak = user.streak || 0;

  const badgesHtml = badges && badges.length > 0
    ? badges.map((b: any) => {
        const badgeName = escapeHtml(b.badge?.name || b.name || 'Achievement Badge');
        const badgeDesc = escapeHtml(b.badge?.description || b.description || '');
        return `
          <div class="badge-item">
            <strong>&bull; ${badgeName}</strong>
            ${badgeDesc ? `<div class="badge-desc">${badgeDesc}</div>` : ''}
          </div>
        `;
      }).join('')
    : '<p class="empty-text">No badges earned yet.</p>';

  const generatedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${fullName} - MedInternia CV</title>
      <style>
        * { box-sizing: border-box; }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #333333;
          font-size: 13px;
          line-height: 1.6;
          background: #ffffff;
        }
        .container {
          padding: 30px;
        }
        .header {
          border-bottom: 3px solid #0056cc;
          padding-bottom: 14px;
          margin-bottom: 20px;
        }
        .name {
          font-size: 26px;
          font-weight: 700;
          color: #0056cc;
          margin: 0 0 4px 0;
        }
        .role {
          font-size: 15px;
          font-style: italic;
          color: #666666;
          margin: 0 0 8px 0;
        }
        .contact {
          font-size: 11px;
          color: #555555;
        }
        .section-header {
          background: #0056cc;
          color: #ffffff;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 700;
          border-radius: 4px;
          margin-top: 18px;
          margin-bottom: 10px;
        }
        .section-body {
          padding: 4px 8px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 6px;
        }
        .stat-box {
          background: #f0f4f9;
          border: 1px solid #d0e1f9;
          border-radius: 6px;
          padding: 10px;
          text-align: center;
        }
        .stat-value {
          font-size: 16px;
          font-weight: 700;
          color: #0056cc;
        }
        .stat-label {
          font-size: 10px;
          color: #666666;
          text-transform: uppercase;
        }
        .badge-item {
          margin-bottom: 8px;
        }
        .badge-desc {
          font-size: 11px;
          color: #777777;
          margin-left: 14px;
        }
        .empty-text {
          color: #999999;
          font-style: italic;
        }
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          font-size: 10px;
          color: #999999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="name">${fullName}</h1>
          <p class="role">${roleText}</p>
          <div class="contact">${contactInfo}</div>
        </div>

        ${bio ? `
          <div class="section-header">Professional Summary</div>
          <div class="section-body">${bio}</div>
        ` : ''}

        <div class="section-header">Background & Education</div>
        <div class="section-body">
          ${medicalSchool ? `<p><strong>Medical School:</strong> ${medicalSchool}</p>` : ''}
          ${yearOfStudy ? `<p><strong>Year of Study:</strong> ${yearOfStudy}</p>` : ''}
          ${experience ? `<p><strong>Experience:</strong> ${experience} Years</p>` : ''}
          ${licenseNumber ? `<p><strong>License Number:</strong> ${licenseNumber}</p>` : ''}
          ${interests ? `<p><strong>Clinical Interests:</strong> ${interests}</p>` : ''}
          ${!medicalSchool && !yearOfStudy && !experience && !licenseNumber && !interests ? '<p class="empty-text">No background details specified.</p>' : ''}
        </div>

        <div class="section-header">MedInternia Contributions & Stats</div>
        <div class="section-body">
          <div class="stat-grid">
            <div class="stat-box">
              <div class="stat-value">${points}</div>
              <div class="stat-label">Platform Points</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${casesAnalyzed}</div>
              <div class="stat-label">Cases Analyzed</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${peerReviewsGiven}</div>
              <div class="stat-label">Peer Reviews</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${certificatesEarned}</div>
              <div class="stat-label">Certificates</div>
            </div>
            <div class="stat-box">
              <div class="stat-value">${streak} days</div>
              <div class="stat-label">Activity Streak</div>
            </div>
          </div>
        </div>

        <div class="section-header">Achievements & Badges</div>
        <div class="section-body">
          ${badgesHtml}
        </div>

        <div class="footer">
          Generated by MedInternia &bull; ${generatedDate}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Creates a minimal valid PDF binary buffer as fallback if headless browser generation fails.
 */
function createFallbackPdfBuffer(title: string = 'Document'): Buffer {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT
/F1 18 Tf
50 720 Td
(${title}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000246 00000 n 
0000000351 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
426
%%EOF`;

  return Buffer.from(content, 'utf-8');
}

const PUPPETEER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote'
];

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const MAX_CONCURRENT_RENDERS = readPositiveIntEnv('PDF_MAX_CONCURRENT_RENDERS', 3);
const LAUNCH_RETRY_DELAY_MS = readPositiveIntEnv('PDF_BROWSER_LAUNCH_RETRY_DELAY_MS', 10000);

let puppeteerModulePromise: Promise<any> | null = null;

/**
 * Loads the Puppeteer module once and caches the resolved reference so the
 * (potentially expensive) dynamic import only happens a single time.
 */
function loadPuppeteer(): Promise<any> {
  if (!puppeteerModulePromise) {
    puppeteerModulePromise = (async () => {
      try {
        const puppeteerModule = await import('puppeteer');
        return puppeteerModule.default || puppeteerModule;
      } catch (e) {
        return eval("require('puppeteer')");
      }
    })();
  }
  return puppeteerModulePromise;
}

let sharedBrowser: any = null;
let sharedBrowserPromise: Promise<any> | null = null;
let lastLaunchAttempt = 0;

/**
 * Lazily launches (and then reuses) a single headless Chrome instance for all
 * PDF exports. Previously renderHtmlToPdfBuffer called puppeteer.launch() for
 * every request, spinning up a brand new browser process each time - extremely
 * CPU and memory intensive under concurrent load. Now one Chrome instance stays
 * alive and every request simply opens a new tab on it.
 */
async function getSharedBrowser(): Promise<any> {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }
  if (sharedBrowserPromise) {
    return sharedBrowserPromise;
  }
  const now = Date.now();
  if (now - lastLaunchAttempt < LAUNCH_RETRY_DELAY_MS) {
    throw new Error('Puppeteer browser is unavailable (recent launch failed, retrying later)');
  }
  lastLaunchAttempt = now;
  sharedBrowserPromise = (async () => {
    const puppeteer = await loadPuppeteer();
    const browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_LAUNCH_ARGS
    });
    sharedBrowser = browser;
    browser.on('disconnected', () => {
      sharedBrowser = null;
    });
    return browser;
  })();
  try {
    return await sharedBrowserPromise;
  } finally {
    sharedBrowserPromise = null;
  }
}

let activeRenders = 0;
const renderWaitQueue: Array<() => void> = [];

/**
 * Bounds how many PDFs can render concurrently so that a burst of exports can
 * not exhaust server memory even though they share a single browser instance.
 */
async function acquireRenderSlot(): Promise<void> {
  if (activeRenders < MAX_CONCURRENT_RENDERS) {
    activeRenders++;
    return;
  }
  await new Promise<void>((resolve) => {
    renderWaitQueue.push(() => {
      activeRenders++;
      resolve();
    });
  });
}

function releaseRenderSlot(): void {
  const next = renderWaitQueue.shift();
  if (next) {
    next();
  } else {
    activeRenders--;
  }
}

/**
 * Closes the shared browser so the server can shut down without leaving
 * orphaned headless Chrome processes behind.
 */
export async function closePdfBrowserPool(): Promise<void> {
  const browser = sharedBrowser;
  sharedBrowser = null;
  if (browser) {
    try {
      await browser.close();
    } catch (closeErr) {
      // ignore close error
    }
  }
}

let shutdownHooksRegistered = false;

function registerPdfShutdownHooks(): void {
  if (shutdownHooksRegistered || typeof process === 'undefined' || !process.on) return;
  shutdownHooksRegistered = true;
  const shutdown = (): void => {
    closePdfBrowserPool().catch((err) => {
      console.error('Error while closing PDF browser pool:', err);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

/**
 * Renders an HTML string into a PDF Buffer using a shared Puppeteer browser.
 * The browser stays alive between calls and only a new tab is opened per
 * request, so concurrent PDF exports no longer spawn one Chrome process each.
 */
export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  registerPdfShutdownHooks();
  await acquireRenderSlot();
  let page: any = null;
  try {
    const browser = await getSharedBrowser();
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '12mm',
        right: '12mm',
        bottom: '12mm',
        left: '12mm'
      }
    });
    return Buffer.from(pdfUint8Array);
  } catch (error) {
    console.error('Puppeteer rendering encountered an issue, falling back to minimal PDF buffer:', error);
    return createFallbackPdfBuffer('MedInternia Export Document');
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeErr) {
        // ignore page close error
      }
    }
    releaseRenderSlot();
  }
}
