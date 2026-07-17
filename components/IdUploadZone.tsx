"use client";

import { useRef, useState } from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function IdUploadZone({
  file,
  onFileSelect,
  error,
  documentType = "idcard",
}: {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  error?: string | null;
  documentType?: "idcard" | "courseform";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  function validateAndSet(candidate: File) {
    if (!ALLOWED_TYPES.includes(candidate.type)) {
      onFileSelect(null);
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      onFileSelect(null);
      return;
    }
    onFileSelect(candidate);
  }

  async function startCamera() {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Prefer rear camera for documents
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setCameraError("Camera access denied or unavailable. Please upload a file instead.");
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Draw the current video frame onto the canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const capturedFile = new File([blob], `id-card-capture-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          validateAndSet(capturedFile);
        }
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  }

  return (
    <div className="space-y-stack-md">
      <div className="space-y-stack-xs">
        <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
          {documentType === "courseform" ? "Course Form Verification" : "Student ID Verification"}
        </label>
        <div
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) validateAndSet(dropped);
          }}
          className={`relative group cursor-pointer border-2 border-dashed rounded-lg p-stack-lg flex flex-col items-center justify-center transition-all min-h-[160px] ${
            isDragging
              ? "border-primary bg-white"
              : "border-outline-variant bg-surface-container-low hover:border-primary hover:bg-white"
          }`}
        >
          <input
            ref={inputRef}
            accept="image/*,.pdf"
            className="hidden"
            type="file"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) validateAndSet(selected);
            }}
          />
          <span className="material-symbols-outlined text-outline group-hover:text-primary mb-2 text-4xl transition-colors">
            attachment
          </span>
          <p className="font-body-md text-body-md text-on-surface-variant group-hover:text-charcoal-slate text-center font-medium">
            {documentType === "courseform" ? "Drag & Drop Course Form" : "Drag & Drop Student ID Card"}
          </p>
          <p className="font-label-caps text-[10px] text-outline mt-1 uppercase">
            Max Size: 5MB (JPG, PNG, PDF)
          </p>
          {file && (
            <div className="mt-4 px-3 py-1 bg-primary-container text-white rounded font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>{file.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex-1 border border-outline-variant hover:border-primary hover:bg-surface py-3 rounded-full font-semibold text-body-sm flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">upload_file</span>
          Upload File
        </button>
        <button
          type="button"
          onClick={startCamera}
          className="flex-1 bg-primary text-white hover:opacity-90 py-3 rounded-full font-semibold text-body-sm flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">photo_camera</span>
          Take a Photo
        </button>
      </div>

      {cameraError && <p className="text-error text-body-sm mt-1">{cameraError}</p>}
      {error && <p className="text-error text-body-sm mt-1">{error}</p>}

      {/* Camera Capture Modal */}
      {isCameraActive && (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface">
              <h3 className="font-headline-md text-on-surface font-semibold">
                {documentType === "courseform" ? "Capture Course Form" : "Capture ID Card"}
              </h3>
              <button
                type="button"
                onClick={stopCamera}
                className="text-on-surface-variant hover:text-charcoal-slate p-1 hover:bg-surface-container-high rounded-full transition-colors flex items-center"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Overlay Guideline */}
              <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col items-center justify-end pb-4">
                <span className="text-white text-[12px] bg-black/50 px-3 py-1.5 rounded-full font-medium tracking-wide">
                  {documentType === "courseform" ? "Align course form inside frame" : "Align ID card inside frame"}
                </span>
              </div>
            </div>
            <div className="p-5 bg-surface flex gap-3 justify-center">
              <button
                type="button"
                onClick={capturePhoto}
                className="bg-primary text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow hover:brightness-110 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                Capture
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="border border-outline-variant bg-white text-on-surface px-6 py-3 rounded-full font-semibold hover:bg-surface-container-low transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
