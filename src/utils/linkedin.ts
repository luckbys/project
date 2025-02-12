// Função para comprimir imagem
export const compressImage = async (file: File, options: {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > options.maxWidth) {
        height = (options.maxWidth * height) / width;
        width = options.maxWidth;
      }
      if (height > options.maxHeight) {
        width = (options.maxHeight * width) / height;
        height = options.maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha ao comprimir imagem'));
        },
        file.type,
        options.quality
      );
    };
    img.onerror = reject;
  });
};

// Extrair hashtags do texto
export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#[\w\u0080-\uFFFF]+/g;
  return text.match(hashtagRegex) || [];
};

// Extrair menções do texto
export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@[\w\u0080-\uFFFF]+/g;
  return text.match(mentionRegex) || [];
};

// Extrair links do texto
export const extractLinks = (text: string): string[] => {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.match(urlRegex) || [];
}; 