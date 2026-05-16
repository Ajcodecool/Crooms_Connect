import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import type { Session } from '@supabase/supabase-js';
import {
  SPECIAL_FRESHMAN_EMAILS,
  SENIOR_DEV_EMAILS,
  ART_IMMEDIATE_UPLOAD_EMAILS,
} from '../../utils/adminConstants';

// Import local assets
import paperImg from '../../assets/artwall/paper.jpg';
import tackImg from '../../assets/artwall/tack.png';

interface UploadArtModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session | null;
  onUploadSuccess: () => void;
}

const cutesyFont =
  "'Nunito', 'Varela Round', 'Arial Rounded MT Bold', 'Comic Sans MS', sans-serif";

const APPROVED_ART_LIMIT = 6;

const UploadArtModal: React.FC<UploadArtModalProps> = ({
  isOpen,
  onClose,
  session,
  onUploadSuccess,
}) => {
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleUpload = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim() || !session) return;
    setIsUploading(true);

    try {
      // 1) Enforce pending review limit
      // Deny when user has 7 or more pending uploads.
      const { count: pendingCount, error: pendingCountError } = await supabase
        .from('art_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'pending');

      if (pendingCountError) {
        console.error('Failed to count pending uploads:', pendingCountError);
      }

      const pendingCountValue = pendingCount ?? 0;

      // Hard stop + verification logging
      console.log('Pending review count for user:', {
        userId: session.user.id,
        pendingCount: pendingCountValue,
        pendingCountError,
      });

      // IMPORTANT: cap is triggered at strictly GREATER than 7 based on user report.
      // (Script requested > 7 behavior, not >= 7.)
      if (pendingCountValue > 7) {
        const msg = 'sorry review is full please try again later!';
        console.log('Upload blocked by pending-cap:', {
          userId: session.user.id,
          pendingCount: pendingCountValue,
        });
        alert(msg);
        return;
      }




      // 2) Enforce: users can only upload if they have fewer than APPROVED_ART_LIMIT approved artworks.
      // Count is performed server-side against the logged-in user.
      const { count } = await supabase
        .from('art_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('status', 'approved');

      const approvedCount = count ?? 0;


      // Verified-artist bypass: allow verified users to upload without waiting for approval.
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', session.user.id)
        .single();

      const isVerifiedArtist = !!profileData?.is_verified;

      // Staff override: allow Senior Devs + Special Freshmen to upload without waiting for mod approval
      // (We treat them as having the verified-artist permission regardless of their approved-art count.)
      const email = session.user.email || '';
      const isSeniorOrFreshman =
        SPECIAL_FRESHMAN_EMAILS.includes(email) ||
        SENIOR_DEV_EMAILS.includes(email);

      const isLocalImmediateUpload =
        ART_IMMEDIATE_UPLOAD_EMAILS.includes(email);

      // If user is immediate-upload eligible (verified artist OR local email OR staff override), they can upload immediately.
      // Otherwise enforce the approved-art count limit.
      if (
        !isSeniorOrFreshman &&
        !isVerifiedArtist &&
        !isLocalImmediateUpload &&
        approvedCount >= APPROVED_ART_LIMIT
      ) {
        alert(
          `Upload limit reached. You have ${approvedCount} approved artworks (limit: ${APPROVED_ART_LIMIT}). Wait for a mod-approved review or tear-down before uploading more.`,
        );
        return;
      }

      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('art_wall')
        .upload(filePath, uploadFile);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('art_wall')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from('art_posts').insert({
        user_id: session.user.id,
        title: uploadTitle,
        description: uploadDesc,
        image_url: publicUrlData.publicUrl,
        status:
          isSeniorOrFreshman || isVerifiedArtist || isLocalImmediateUpload
            ? 'approved'
            : 'pending',
      });

      if (insertError) throw insertError;

      alert('Pinned successfully! Waiting for a mod to approve.');
      setUploadTitle('');
      setUploadDesc('');
      setUploadFile(null);
      onUploadSuccess();
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      alert(`Pinning failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
      <div
        className='relative w-full max-w-md shadow-[0_10px_40px_rgba(0,0,0,0.3)] transform rotate-1 overflow-hidden border-2 border-[#4a3b32]'
        style={{ backgroundImage: `url(${paperImg})`, backgroundSize: 'cover' }}
      >
        <div className='w-full h-full bg-[#faf5f0]/90 backdrop-blur-[2px] p-8'>
          <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 w-10 h-10 z-10 drop-shadow-md'>
            <img
              src={tackImg}
              alt='pin'
              className='w-full h-full object-contain'
            />
          </div>

          <div className='flex justify-between items-center mb-8 border-b-2 border-dashed border-[#4a3b32] pb-3'>
            <h2
              className='text-[22px] font-bold text-[#4a3b32]'
              style={{ fontFamily: cutesyFont }}
            >
              Pin New Art
            </h2>
            <button
              onClick={onClose}
              className='text-xl font-bold text-[#4a3b32]'
              style={{ fontFamily: cutesyFont }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleUpload} className='flex flex-col gap-6'>
            <div
              className='border-2 border-dashed border-[#4a3b32] p-8 text-center cursor-pointer bg-white/50 shadow-sm'
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadFile ? (
                <p
                  className='truncate px-2 font-bold text-[#4a3b32] text-[14px]'
                  style={{ fontFamily: cutesyFont }}
                >
                  {uploadFile.name}
                </p>
              ) : (
                <p
                  className='font-bold text-[#4a3b32] text-[14px]'
                  style={{ fontFamily: cutesyFont }}
                >
                  + Click to attach image
                </p>
              )}
              <input
                type='file'
                accept='image/*'
                ref={fileInputRef}
                className='hidden'
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  e.target.files && setUploadFile(e.target.files[0])
                }
              />
            </div>

            <div>
              <label
                className='block mb-2 font-bold text-[#4a3b32] text-[13px]'
                style={{ fontFamily: cutesyFont }}
              >
                Title
              </label>
              <input
                type='text'
                required
                value={uploadTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUploadTitle(e.target.value)
                }
                className='w-full bg-white/50 border-2 border-[#4a3b32] p-3 outline-none focus:bg-white font-bold text-[#4a3b32]'
                style={{ fontFamily: cutesyFont }}
                placeholder='Name of your creation'
              />
            </div>

            <div>
              <label
                className='block mb-2 font-bold text-[#4a3b32] text-[13px]'
                style={{ fontFamily: cutesyFont }}
              >
                Description (Optional)
              </label>
              <textarea
                value={uploadDesc}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setUploadDesc(e.target.value)
                }
                className='w-full bg-white/50 border-2 border-[#4a3b32] p-3 outline-none resize-none h-24 focus:bg-white font-bold text-[#4a3b32] custom-scrollbar'
                style={{ fontFamily: cutesyFont }}
                placeholder='Tell us about it...'
              />
            </div>

            <button
              type='submit'
              disabled={isUploading || !uploadFile || !uploadTitle}
              className='mt-2 w-full py-4 disabled:opacity-50 border-2 border-[#4a3b32] bg-[#4a3b32] text-[#fdf8f5] shadow-[0_4px_10px_rgba(0,0,0,0.15)] font-bold text-[15px]'
              style={{ fontFamily: cutesyFont }}
            >
              {isUploading ? 'Pinning...' : 'Pin to Board'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadArtModal;
