# TODO for Implementing CropperJS in SettingsTab

## Tasks to Complete:
- [x] Add 'use client' directive to SettingsTab component for client-side rendering
- [x] Import necessary dependencies: React hooks, Supabase client, Cropper, cropper.css
- [x] Add state variables for user data, avatar, cropper, file input, and upload status
- [x] Implement useEffect to load user session and avatar data from Supabase
- [x] Add auth state listener to redirect if not logged in
- [x] Implement handleFileChange function for file validation and cropper initialization
- [x] Implement handleUpload function for cropping, uploading to Supabase, and updating user data
- [x] Add JSX section for profile picture display, file input, cropper container, and upload button
- [x] Style the new profile picture card to match existing card-grid layout
- [x] Convert component to TypeScript (.tsx) to fix type errors
- [x] Fix TypeScript errors with type assertions for Cropper API
- [x] Update settings page import to use new .tsx file
- [x] Remove old .js file
- [x] Test the component for correct cropping, upload, and error handling
- [x] Run dev server and verify integration with settings page
