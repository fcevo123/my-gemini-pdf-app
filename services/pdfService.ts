import { PDFDocument } from 'pdf-lib';
import { SignatureSettings } from '../types';

export const addSignatureToPdf = async (
  pdfBytes: Uint8Array,
  signatureBase64: string,
  settings: SignatureSettings
): Promise<Uint8Array> => {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const signatureImage = await pdfDoc.embedPng(signatureBase64);

    const pages = pdfDoc.getPages();
    const { startPage = 1, pageInterval = 1 } = settings;

    for (let i = 0; i < pages.length; i++) {
      const currentPageNumber = i + 1;

      // Apply signature if:
      // 1. We are at or after the start page.
      // 2. The page matches the interval logic.
      // (currentPageNumber - startPage) will be 0, pageInterval, 2*pageInterval, etc. for matching pages.
      if (currentPageNumber >= startPage && (currentPageNumber - startPage) % pageInterval === 0) {
        const page = pages[i];
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        let x = settings.x;
        let y = settings.y;

        // Ensure signature is not placed outside the page boundaries
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + settings.width > pageWidth) x = pageWidth - settings.width;
        if (y + settings.height > pageHeight) y = pageHeight - settings.height;

        page.drawImage(signatureImage, {
          x: x,
          y: y,
          width: settings.width,
          height: settings.height,
          opacity: 1,
        });
      }
    }

    return await pdfDoc.save();
  } catch (error) {
    console.error('Failed to add signature to PDF:', error);
    throw new Error('Could not process the PDF file.');
  }
};
