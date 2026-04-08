

## Plan: Generate 3D Dog Face Icon for Boss AI

### Overview
Use AI image generation to create a 3D-stylized dog face icon based on the uploaded dachshund photo, then replace the current `src/assets/boss-avatar.jpg` with the new icon.

### Steps

**1. Generate the 3D dog face icon**
- Use `google/gemini-3-pro-image-preview` (high-quality image generation) via a one-off script
- Send the original dachshund photo with an editing prompt: "Transform this into a 3D rendered cartoon-style dog face icon. Only the face, circular crop, smooth 3D render style like a Pixar character. Clean background, suitable for use as a small circular avatar/icon."
- Save the resulting image to `src/assets/boss-avatar.jpg` (replacing the current photo)

**2. No code changes needed**
- `BossAiDialog.tsx` and `QuoteBuilder.tsx` already import from `src/assets/boss-avatar.jpg` — the new image will be picked up automatically

### Files modified
- `src/assets/boss-avatar.jpg` — replaced with AI-generated 3D dog face

