import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

export const CLOUDINARY_CONFIG = {
  cloudName: "jbrberl7",
  apiKey: "999299263489569",
  apiSecret: "6bz_VUiUBXGBs9_bmFQMeuNfaEk",
  folder: "kklifedrop_donations",
  supabaseEdgeFunctionUrl: "https://uurkvfeguglvcjqgcway.supabase.co/functions/v1/upload-donation-proof",
};

/**
 * Computes SHA-1 hexadecimal hash using browser/RN standard Web Crypto
 */
async function sha1Hex(str: string): Promise<string> {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-1", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface PickedImageResult {
  uri: string;
  base64?: string;
  cancelled: boolean;
}

/**
 * Pick an image from the device photo library
 */
export async function pickDonationProofImage(): Promise<PickedImageResult> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission to access photo gallery was denied");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { uri: "", cancelled: true };
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 || undefined,
      cancelled: false,
    };
  } catch (error: any) {
    console.error("pickDonationProofImage error:", error);
    throw error;
  }
}

/**
 * Capture an image with the device camera
 */
export async function takeDonationProofPhoto(): Promise<PickedImageResult> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission to access camera was denied");
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { uri: "", cancelled: true };
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 || undefined,
      cancelled: false,
    };
  } catch (error: any) {
    console.error("takeDonationProofPhoto error:", error);
    throw error;
  }
}

/**
 * Uploads a donation proof/certificate to Cloudinary
 * Tries Edge Function first, falls back directly to signed Cloudinary REST API.
 */
export async function uploadDonationProofToCloudinary(image: {
  uri?: string;
  base64?: string;
}): Promise<string> {
  let filePayload = "";

  if (image.base64) {
    filePayload = image.base64.startsWith("data:")
      ? image.base64
      : `data:image/jpeg;base64,${image.base64}`;
  } else if (image.uri) {
    if (image.uri.startsWith("data:")) {
      filePayload = image.uri;
    } else {
      // In web or local file, fetch and convert to base64
      try {
        const response = await fetch(image.uri);
        const blob = await response.blob();
        filePayload = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        filePayload = image.uri;
      }
    }
  }

  if (!filePayload) {
    throw new Error("No image data provided for upload");
  }

  // 1. Try Supabase Edge Function
  try {
    const edgeRes = await fetch(CLOUDINARY_CONFIG.supabaseEdgeFunctionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: filePayload,
        folder: CLOUDINARY_CONFIG.folder,
      }),
    });

    if (edgeRes.ok) {
      const data = await edgeRes.json();
      if (data?.secure_url) {
        return data.secure_url;
      }
    }
  } catch (e) {
    console.warn("Edge function upload fallback to direct signed Cloudinary upload:", e);
  }

  // 2. Direct Signed Cloudinary Upload Fallback
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = CLOUDINARY_CONFIG.folder;
  const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_CONFIG.apiSecret}`;
  const signature = await sha1Hex(toSign);

  const formData = new FormData();
  formData.append("file", filePayload);
  formData.append("api_key", CLOUDINARY_CONFIG.apiKey);
  formData.append("timestamp", timestamp);
  formData.append("folder", folder);
  formData.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message || "Certificate image upload failed");
  }

  return json.secure_url;
}
