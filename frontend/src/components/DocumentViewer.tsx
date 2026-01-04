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
      // In production, you'd fetch the converted document content
      // For now, we'll show a placeholder that will be replaced with actual content
      fetchDocumentContent();
    }
  }, [isOpen]);

  const fetchDocumentContent = async () => {
    setLoading(true);
    try {
      // Fetch the document content from backend
      const response = await fetch('/api/document/research-paper');
      if (response.ok) {
        const data = await response.json();
        setContent(data.content);
      } else {
        // Fallback content
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
    return `
      <h1>ARAGOG: Advanced Medical Question-Answering System</h1>
      <h2>Research Paper</h2>
      
      <h3>Abstract</h3>
      <p>ARAGOG (Advanced Retrieval-Augmented Generation for Optimal Guidance) is a state-of-the-art medical question-answering system that leverages a Mixture-of-Experts (MoE) architecture combined with domain-specific FAISS indexes to provide accurate, context-aware medical information.</p>
      
      <h3>1. Introduction</h3>
      <p>The healthcare industry faces significant challenges in information accessibility and accuracy. ARAGOG addresses these challenges by implementing a sophisticated AI system that combines:</p>
      <ul>
        <li>Mixture-of-Experts architecture for domain specialization</li>
        <li>FAISS-based vector search for rapid information retrieval</li>
        <li>Context-aware conversation management</li>
        <li>Multi-domain medical knowledge integration</li>
      </ul>
      
      <h3>2. System Architecture</h3>
      <h4>2.1 Mixture-of-Experts (MoE)</h4>
      <p>The MoE architecture enables domain-specific expertise across multiple medical specialties:</p>
      <ul>
        <li><strong>Cardiology:</strong> Heart and cardiovascular conditions</li>
        <li><strong>Neurology:</strong> Brain and nervous system disorders</li>
        <li><strong>Dermatology:</strong> Skin conditions and treatments</li>
        <li><strong>Diabetes & Digestive:</strong> Metabolic and gastrointestinal health</li>
        <li><strong>General Medicine:</strong> Common health concerns</li>
      </ul>
      
      <h4>2.2 Vector Search with FAISS</h4>
      <p>ARAGOG utilizes Facebook AI Similarity Search (FAISS) for efficient semantic search across medical knowledge bases. Each domain maintains its own FAISS index for optimized retrieval.</p>
      
      <h4>2.3 Embedder Model</h4>
      <p>The system uses the <code>all-MiniLM-L6-v2</code> sentence transformer model for generating embeddings, providing a balance between performance and accuracy.</p>
      
      <h3>3. Key Features</h3>
      <h4>3.1 Conversational Context</h4>
      <p>ARAGOG maintains conversation history to provide context-aware responses, enabling follow-up questions and clarifications.</p>
      
      <h4>3.2 Confidence Scoring</h4>
      <p>Each response includes a confidence score based on the semantic similarity between the query and retrieved answers.</p>
      
      <h4>3.3 Multi-Expert Routing</h4>
      <p>The MoE router intelligently selects the most appropriate domain expert(s) for each query, ensuring specialized knowledge application.</p>
      
      <h3>4. Technical Implementation</h3>
      <h4>4.1 Backend Stack</h4>
      <ul>
        <li><strong>FastAPI:</strong> High-performance REST API</li>
        <li><strong>PyTorch:</strong> Deep learning framework</li>
        <li><strong>Sentence Transformers:</strong> Embedding generation</li>
        <li><strong>FAISS:</strong> Vector similarity search</li>
        <li><strong>SQLAlchemy:</strong> Database ORM</li>
      </ul>
      
      <h4>4.2 Frontend Stack</h4>
      <ul>
        <li><strong>React + TypeScript:</strong> Modern UI framework</li>
        <li><strong>Vite:</strong> Fast build tool</li>
        <li><strong>Tailwind CSS:</strong> Utility-first styling</li>
        <li><strong>Zustand:</strong> State management</li>
      </ul>
      
      <h3>5. Performance Metrics</h3>
      <p>ARAGOG demonstrates strong performance across various metrics:</p>
      <ul>
        <li><strong>Response Time:</strong> &lt;2s for most queries</li>
        <li><strong>Accuracy:</strong> High confidence scores (&gt;0.8) for domain-specific queries</li>
        <li><strong>Scalability:</strong> Supports concurrent users through efficient indexing</li>
      </ul>
      
      <h3>6. Deployment</h3>
      <p>ARAGOG is containerized using Docker and can be deployed on:</p>
      <ul>
        <li>Cloud platforms (Hugging Face Spaces, AWS, Azure)</li>
        <li>On-premise servers</li>
        <li>Kubernetes clusters</li>
      </ul>
      
      <h3>7. Future Enhancements</h3>
      <ul>
        <li>Integration of larger language models (GPT-4, Claude)</li>
        <li>Real-time medical literature updates</li>
        <li>Multi-language support</li>
        <li>Voice interaction capabilities</li>
        <li>Integration with electronic health records (EHR)</li>
      </ul>
      
      <h3>8. Conclusion</h3>
      <p>ARAGOG represents a significant advancement in medical AI, combining cutting-edge machine learning techniques with domain expertise to provide reliable, accessible medical information. The system's modular architecture allows for continuous improvement and expansion.</p>
      
      <h3>9. References</h3>
      <ol>
        <li>Vaswani et al. (2017). "Attention is All You Need"</li>
        <li>Devlin et al. (2018). "BERT: Pre-training of Deep Bidirectional Transformers"</li>
        <li>Johnson et al. (2019). "FAISS: A Library for Efficient Similarity Search"</li>
        <li>Reimers & Gurevych (2019). "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks"</li>
      </ol>
      
      <hr />
      <p><em>© 2026 ARAGOG Medical AI. All rights reserved.</em></p>
    `;
  };

  const handleDownload = () => {
    // Download the original DOCX file
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
        {/* Header */}
        <div className={`flex items-center justify-between p-4 md:p-6 border-b ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDark ? 'bg-indigo-500/10' : 'bg-indigo-50'
            }`}>
              <FileText className={`w-5 h-5 ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`} />
            </div>
            <div>
              <h2 className={`text-lg md:text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                ARAGOG Research Paper
              </h2>
              <p className={`text-xs md:text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Advanced Medical Question-Answering System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className={`p-2 md:p-2.5 rounded-lg transition-all ${
                isDark 
                  ? 'hover:bg-white/5 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
              title="Download Document"
            >
              <Download className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button
              onClick={onClose}
              className={`p-2 md:p-2.5 rounded-lg transition-all ${
                isDark 
                  ? 'hover:bg-white/5 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
              }`}
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 lg:p-12 ${
          isDark ? 'text-gray-300' : 'text-gray-800'
        }`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader className={`w-8 h-8 animate-spin ${
                isDark ? 'text-indigo-400' : 'text-indigo-600'
              }`} />
              <p className={`mt-4 text-sm ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Loading document...
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-12">
              <div 
                className="document-content prose prose-sm md:prose-base lg:prose-lg max-w-none"
                style={{
                  '--tw-prose-body': isDark ? '#d1d5db' : '#374151',
                  '--tw-prose-headings': isDark ? '#ffffff' : '#111827',
                  '--tw-prose-links': isDark ? '#818cf8' : '#4f46e5',
                  '--tw-prose-bold': isDark ? '#ffffff' : '#111827',
                  '--tw-prose-code': isDark ? '#e0e7ff' : '#4f46e5',
                  '--tw-prose-hr': isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  '--tw-prose-quotes': isDark ? '#9ca3af' : '#6b7280',
                } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .document-content {
          text-align: left;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .document-content h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-top: 0;
          margin-bottom: 1.5rem;
          line-height: 1.2;
          color: ${isDark ? '#ffffff' : '#111827'};
        }
        .document-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.3;
          color: ${isDark ? '#f3f4f6' : '#1f2937'};
        }
        .document-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          line-height: 1.4;
          color: ${isDark ? '#e5e7eb' : '#374151'};
        }
        .document-content h4 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .document-content p {
          margin-bottom: 1.25rem;
          line-height: 1.8;
          text-align: justify;
        }
        .document-content ul, .document-content ol {
          margin: 1.25rem 0;
          padding-left: 2rem;
          line-height: 1.8;
        }
        .document-content li {
          margin-bottom: 0.75rem;
          padding-left: 0.5rem;
        }
        .document-content code {
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
          font-size: 0.9em;
          font-family: 'Courier New', monospace;
          background: ${isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.1)'};
          color: ${isDark ? '#c7d2fe' : '#4f46e5'};
        }
        .document-content hr {
          margin: 3rem 0;
          border: none;
          border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
        }
        .document-content strong {
          font-weight: 600;
          color: ${isDark ? '#ffffff' : '#111827'};
        }
        .document-content em {
          font-style: italic;
          opacity: 0.8;
        }

        @media (max-width: 768px) {
          .document-content h1 { font-size: 1.75rem; margin-bottom: 1rem; }
          .document-content h2 { font-size: 1.35rem; margin-top: 2rem; }
          .document-content h3 { font-size: 1.15rem; margin-top: 1.5rem; }
          .document-content h4 { font-size: 1rem; }
          .document-content p { font-size: 0.95rem; text-align: left; }
          .document-content ul, .document-content ol { padding-left: 1.5rem; }
          .document-content li { font-size: 0.95rem; }
        }
      `}</style>
    </div>
  );
};

export default DocumentViewer;
