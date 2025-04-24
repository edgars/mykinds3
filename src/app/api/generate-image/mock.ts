// This file is used to mock canvas during build time in Docker
// It will be used by Next.js during static analysis but not at runtime

export const createCanvas = (width: number, height: number) => {
  return {
    width,
    height,
    getContext: () => ({
      fillStyle: '',
      font: '',
      textAlign: 'left',
      textBaseline: 'top',
      fillRect: () => {},
      fillText: () => {},
      measureText: () => ({ width: 0 }),
      drawImage: () => {},
      globalAlpha: 1
    }),
    toBuffer: () => Buffer.from([])
  };
};

export const loadImage = async () => {
  return {
    width: 1080,
    height: 1080
  };
};

export const registerFont = () => {};

// Export other canvas functions as needed
export default {
  createCanvas,
  loadImage,
  registerFont
}; 