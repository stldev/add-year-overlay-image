import {
  rmdirSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
} from "node:fs";
import puppeteer from "puppeteer";

const persons = ["rbb", "blb", "alex"];
// const persons = ["alex"];
const port = 8083;

async function start() {
  console.time("DO_IT");

  for await (const person of persons) {
    const srcMediaDir = `./wwwroot/${person}SrcMedia`;
    const destMediaDir = `./${person}NewMedia`;

    if (existsSync(destMediaDir)) rmdirSync(destMediaDir, { recursive: true });
    mkdirSync(destMediaDir);

    const srcFiles = readdirSync(srcMediaDir);

    const nonJpgFiles = srcFiles.filter((file) => {
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

    const jpgFiles = srcFiles
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
      const page = await browser.newPage();
      await page.setViewport({ width: 333, height: 333 });
      await page.goto(
        `http://localhost:${port}?fileName=${file.name}&year=${file.year}&person=${person}`
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
  }

  console.timeEnd("DO_IT");
}

start();
