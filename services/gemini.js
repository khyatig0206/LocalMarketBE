const fetch = globalThis.fetch;

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * Fetch an image as base64 string from a public URL (e.g., Cloudinary)
 */
async function fetchImageAsBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
  const arrayBuf = await resp.arrayBuffer();
  const base64 = Buffer.from(arrayBuf).toString("base64");
  // naive mime detection from URL
  let mime = "image/jpeg";
  if (url.endsWith(".png") || /image\/png/.test(resp.headers.get("content-type") || "")) mime = "image/png";
  else if (url.endsWith(".jpg") || url.endsWith(".jpeg") || /image\/jpeg/.test(resp.headers.get("content-type") || "")) mime = "image/jpeg";
  else if (/image\//.test(resp.headers.get("content-type") || "")) mime = resp.headers.get("content-type");
  return { base64, mime };
}

/**
 * Ask Gemini to extract a structured postal address from Aadhaar images.
 * Returns { address, fullAddress, rawAddressText }
 */
async function extractAddressFromAadhaar(imageUrls = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    throw new Error("No Aadhaar images provided");
  }

  const inlineParts = [];
  for (const url of imageUrls) {
    const { base64, mime } = await fetchImageAsBase64(url);
    inlineParts.push({ inline_data: { mime_type: mime, data: base64 } });
  }

  const prompt = `You are extracting a postal address from Indian Aadhaar card images.\n
Strictly output only compact JSON with these string fields: 
{"addressLine1":"","addressLine2":"","city":"","state":"","postalCode":"","country":"India","fullAddress":"","rawAddressText":""}
- Prefer "India" for country.
- "fullAddress" is a single line suitable for geocoding.
- Do NOT include Aadhaar number or any other PII beyond address. Do not include any explanations.`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, ...inlineParts],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
    },
  };

  const resp = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const msg = data.error?.message || data.message || `Gemini request failed (${resp.status})`;
    throw new Error(msg);
  }

  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "";
  if (!text) throw new Error("Gemini returned empty response");

  // Try to parse JSON, even if surrounded by markdown
  let jsonText = text.trim();
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    jsonText = jsonText.slice(start, end + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error("Failed to parse Gemini JSON response");
  }

  const address = {
    addressLine1: parsed.addressLine1 || "",
    addressLine2: parsed.addressLine2 || "",
    city: parsed.city || "",
    state: parsed.state || "",
    postalCode: parsed.postalCode || "",
    country: parsed.country || "India",
  };
  const fullAddress = parsed.fullAddress || [address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(", ");
  const rawAddressText = parsed.rawAddressText || fullAddress || "";

  return { address, fullAddress, rawAddressText };
}

module.exports = { extractAddressFromAadhaar };
