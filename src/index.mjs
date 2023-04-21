import {
  rmdirSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  copyFileSync,
  cpSync,
} from "node:fs";
import { normalize } from "path";
import puppeteer from "puppeteer";
import { persons, dayFoldersRoot } from "../config.mjs";

const nineDays = 777_600_000;
const timeNow = Date.now();
const folderDayName = new Date().toISOString().split("T")[0];
const port = 8083;

async function start() {
  console.time("DO_IT");

  for await (const person of persons) {
    const srcMediaDir = `./wwwroot/${person}SrcMedia`;
    const destMediaDir = `./${person}NewMedia`;

    const pathToPerson = normalize(`${dayFoldersRoot}/${person}`);
    const dayFolders = readdirSync(pathToPerson);

    dayFolders.forEach((dayFolder) => {
      const folderDate = new Date(`${dayFolder}T12:00:00.000Z`).getTime();
      const timeDiff = timeNow - folderDate;
      if (timeDiff > nineDays) {
        rmdirSync(`${pathToPerson}/${dayFolder}`, { recursive: true });
      }
    });

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

    // move to dest folder
    if (!existsSync(`${pathToPerson}/${folderDayName}`)) {
      mkdirSync(`${pathToPerson}/${folderDayName}`);
    }

    cpSync(destMediaDir, `${pathToPerson}/${folderDayName}`, {
      recursive: true,
    });
  }

  console.timeEnd("DO_IT");
}

start();
