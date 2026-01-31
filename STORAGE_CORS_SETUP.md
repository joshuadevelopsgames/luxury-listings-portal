# Firebase Storage CORS Setup

If you see **CORS errors** when uploading Instagram report screenshots from production (e.g. `https://www.smmluxurylistings.info`), the Storage bucket needs CORS configured.

## Prerequisite: Default Storage bucket

Your app uses `storageBucket: "luxury-listings-portal-e56de.firebasestorage.app"`. The GCS bucket name is **`luxury-listings-portal-e56de.firebasestorage.app`** (same as in [Firebase Console → Storage](https://console.firebase.google.com/project/luxury-listings-portal-e56de/storage)).

## One-time setup (Google Cloud)

1. **Install Google Cloud SDK** (if needed): https://cloud.google.com/sdk/docs/install  
2. **Authenticate**: `gcloud auth login`  
3. **Set project**: `gcloud config set project luxury-listings-portal-e56de`  
4. **Apply CORS** from the project root:
   ```bash
   gsutil cors set storage.cors.json gs://luxury-listings-portal-e56de.firebasestorage.app
   ```
5. **Verify** (optional):
   ```bash
   gsutil cors get gs://luxury-listings-portal-e56de.firebasestorage.app
   ```

The file `storage.cors.json` in this repo allows your production domain, Vercel preview, and localhost. After applying, uploads from the app should work without CORS errors.
