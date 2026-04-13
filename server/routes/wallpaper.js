import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// GET — List wallpaper images (no auth needed)
router.get("/", async (req, res) => {
  try {
    const wallpaperDir = path.join(__dirname, "..", "..", "public", "walpaper");
    const files = await fs.promises.readdir(wallpaperDir);
    const images = files.filter((file) => /\.(jpg|jpeg|png|webp|avif)$/i.test(file));
    res.json(images);
  } catch (error) {
    res.json([]);
  }
});

export default router;
