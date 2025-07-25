import React, { useState, useCallback } from 'react';
import { FileUploader } from './components/FileUploader';
import { SettingsPanel } from './components/SettingsPanel';
import { PdfPreview } from './components/PdfPreview';
import { Spinner } from './components/Spinner';
import { removeBackground } from './services/imageService';
import { addSignatureToPdf } from './services/pdfService';
import { SignatureSettings, PageDimensions } from './types';
import { UploadCloud, Signature, FileText, Download } from 'lucide-react';

// pdf-lib is a required dependency. Please install it with `npm install pdf-lib`.
// lucide-react is a required dependency. Please install it with `npm install lucide-react`.

export default function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [processedSignature, setProcessedSignature] = useState<string | null>(null);
  // Sensible defaults for a signature
  const [settings, setSettings] = useState<SignatureSettings>({ x: 400, y: 80, width: 150, height: 50, pageInterval: 1, startPage: 1, signatureAspectRatio: null });
  const [pageDimensions, setPageDimensions] = useState<PageDimensions | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handlePdfSelect = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('請上傳有效的 PDF 檔案。');
      return;
    }
    // Reset state when a new PDF is uploaded
    setPageDimensions(null); 
    setPdfFile(file);
    setError(null);
  }, []);

  const handleSignatureSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('請上傳有效的圖片檔案 (PNG, JPG 等)。');
      return;
    }
    setSignatureFile(file);
    setIsProcessing(true);
    setError(null);
    try {
      const { dataUrl, aspectRatio } = await removeBackground(file);
      setProcessedSignature(dataUrl);
      setSettings(s => {
        const newHeight = s.width / aspectRatio;
        return { ...s, height: newHeight, signatureAspectRatio: aspectRatio };
      });
    } catch (e) {
      console.error(e);
      setError('無法處理簽名圖片。');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleProcessAndDownload = useCallback(async () => {
    if (!pdfFile || !processedSignature || !pageDimensions) {
      setError('請同時上傳 PDF 和簽名檔案。');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const pdfBytes = new Uint8Array(await pdfFile.arrayBuffer());
      const signedPdfBytes = await addSignatureToPdf(pdfBytes, processedSignature, settings);

      const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `signed_${pdfFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error(e);
      setError('簽署 PDF 時發生錯誤。');
    } finally {
      setIsProcessing(false);
    }
  }, [pdfFile, processedSignature, settings, pageDimensions]);
  
  const handlePdfInfoChange = useCallback((dimensions: PageDimensions, total: number) => {
    setPageDimensions(currentDims => {
      if (!currentDims) {
        setSettings(prevSettings => {
           const newWidth = 150;
           const newHeight = prevSettings.signatureAspectRatio ? newWidth / prevSettings.signatureAspectRatio : 50;
           return {
                ...prevSettings,
                width: newWidth,
                height: newHeight,
                x: dimensions.width - newWidth - 50,
                y: 50,
           };
        });
      }
      return dimensions;
    });
    setTotalPages(total);
  }, []);

  const WelcomeScreen = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-800/50 rounded-lg">
      <h1 className="text-4xl font-bold text-white mb-2">PDF 簽名工具</h1>
      <p className="text-lg text-gray-300 mb-8">輕鬆為您的 PDF 文件加上簽名，可指定頁面，操作簡單。</p>
      <div className="w-full max-w-md">
        <FileUploader
          onFileSelect={handlePdfSelect}
          accept="application/pdf"
          label="點擊或拖曳上傳您的 PDF"
          icon={<FileText className="w-10 h-10 text-gray-400" />}
        />
      </div>
      <p className="mt-4 text-gray-400 text-sm">您的檔案完全在您的瀏覽器中處理，絕不會上傳到伺服器。</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col antialiased">
      {isProcessing && <Spinner />}
      <main className="flex-grow flex flex-col md:flex-row p-4 gap-4">
        {!pdfFile ? (
          <div className="flex-grow flex items-center justify-center">
             <WelcomeScreen />
          </div>
        ) : (
          <>
            <div className="w-full md:w-1/3 xl:w-1/4 flex flex-col gap-4">
              <div className="bg-gray-800 p-4 rounded-lg flex flex-col gap-4">
                <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">您的檔案</h2>
                <FileUploader
                  onFileSelect={handlePdfSelect}
                  accept="application/pdf"
                  label={pdfFile.name}
                  icon={<FileText className="w-8 h-8 text-blue-400" />}
                />
                <FileUploader
                  onFileSelect={handleSignatureSelect}
                  accept="image/*"
                  label={signatureFile ? signatureFile.name : '上傳簽名檔'}
                  icon={<Signature className="w-8 h-8 text-green-400" />}
                />
              </div>

              {processedSignature && pageDimensions && (
                <SettingsPanel 
                  settings={settings}
                  onSettingsChange={setSettings}
                  pageDimensions={pageDimensions}
                  totalPages={totalPages}
                />
              )}
              
              <button
                onClick={handleProcessAndDownload}
                disabled={!pdfFile || !processedSignature || isProcessing}
                className="w-full mt-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                處理並下載
              </button>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>

            <div className="w-full md:w-2/3 xl:w-3/4 bg-gray-800 rounded-lg p-4 flex items-center justify-center overflow-hidden">
               <PdfPreview
                  pdfFile={pdfFile}
                  signatureImage={processedSignature}
                  settings={settings}
                  onPageInfoChange={handlePdfInfoChange}
                  onSettingsChange={setSettings}
               />
            </div>
          </>
        )}
      </main>
    </div>
  );
}