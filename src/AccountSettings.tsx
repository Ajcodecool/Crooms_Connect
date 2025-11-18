import React, { useEffect, useRef, useState } from "react";

// You must install these dependencies for this component to work in a React project:
// npm install @supabase/supabase-js cropperjs
import { createClient, type User } from "@supabase/supabase-js";
import Cropper from "cropperjs";
// import "cropperjs/dist/cropper.css"; // CSS not available in this version

const SUPABASE_URL = "https://jxxnfsydjrflnephmfjm.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eG5mc3lkanJmbG5lcGhtZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTA3NjUsImV4cCI6MjA3NTAyNjc2NX0.-IRbU1ER8lu7eNPoETgVQaFJ4Fp9VMowjzWfN7EZY6w";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const styles: React.CSSProperties = {
  maxWidth: "640px",
  margin: "2rem auto",
  padding: "2rem",
  background: "white",
  borderRadius: "1rem",
  boxShadow: "0 3px 8px rgba(0,0,0,0.07)",
};

const cropperContainerStyle: React.CSSProperties = {
  borderRadius: "9999px",
  overflow: "hidden",
  border: "2px solid #e5e7eb",
  boxShadow: "0 3px 8px 0 rgba(0,0,0,0.07)",
  margin: "0 auto",
  width: 260,
  height: 260,
  background: "#f9fafb",
  display: "none",
};

const avatarPreviewStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: "9999px",
  border: "3px solid #4ade80",
  objectFit: "cover",
  margin: "0 auto",
};

type SupabaseUser = User & { id: string };

export default function AccountSettings() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [hasAvatar, setHasAvatar] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const [uploadDisabled, setUploadDisabled] = useState<boolean>(true);

  const [cropperVisible, setCropperVisible] = useState(false);
  const cropperRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperInstance = useRef<Cropper | null>(null);
  const [oldAvatarPath, setOldAvatarPath] = useState<string | null>(null);

  // Load user data and current avatar
  useEffect(() => {
    async function init() {
      const { data: sessionData } = await supabase.auth.getSession();
      const supabaseUser = sessionData?.session?.user as SupabaseUser;
      if (!supabaseUser) {
        window.location.href = "auth.html";
        return;
      }
      setUser(supabaseUser);

      // Fetch avatar url from "users"
      const { data: userData } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", supabaseUser.id)
        .single();

      if (userData?.avatar_url) {
        setAvatarUrl(userData.avatar_url);
        setHasAvatar(true);

        // Extract old avatar storage path from public URL
        try {
          const url = new URL(userData.avatar_url);
          const parts = url.pathname.split("/");
          const idx = parts.indexOf("profile-pictures");
          if (idx !== -1) {
            setOldAvatarPath(parts.slice(idx + 1).join("/"));
          } else {
            setOldAvatarPath(null);
          }
        } catch (e) {
          setOldAvatarPath(null);
        }
      } else {
        setAvatarUrl("");
        setHasAvatar(false);
        setOldAvatarPath(null);
      }

      setUploadDisabled(true);
    }

    init();

    // Auth state change redirect
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) window.location.href = "auth.html";
      }
    );
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Handle file selection and create cropper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCropperVisible(false);
      setUploadDisabled(true);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStatus("Only image files are allowed.");
      fileInputRef.current!.value = "";
      setCropperVisible(false);
      setUploadDisabled(true);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus("File too large (max 5 MB).");
      fileInputRef.current!.value = "";
      setCropperVisible(false);
      setUploadDisabled(true);
      return;
    }
    setStatus("");

    const url = URL.createObjectURL(file);

    if (cropperRef.current) {
      cropperRef.current.src = url;
      setCropperVisible(true);
      setUploadDisabled(false);

      cropperRef.current.onload = () => {
        if (cropperInstance.current) cropperInstance.current.destroy();
        cropperInstance.current = new Cropper(cropperRef.current!, {
          aspectRatio: 1,
          viewMode: 1,
          dragMode: "move",
          background: false,
          guides: false,
          autoCropArea: 1,
          cropBoxResizable: false,
          cropBoxMovable: false,
          movable: true,
          zoomable: true,
          minContainerWidth: 260,
          minContainerHeight: 260,
        });
      };
    }
  };

  // Handle cropping and uploading image
  const handleUpload = async () => {
    if (!cropperInstance.current || !user) return;
    setStatus("Processing image...");
    setUploadDisabled(true);

    (cropperInstance.current as any)
      .getCroppedCanvas({ width: 300, height: 300, imageSmoothingQuality: "high" })
      .toBlob(async (blob: Blob | null) => {
        if (!blob) {
          setStatus("Failed to crop image.");
          setUploadDisabled(false);
          return;
        }

        // Delete old avatar in storage (if exists)
        if (oldAvatarPath) {
          try {
            const { error: removeError } = await supabase.storage
              .from("profile-pictures")
              .remove([oldAvatarPath]);
            if (removeError) {
              console.warn("Failed to delete old avatar:", removeError.message);
            }
          } catch (err) {
            console.warn("Error while deleting old avatar:", err);
          }
        }

        // Upload new avatar
        const fileName = `profile-${user.id}-${Date.now()}.png`;
        setStatus("Uploading...");
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(fileName, blob, { upsert: true });

        if (uploadError) {
          setStatus("Upload failed: " + uploadError.message);
          setUploadDisabled(false);
          return;
        }

        // Get public URL for avatar
        const { data: publicUrlData } = await supabase.storage
          .from("profile-pictures")
          .getPublicUrl(fileName);

        const publicUrl = publicUrlData?.publicUrl;
        if (!publicUrl) {
          setStatus("Could not retrieve image URL.");
          setUploadDisabled(false);
          return;
        }

        // Update avatar in user table and auth metadata
        const { error: updateError } = await supabase
          .from("users")
          .update({ avatar_url: publicUrl })
          .eq("id", user.id);

        await supabase.auth.updateUser({
          data: { avatar_url: publicUrl },
        });

        if (updateError) {
          setStatus("Upload succeeded, but failed to save to profile: " + updateError.message);
        } else {
          setStatus("Profile picture updated!");
        }

        setAvatarUrl(publicUrl);
        setHasAvatar(true);
        setCropperVisible(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setUploadDisabled(true);
        setOldAvatarPath(fileName);
      }, "image/png", 0.95);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", color: "#222" }}>
      <header style={{ maxWidth: "640px", margin: "2rem auto", marginBottom: "1rem", display: "flex", alignItems: "center" }}>
        <a
          href="index.html"
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.5rem 1rem",
            background: "#22c55e",
            color: "white",
            borderRadius: "0.75rem",
            marginRight: "1rem",
            fontWeight: "bold",
            textDecoration: "none",
          }}
        >
          <svg width={16} height={16} style={{ marginRight: "0.5rem" }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </a>
        <h1 style={{ flex: 1, textAlign: "center", fontWeight: "700", fontSize: "2rem" }}>Account Settings</h1>
      </header>
      <main style={styles}>
        <h2 className="text-xl font-semibold mb-4 text-center">Profile Picture</h2>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ marginBottom: "0.5rem", textAlign: "center" }}>
            {hasAvatar ? (
              <img
                src={avatarUrl}
                style={{
                  ...avatarPreviewStyle,
                  opacity: 0.6,
                  display: avatarUrl ? "" : "none",
                }}
                alt="Current Avatar"
              />
            ) : (
              <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>No profile picture set</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{
              display: "block",
              width: "100%",
              fontSize: "1rem",
              color: "#64748b",
              marginBottom: "1rem",
            }}
          />
          <div
            style={{
              ...cropperContainerStyle,
              display: cropperVisible ? "" : "none",
              marginTop: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <img
              ref={cropperRef}
              alt="Crop Preview"
              style={{ maxWidth: "100%", display: "block" }}
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploadDisabled}
            style={{
              background: "#2563eb",
              color: "white",
              padding: "0.6rem 2rem",
              borderRadius: "9999px",
              fontWeight: "bold",
              marginBottom: "0.5rem",
              opacity: uploadDisabled ? 0.6 : 1,
              cursor: uploadDisabled ? "default" : "pointer",
            }}
          >
            Save / Upload
          </button>
          <p style={{ textAlign: "center", fontSize: "0.95rem", minHeight: "1.4em", marginTop: "0.5rem", color: "#475569" }}>
            {status}
          </p>
        </div>
      </main>
    </div>
  );
}
