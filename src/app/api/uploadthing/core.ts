import { createUploadthing, type FileRouter } from "uploadthing/next";

// Initialize UploadThing file router
const f = createUploadthing();

// Define the file router
export const ourFileRouter = {
  // Define the image uploader with 8MB max size
  imageUploader: f({ image: { maxFileSize: "8MB" } })
    .middleware(async () => {
      // No middleware needed for public uploads, but can add auth check here
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      // This code runs after the upload is complete
      // Return the file URL to be used by the client
      console.log("[UploadThing] File uploaded successfully:", file.name);
      return { url: file.url };
    }),
} satisfies FileRouter;

// Export type for client-side usage
export type OurFileRouter = typeof ourFileRouter; 