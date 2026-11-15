import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "app.vlezet.preview",
  appName: "Влезет",
  webDir: "dist-android",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#f5f6f2" },
};
export default config;
