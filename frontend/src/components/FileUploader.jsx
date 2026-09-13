import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, CheckCircle, RefreshCw } from 'lucide-react';
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
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
            isDragging
              ? 'border-blue-600 bg-blue-50/60'
              : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20'
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
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>

            <h4 className="text-sm font-semibold text-slate-800">
              Drag and drop your resume here, or <span className="text-blue-600 underline">browse</span>
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              Supports PDF, DOCX formats (up to 10MB)
            </p>

            <div className="mt-3.5 flex items-center gap-2">
              <span className="text-[11px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                PDF
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-medium">
                DOCX
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-slate-900 break-all">
                    {currentFile.name}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-600" /> Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Size: <span className="text-slate-700 font-medium">{currentFile.size}</span> • Uploaded: <span className="text-slate-700 font-medium">{currentFile.lastModified || 'Today'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetToDemo}
                title="Reload default sample resume"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onFileRemoved}
                title="Remove file"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isUploading && (
            <div className="mt-3.5 pt-3 border-t border-slate-100">
              <ProgressBar value={uploadProgress} label="Uploading file..." height="h-1.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
