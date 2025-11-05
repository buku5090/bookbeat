import { getDownloadURL, ref, uploadBytes, updateMetadata } from "firebase/storage";
import { storage } from "../src/firebase";

/**
 * Urcă o imagine în Firebase Storage cu cache pe termen lung
 * și returnează URL-ul public stabil (getDownloadURL).
 */
export async function uploadPublicImage(path, file) {
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type });
  await updateMetadata(r, { cacheControl: "public, max-age=31536000, immutable" });
  return await getDownloadURL(r);
}
