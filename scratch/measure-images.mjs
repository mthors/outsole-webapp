import { publicClient, fetchOutsoleBySlug } from "../src/lib/public-catalog.server.ts";

async function measure() {
  console.log("=== Measuring Product Images for 'mx5' ===");
  const mx5 = await fetchOutsoleBySlug("mx5");
  if (!mx5) {
    console.error("mx5 not found!");
    return;
  }
  console.log(`Product: ${mx5.name} (slug: ${mx5.slug}), Images: ${mx5.images.length}`);

  for (let i = 0; i < mx5.images.length; i++) {
    const img = mx5.images[i];
    console.log(`\nImage #${i + 1} (is_primary: ${img.is_primary}, order: ${img.display_order}):`);
    console.log("  Original file_path:", img.file_path);

    // Measure Original URL
    if (img.url) {
      const res = await fetch(img.url);
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`  [ORIGINAL] URL: ${img.url.slice(0, 80)}...`);
      console.log(`             Bytes: ${buf.length.toLocaleString()} bytes (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
    }

    // Measure Display URL (Hero)
    if (img.display_url) {
      const res = await fetch(img.display_url);
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`  [HERO DISPLAY] URL: ${img.display_url.slice(0, 80)}...`);
      console.log(`                 Bytes: ${buf.length.toLocaleString()} bytes (${(buf.length / 1024).toFixed(1)} KB)`);
    }

    // Measure Thumb URL (Thumbnails)
    if (img.thumb_url) {
      const res = await fetch(img.thumb_url);
      const buf = Buffer.from(await res.arrayBuffer());
      console.log(`  [THUMBNAIL] URL: ${img.thumb_url.slice(0, 80)}...`);
      console.log(`              Bytes: ${buf.length.toLocaleString()} bytes (${(buf.length / 1024).toFixed(1)} KB)`);
    }
  }

  console.log("\n=== Measuring Product Images for 'okf' (3 photos) ===");
  const okf = await fetchOutsoleBySlug("okf");
  if (okf) {
    for (let i = 0; i < okf.images.length; i++) {
      const img = okf.images[i];
      const origRes = await fetch(img.url);
      const origBuf = await origRes.arrayBuffer();
      const dispRes = await fetch(img.display_url);
      const dispBuf = await dispRes.arrayBuffer();
      const thumbRes = await fetch(img.thumb_url);
      const thumbBuf = await thumbRes.arrayBuffer();
      console.log(`\nOKF Image #${i + 1}:`);
      console.log(`  Original: ${(origBuf.byteLength / 1024 / 1024).toFixed(2)} MB (${origBuf.byteLength.toLocaleString()} bytes)`);
      console.log(`  Display:  ${(dispBuf.byteLength / 1024).toFixed(1)} KB (${dispBuf.byteLength.toLocaleString()} bytes)`);
      console.log(`  Thumb:    ${(thumbBuf.byteLength / 1024).toFixed(1)} KB (${thumbBuf.byteLength.toLocaleString()} bytes)`);
    }
  }
}

measure().catch(console.error);
