import { defaultPreviewPort, distDir } from "./config.mjs";
import { startStaticServer } from "./static-server.mjs";

await startStaticServer({
  roots: [distDir],
  preferredPort: defaultPreviewPort,
  name: "Alae Journey preview server"
});
