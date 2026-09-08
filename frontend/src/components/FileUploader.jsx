import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { mockDefaultResumeFile } from '../data/mockResume';
import ProgressBar from './ProgressBar';

export default function FileUploader({ currentFile, onFileSelected, onFileRemoved, onError }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(100);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file) => {
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      if (onError) onError('Please upload a valid PDF or DOCX file.');
      return;
    }

    // Simulate short upload animation
    setIsUploading(true);
    setUploadProgress(0);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          onFileSelected({
            name: file.name,
            size: `${Math.round(file.size / 1024) || 245} KB`,
            lastModified: new Date().toISOString().split('T')[0],
            type: file.type || 'application/pdf'
          });
          return 100;
        }
        return prev + 25;
      });
    }, 120);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleResetToDemo = () => {
    onFileSelected(mockDefaultResumeFile);
  };

  return (
    <div className="w-full">
      {!currentFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-brand-400 bg-brand-500/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-slate-500 bg-slate-900/50 hover:bg-slate-800/40'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,.doc"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400 mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>

            <h4 className="text-base font-semibold text-slate-200">
              Drag & drop your resume here, or <span className="text-brand-400 underline">browse</span>
            </h4>
            <p className="mt-1.5 text-xs text-slate-400">
              Supports PDF, DOCX up to 10MB
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                PDF
              </span>
              <span className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                DOCX
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 border border-slate-700/80">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-100 break-all">
                    {currentFile.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Size: <span className="text-slate-300 font-medium">{currentFile.size}</span> • Uploaded: <span className="text-slate-300 font-medium">{currentFile.lastModified || 'Today'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToDemo}
                title="Reload demo resume (Sarah Johnson)"
                className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onFileRemoved}
                title="Remove file"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isUploading && (
            <div className="mt-4 pt-3 border-t border-slate-800">
              <ProgressBar value={uploadProgress} label="Uploading file..." height="h-2" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
