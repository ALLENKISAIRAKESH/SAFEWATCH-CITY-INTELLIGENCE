import React from "react";

export type SourceType = "webcam" | "upload" | "drone" | "mobile";

interface SourceSelectorProps {
  current: SourceType;
  sourceUrl?: string;
  onChange: (type: SourceType, urlOrFile?: string | File) => void;
}

const SourceSelector: React.FC<SourceSelectorProps> = ({ current, onChange }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-4 p-2">
      <button
        className={`px-4 py-2 rounded-full border ${
          current === "webcam"
            ? "bg-blue-600 text-white border-blue-600"
            : "bg-transparent text-blue-400 border-blue-400"
        }`}
        onClick={() => onChange("webcam")}
      >
        Webcam
      </button>

      <button
        className={`px-4 py-2 rounded-full border ${
          current === "upload"
            ? "bg-green-600 text-white border-green-600"
            : "bg-transparent text-green-400 border-green-400"
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        Upload Video
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange("upload", f);
        }}
      />

      <button
        className={`px-4 py-2 rounded-full border ${
          current === "drone"
            ? "bg-red-600 text-white border-red-600"
            : "bg-transparent text-red-400 border-red-400"
        }`}
        onClick={() => {
          const url = window.prompt("Enter Drone stream URL (RTSP, HLS .m3u8, or MP4):");
          if (url && url.trim()) onChange("drone", url.trim());
        }}
      >
        Drone
      </button>

      <button
        className={`px-4 py-2 rounded-full border ${
          current === "mobile"
            ? "bg-purple-600 text-white border-purple-600"
            : "bg-transparent text-purple-400 border-purple-400"
        }`}
        onClick={() => {
          const url = window.prompt("Enter Mobile camera stream URL (RTSP, HLS .m3u8, or MP4):");
          if (url && url.trim()) onChange("mobile", url.trim());
        }}
      >
        Mobile
      </button>
    </div>
  );
};

export default SourceSelector;
