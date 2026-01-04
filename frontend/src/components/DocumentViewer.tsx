import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Loader } from 'lucide-react';
import { useStore } from '../store';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ isOpen, onClose }) => {
  const { settings } = useStore();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchDocumentContent();
    }
  }, [isOpen]);

  const fetchDocumentContent = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/document/research-paper');
      if (response.ok) {
        const data = await response.json();
        setContent(data.content);
      } else {
        setContent(generateFallbackContent());
      }
    } catch (error) {
      console.error('Failed to load document:', error);
      setContent(generateFallbackContent());
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackContent = () => {
    return `<h1>ARAGOG: Advanced Medical Question-Answering System</h1><p>Loading document...</p>`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/api/document/research-paper/download';
    link.download = 'ARAGOG_Research_Paper.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col ${
        isDark ? 'bg-[#0a0a0a] border border-white/10' : 'bg-white border border-gray-200'
      }`}>
        <div className={`flex items-center justify-between p-4 md:p-6 border-b ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'}`}>
              <FileText className={`w-5 h-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg md:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ARAGOG Research Paper
              </h2>
              <p className={`text-xs md:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Advanced Medical Question-Answering System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDownload} className={`p-2 md:p-2.5 rounded-lg transition-all ${
                isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`} title="Download Document">
              <Download className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button onClick={onClose} className={`p-2 md:p-2.5 rounded-lg transition-all ${
                isDark ? 'hover:bg-white/5 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}>
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 lg:p-12 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader className={`w-8 h-8 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading document...</p>
            </div>
          ) : (
            <div className="document-content prose prose-sm md:prose-base lg:prose-lg max-w-none"
              style={{
                '--tw-prose-body': isDark ? '#d1d5db' : '#374151',
                '--tw-prose-headings': isDark ? '#ffffff' : '#111827',
                '--tw-prose-links': isDark ? '#818cf8' : '#4f46e5',
                '--tw-prose-bold': isDark ? '#ffffff' : '#111827',
                '--tw-prose-code': isDark ? '#e0e7ff' : '#4f46e5',
                '--tw-prose-hr': isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              } as React.CSSProperties}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </div>
      <style>{`
        .document-content {
          text-align: left;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .document-content h1 { font-size: 2rem; font-weight: 700; margin-top: 0; margin-bottom: 1.5rem; color: ${isDark ? '#ffffff' : '#111827'}; }
        .document-content h2 { font-size: 1.5rem; font-weight: 600; margin-top: 2.5rem; margin-bottom: 1rem; color: ${isDark ? '#f3f4f6' : '#1f2937'}; }
        .document-content h3 { font-size: 1.25rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.75rem; color: ${isDark ? '#e5e7eb' : '#374151'}; }
        .document-content h4 { font-size: 1.1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .document-content p { margin-bottom: 1.25rem; line-height: 1.8; text-align: justify; }
        .document-content ul, .document-content ol { margin: 1.25rem 0; padding-left: 2rem; line-height: 1.8; }
        .document-content li { margin-bottom: 0.75rem; padding-left: 0.5rem; }
        .document-content code { padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.9em; background: ${isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.1)'}; color: ${isDark ? '#c7d2fe' : '#4f46e5'}; }
        .document-content hr { margin: 3rem 0; border: none; border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; }
        .document-content strong { font-weight: 600; color: ${isDark ? '#ffffff' : '#111827'}; }
        .document-content em { font-style: italic; opacity: 0.8; }
        @media (max-width: 768px) {
          .document-content h1 { font-size: 1.75rem; }
          .document-content h2 { font-size: 1.35rem; }
          .document-content h3 { font-size: 1.15rem; }
          .document-content p { font-size: 0.95rem; text-align: left; }
        }
      `}</style>
    </div>
  );
};

export default DocumentViewer;
