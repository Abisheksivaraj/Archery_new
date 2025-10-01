const Service = require("node-windows").Service;
const path = require("path");

const svc = new Service({
  name: "Archery MERN App",
  description: "Archery Part Management Application",
  script: path.join(__dirname, "server.js"), // This will point to W:\Archery_new\server.js
  nodeOptions: ["--harmony", "--max_old_space_size=4096"],
  env: [
    {
      name: "NODE_ENV",
      value: "production",
    },
    {
      name: "PORT",
      value: "5555",
    },
  ],
});

svc.on("install", () => {
  console.log("✅ Service installed successfully!");
  svc.start();
});

svc.on("start", () => {
  console.log("✅ Service started!");
  console.log("🚀 Access at: http://localhost:5555");
});

svc.on("alreadyinstalled", () => {
  console.log("⚠️ Service already installed.");
  console.log("Run: node uninstall-service.js first");
});

svc.on("error", (err) => {
  console.error("❌ Error:", err);
});

console.log("📦 Installing service...");
svc.install();
