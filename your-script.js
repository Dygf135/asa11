const { executablePath } = require("puppeteer");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-infobars",
      "--window-position=0,0",
      "--ignore-certifcate-errors",
      "--ignore-certifcate-errors-spki-list",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    ],
    executablePath: executablePath(),
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  await page.goto("https://patrickhlauke.github.io/recaptcha/", {
    waitUntil: "networkidle0",
  });

  // Wait for the reCAPTCHA iframe to load
  await page.waitForSelector('iframe[src*="api2/anchor"]');

  const frames = await page.frames();
  const recaptchaFrame = frames.find(frame => frame.url().includes('api2/anchor'));

  if (!recaptchaFrame) {
    console.log("Could not find the reCAPTCHA frame");
    await browser.close();
    return;
  }

  // Click the checkbox
  await recaptchaFrame.click('.recaptcha-checkbox-border');

  // Wait for the audio challenge to appear
  await page.waitForSelector('iframe[src*="api2/bframe"]');
  const audioChallengeFrame = frames.find(frame => frame.url().includes('api2/bframe'));

  if (!audioChallengeFrame) {
    console.log("Could not find the audio challenge frame");
    await browser.close();
    return;
  }

  // Click the audio challenge button
  await audioChallengeFrame.waitForSelector('#recaptcha-audio-button');
  await audioChallengeFrame.click('#recaptcha-audio-button');

  // Wait for the audio to be available
  await audioChallengeFrame.waitForSelector('#audio-source');

  // Get the audio URL
  const audioUrl = await audioChallengeFrame.$eval('#audio-source', el => el.src);

  console.log("Audio URL:", audioUrl);

  // Here you would typically send this URL to your audio solving service
  // For demonstration, we'll just wait a bit and then input a dummy response

  await new Promise(resolve => setTimeout(resolve, 5000));  // Wait 5 seconds

  // Input a dummy response
  await audioChallengeFrame.type('#audio-response', 'dummy response');

  // Click verify
  await audioChallengeFrame.click('#recaptcha-verify-button');

  // Wait a bit for the verification to complete
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Take a screenshot
  await page.screenshot({ path: "screenshot.png", fullPage: true });
  console.log("Screenshot taken after CAPTCHA attempt.");

  await browser.close();
}

run().catch(console.error);
