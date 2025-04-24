import { createNextRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

// Export handlers for UploadThing's Next.js integration
export const { GET, POST } = createNextRouteHandler({
  router: ourFileRouter,
}); 