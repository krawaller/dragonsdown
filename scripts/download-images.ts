import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

interface ImageUrlData {
  [url: string]: string[];
}

interface DownloadResult {
  url: string;
  filename: string;
  success: boolean;
  error?: string;
}

/**
 * Downloads an image from a URL and saves it to the specified directory
 */
async function downloadImage(
  url: string,
  outputDir: string,
  customFilename?: string,
): Promise<DownloadResult> {
  return new Promise((resolve) => {
    try {
      // Use custom filename if provided, otherwise extract from URL
      let filename: string;
      if (customFilename) {
        // Sanitize filename by removing/replacing invalid characters
        filename = customFilename
          .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid filename characters
          .replace(/\s+/g, "_") // Replace spaces with underscores
          .trim();
      } else {
        // Extract filename from URL (use the last part of the path)
        const urlParts = new URL(url);
        const pathParts = urlParts.pathname
          .split("/")
          .filter((part) => part.length > 0);
        filename = pathParts[pathParts.length - 1] || "unknown";
      }

      // Add .jpg extension if no extension present
      const finalFilename = filename.includes(".")
        ? filename
        : `${filename}.jpg`;
      const filepath = path.join(outputDir, finalFilename);

      // Skip if file already exists
      if (fs.existsSync(filepath)) {
        console.log(`⏭️  Skipping ${finalFilename} (already exists)`);
        resolve({ url, filename: finalFilename, success: true });
        return;
      }

      // Choose http or https based on URL
      const client = url.startsWith("https") ? https : http;

      const request = client.get(url, (response) => {
        if (response.statusCode === 200) {
          const fileStream = fs.createWriteStream(filepath);

          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            console.log(`✅ Downloaded: ${finalFilename}`);
            resolve({ url, filename: finalFilename, success: true });
          });

          fileStream.on("error", (err) => {
            fs.unlink(filepath, () => {}); // Delete partial file
            console.error(`❌ Error writing ${finalFilename}:`, err.message);
            resolve({
              url,
              filename: finalFilename,
              success: false,
              error: err.message,
            });
          });
        } else {
          console.error(`❌ HTTP ${response.statusCode} for ${url}`);
          resolve({
            url,
            filename: finalFilename,
            success: false,
            error: `HTTP ${response.statusCode}`,
          });
        }
      });

      request.on("error", (err) => {
        console.error(`❌ Request error for ${url}:`, err.message);
        resolve({
          url,
          filename: finalFilename,
          success: false,
          error: err.message,
        });
      });

      // Set timeout
      request.setTimeout(30000, () => {
        request.destroy();
        console.error(`❌ Timeout for ${url}`);
        resolve({
          url,
          filename: finalFilename,
          success: false,
          error: "Timeout",
        });
      });
    } catch (err) {
      console.error(`❌ Error processing ${url}:`, err);
      resolve({
        url,
        filename: "unknown",
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });
}

/**
 * Downloads images with limited concurrency to avoid overwhelming the server
 */
async function downloadWithConcurrency<T>(
  items: T[],
  concurrency: number,
  processor: (item: T) => Promise<DownloadResult>,
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Show progress
    const completed = Math.min(i + concurrency, items.length);
    console.log(
      `📊 Progress: ${completed}/${items.length} (${Math.round(
        (completed / items.length) * 100,
      )}%)`,
    );

    // Small delay between batches to be respectful to the server
    if (i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

async function main() {
  try {
    console.log("🚀 Starting image download process...");

    // Read the image URLs
    const imageUrlsPath = path.join(
      __dirname,
      "..",
      "generated",
      "image-urls.json",
    );

    if (!fs.existsSync(imageUrlsPath)) {
      console.error("❌ Could not find generated/image-urls.json");
      process.exit(1);
    }

    const imageUrlData: ImageUrlData = JSON.parse(
      fs.readFileSync(imageUrlsPath, "utf8"),
    );

    // Extract URLs and create filename mappings
    const urlsWithFilenames = Object.entries(imageUrlData).map(
      ([url, nameArray]) => {
        const u = new URL(url);
        return {
          url,
          filename:
            nameArray.join("_") + "___" + u.pathname.split("/").join("_"), // Concatenate array elements with underscores
        };
      },
    );

    console.log(`📋 Found ${urlsWithFilenames.length} image URLs to download`);

    // Create images directory
    const imagesDir = path.join(__dirname, "../generated/downloaded-images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log(`📁 Created images directory: ${imagesDir}`);
    }

    // Remove duplicates (by URL)
    const uniqueUrlsWithFilenames = urlsWithFilenames.filter(
      (item, index, self) =>
        index === self.findIndex((t) => t.url === item.url),
    );
    if (uniqueUrlsWithFilenames.length !== urlsWithFilenames.length) {
      console.log(
        `🔍 Removed ${
          urlsWithFilenames.length - uniqueUrlsWithFilenames.length
        } duplicate URLs`,
      );
    }

    console.log(
      `⬇️  Starting download of ${uniqueUrlsWithFilenames.length} unique images...`,
    );
    console.log(`📂 Saving to: ${imagesDir}`);

    // Download images with limited concurrency (3 at a time to be respectful)
    const results = await downloadWithConcurrency(
      uniqueUrlsWithFilenames,
      3,
      (item: { url: string; filename: string }) =>
        downloadImage(item.url, imagesDir, item.filename),
    );

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success);

    console.log("\\n📈 Download Summary:");
    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (failed.length > 0) {
      console.log("\\n❌ Failed downloads:");
      failed.forEach((f) => {
        console.log(`  - ${f.url}: ${f.error}`);
      });
    }

    console.log("\\n🎉 Download process completed!");
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export { downloadImage, main };
