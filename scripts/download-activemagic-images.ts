import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

interface DownloadResult {
  url: string;
  filename: string;
  success: boolean;
  error?: string;
}

interface ImageInfo {
  url: string;
  filename: string;
}

/**
 * Fetches HTML content from a URL
 */
async function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;

    const request = client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(
          new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`),
        );
        return;
      }

      let html = "";
      response.on("data", (chunk) => {
        html += chunk;
      });

      response.on("end", () => {
        resolve(html);
      });
    });

    request.on("error", (err) => {
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

/**
 * Extracts image URLs from HTML content
 */
function extractImageUrls(html: string, baseUrl: string): ImageInfo[] {
  const imageInfos: ImageInfo[] = [];

  // Regular expressions to find image references
  const patterns = [
    // img src attributes
    /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi,
    // href attributes pointing to image files
    /<a[^>]+href\s*=\s*["']([^"']+\.(?:jpg|jpeg|png|gif|bmp|webp|svg))["'][^>]*>/gi,
    // CSS background-image properties
    /background-image\s*:\s*url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi,
    // Direct links to image files in text
    /https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|bmp|webp|svg)/gi,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const imageUrl = match[1] || match[0];

      if (imageUrl && isImageFile(imageUrl)) {
        try {
          // Resolve relative URLs
          const fullUrl = new URL(imageUrl, baseUrl).href;
          const filename = extractFilename(fullUrl);

          // Avoid duplicates
          if (!imageInfos.some((info) => info.url === fullUrl)) {
            imageInfos.push({ url: fullUrl, filename });
          }
        } catch {
          console.log(`⚠️  Skipping invalid URL: ${imageUrl}`);
        }
      }
    }
  });

  return imageInfos;
}

/**
 * Checks if a URL points to an image file
 */
function isImageFile(url: string): boolean {
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg)(\?.*)?$/i;
  return imageExtensions.test(url);
}

/**
 * Extracts and sanitizes filename from URL
 */
function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    let filename = path.basename(urlObj.pathname);

    // If no filename in path, generate one from the full URL
    if (!filename || filename === "/") {
      filename = "image_" + Date.now() + ".jpg";
    }

    // Replace %20 with underscores and sanitize
    filename = decodeURIComponent(filename)
      .replace(/\s+/g, "_")
      .replace(/%20/g, "_")
      .replace(/[<>:"/\\|?*]/g, "_");

    // Ensure it has an extension
    if (!path.extname(filename)) {
      filename += ".jpg";
    }

    return filename;
  } catch {
    return "unknown_image.jpg";
  }
}

/**
 * Downloads an image from a URL
 */
async function downloadImage(
  imageInfo: ImageInfo,
  outputDir: string,
): Promise<DownloadResult> {
  return new Promise((resolve) => {
    try {
      const { url, filename } = imageInfo;
      const filepath = path.join(outputDir, filename);

      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  Skipping ${filename} (already exists)`);
        resolve({ url, filename, success: true });
        return;
      }

      const client = url.startsWith("https") ? https : http;

      const request = client.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log(`🔀 Redirecting ${url} → ${redirectUrl}`);
            downloadImage({ url: redirectUrl, filename }, outputDir)
              .then(resolve)
              .catch(() =>
                resolve({
                  url,
                  filename,
                  success: false,
                  error: "Redirect failed",
                }),
              );
            return;
          }
        }

        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(filepath);

          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            console.log(`✅ Downloaded: ${filename}`);
            resolve({ url, filename, success: true });
          });

          fileStream.on("error", (err) => {
            fs.unlink(filepath, () => {}); // Delete partial file
            console.error(`❌ Error writing ${filename}:`, err.message);
            resolve({ url, filename, success: false, error: err.message });
          });
        } else {
          console.error(`❌ HTTP ${response.statusCode} for ${url}`);
          resolve({
            url,
            filename,
            success: false,
            error: `HTTP ${response.statusCode}`,
          });
        }
      });

      request.on("error", (err) => {
        console.error(`❌ Request error for ${url}:`, err.message);
        resolve({ url, filename, success: false, error: err.message });
      });

      request.setTimeout(30000, () => {
        request.destroy();
        console.error(`❌ Timeout for ${url}`);
        resolve({ url, filename, success: false, error: "Timeout" });
      });
    } catch (err) {
      console.error(`❌ Error processing ${imageInfo.url}:`, err);
      resolve({
        url: imageInfo.url,
        filename: imageInfo.filename,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });
}

/**
 * Downloads images with limited concurrency
 */
async function downloadWithConcurrency(
  imageInfos: ImageInfo[],
  concurrency: number,
  outputDir: string,
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  for (let i = 0; i < imageInfos.length; i += concurrency) {
    const batch = imageInfos.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((imageInfo) => downloadImage(imageInfo, outputDir)),
    );
    results.push(...batchResults);

    // Show progress
    const completed = Math.min(i + concurrency, imageInfos.length);
    console.log(
      `📊 Progress: ${completed}/${
        imageInfos.length
      } images processed (${Math.round(
        (completed / imageInfos.length) * 100,
      )}%)`,
    );

    // Small delay between batches
    if (i + concurrency < imageInfos.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

async function main() {
  try {
    const targetUrl = "http://activemagicgames.com/TTS/DD/";

    console.log("🚀 Starting ActiveMagic image download process...");
    console.log(`🌐 Fetching HTML from: ${targetUrl}`);

    // Fetch HTML content
    const html = await fetchHtml(targetUrl);
    console.log(`📄 HTML fetched successfully (${html.length} characters)`);

    // Extract image URLs
    const imageInfos = extractImageUrls(html, targetUrl);
    console.log(`🔍 Found ${imageInfos.length} potential image URLs`);

    if (imageInfos.length === 0) {
      console.log("❌ No images found on the page");
      return;
    }

    // Show found images
    console.log("📋 Images found:");
    imageInfos.slice(0, 10).forEach((info, index) => {
      console.log(`  ${index + 1}. ${info.filename} → ${info.url}`);
    });
    if (imageInfos.length > 10) {
      console.log(`  ... and ${imageInfos.length - 10} more`);
    }

    // Create output directory
    const outputDir = path.join(
      __dirname,
      "..",
      "generated",
      "activemagic-images",
    );
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }

    console.log(`⬇️  Starting download process...`);
    console.log(`📂 Saving images to: ${outputDir}`);

    // Download images with limited concurrency
    const results = await downloadWithConcurrency(imageInfos, 3, outputDir);

    // Generate summary
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log("\\n📈 Download Summary:");
    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
      console.log(`\\n✅ Successfully downloaded ${successful.length} images:`);
      successful.slice(0, 5).forEach((r) => console.log(`  - ${r.filename}`));
      if (successful.length > 5) {
        console.log(`  ... and ${successful.length - 5} more`);
      }
    }

    if (failed.length > 0) {
      console.log("\\n❌ Failed downloads:");
      failed.forEach((f) => {
        console.log(`  - ${f.filename}: ${f.error}`);
      });
    }

    console.log("\\n🎉 ActiveMagic image download completed!");
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { main, fetchHtml, extractImageUrls, downloadImage };
