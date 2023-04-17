import {
  rmdirSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
} from "node:fs";
import puppeteer from "puppeteer";

const port = 8081;
const srcMediaDir = "./wwwroot/srcMedia";
const destMediaDir = "./newMedia";

async function start() {
  console.time("DO_IT");

  if (existsSync(destMediaDir)) rmdirSync(destMediaDir, { recursive: true });
  mkdirSync(destMediaDir);

  const allSrcFiles = readdirSync(srcMediaDir);

  const nonJpgFiles = allSrcFiles.filter((file) => {
    const name = file.toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return false;
    return true;
  });

  nonJpgFiles.forEach((file) => {
    const fileData = statSync(`${srcMediaDir}/${file}`);
    copyFileSync(
      `${srcMediaDir}/${file}`,
      `${destMediaDir}/${fileData.mtime.getFullYear()}-${file}`
    );
  });

  const jpgFiles = allSrcFiles
    .filter((file) => {
      const name = file.toLowerCase();
      if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return true;
      return false;
    })
    .map((file) => {
      const fileData = statSync(`${srcMediaDir}/${file}`);
      return { name: file, year: fileData.mtime.getFullYear() };
    });

  for await (const file of jpgFiles) {
    const browser = await puppeteer.launch();
    // const browser = await puppeteer.launch({ headless: false, devtools: true });
    // const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.setViewport({ width: 333, height: 333 });
    await page.goto(
      `http://localhost:${port}?fileName=${file.name}&year=${file.year}`
    );
    await new Promise((resolve) => setTimeout(resolve, 99));
    await page.screenshot({
      path: `${destMediaDir}/${file.year}-${file.name}`,
      fullPage: true,
      type: "jpeg",
      quality: 90,
    });
    await browser.close();
  }

  console.timeEnd("DO_IT");
}

start();
