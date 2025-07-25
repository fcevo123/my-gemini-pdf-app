
export const removeBackground = (imageFile: File): Promise<{ dataUrl: string; aspectRatio: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) {
        return reject(new Error("Couldn't read file"));
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        
        const aspectRatio = img.width / img.height;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // A simple threshold for what is considered 'white'
        const whiteThreshold = 240;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > whiteThreshold && g > whiteThreshold && b > whiteThreshold) {
            // Set alpha to 0 for white/light pixels
            data[i + 3] = 0; 
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), aspectRatio });
      };
      
      img.onerror = reject;
      img.src = event.target.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
};