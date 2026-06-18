# Launch video

The Internet Court launch video — a ~11MB branded MOTION + SFX clip — is hosted on
**Vercel Blob**, not committed to the repo.

- **Store:** `internetcourt-media` (linked to the `internetcourt` Vercel project)
- **Public URL:** `https://x1sz5emmhghfuyj2.public.blob.vercel-storage.com/internet-court-launch.mp4`
- **Referenced in:** `src/components/site/watch/TheaterWatch.tsx` and
  `src/content/blog/launch-video.mdx` (both point directly at the Blob URL above)

The URL is public and CDN-cached, so it resolves the same in local dev and on prod
with no separate setup.

## Git tracking

All `.mp4` binaries in this folder are **gitignored** (`frontend/.gitignore`:
`/public/video/*.mp4`) and are **not** committed. The video lives on Blob.

## Updating the video

Upload a new file to the same pathname (overwrites in place; the public URL stays
the same):

```sh
# needs BLOB_READ_WRITE_TOKEN from the linked Vercel project
vercel blob put <path-to-new.mp4> --pathname internet-court-launch.mp4 --force true
```
