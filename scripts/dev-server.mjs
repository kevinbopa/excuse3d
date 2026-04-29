import { clientDir, defaultDevPort, publicDir } from "./config.mjs";
import { startStaticServer } from "./static-server.mjs";

await startStaticServer({
  roots: [publicDir, clientDir],
  preferredPort: defaultDevPort,
  name: "Alae Journey dev server"
});
