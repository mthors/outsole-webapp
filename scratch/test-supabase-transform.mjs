import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jmpzsxctynbdqyysxkah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcHpzeGN0eW5iZHF5eXN4a2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjM0NDAsImV4cCI6MjEwNjA5OTQ0MH0.sXXYzxK_80_drcgeLU8XzUqImHFy2ekbPMLYNRPaXOU";

const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const testPath = "outsoles/a3df0b57-6af5-4772-a670-40cb4ba6dc6d/1792064166648-8b68b4cd-osa-mx5-0.jpg";

async function main() {
  console.log("=== Testing standard createSignedUrl ===");
  const standardRes = await client.storage.from("outsole-images").createSignedUrl(testPath, 3600);
  console.log("Standard result:", standardRes);
  if (standardRes.data?.signedUrl) {
    const head = await fetch(standardRes.data.signedUrl);
    console.log("Standard HTTP status:", head.status);
    console.log("Standard content-type:", head.headers.get("content-type"));
    console.log("Standard content-length:", head.headers.get("content-length"));
  }

  console.log("\n=== Testing createSignedUrl with transform { width: 300, height: 300 } ===");
  try {
    const transformRes = await client.storage.from("outsole-images").createSignedUrl(testPath, 3600, {
      transform: {
        width: 300,
        height: 300,
        resize: "cover",
      }
    });
    console.log("Transform result:", transformRes);
    if (transformRes.data?.signedUrl) {
      console.log("Transform signedUrl:", transformRes.data.signedUrl);
      const res = await fetch(transformRes.data.signedUrl);
      console.log("Transform HTTP status:", res.status);
      console.log("Transform headers:", Object.fromEntries(res.headers.entries()));
      const body = await res.arrayBuffer();
      console.log("Transform fetched bytes:", body.byteLength);
      if (res.status !== 200) {
        console.log("Response text:", new TextDecoder().decode(body));
      }
    }
  } catch (err) {
    console.error("Transform createSignedUrl threw error:", err);
  }

  console.log("\n=== Testing createSignedUrls (batch) with transform ===");
  try {
    const batchRes = await client.storage.from("outsole-images").createSignedUrls([testPath], 3600, {
      // let's see if options are supported
    });
    console.log("Batch result:", batchRes);
  } catch (err) {
    console.error("Batch threw:", err);
  }
}

main().catch(console.error);
