import path from 'path';
import fs from 'fs';
import type { Config } from './types/plugin';
import { CODE_VERSION } from './constants/configuration';

const readManifest = (manifestPath: string) => {
  try {
    const prevData = fs.readFileSync(manifestPath, { encoding: 'utf-8' });
    return JSON.parse(prevData) as Config & { version?: string };
  } catch {
    return {} as Partial<Config & { version?: string }>;
  }
};

const validateDist = (pluginOptions: Config) => {
  const { cacheDir, distDir, prefix, reservedNames } = pluginOptions;

  if (!cacheDir || !distDir) {
    console.log(
      'classnames-minifier: Failed to check the dist folder because cacheDir or distDir is not specified'
    );
    return;
  }

  const manifestDir = path.join(cacheDir, 'ncm-meta');
  const manifestPath = path.join(manifestDir, 'manifest.json');
  let isImpreciseDist = false;

  if (fs.existsSync(manifestPath)) {
    const prevData = readManifest(manifestPath);
    if (
      prevData.prefix !== prefix ||
      prevData.cacheDir !== cacheDir ||
      prevData.distDir !== distDir ||
      prevData.reservedNames?.length !== reservedNames?.length ||
      prevData.reservedNames?.some((name) => !reservedNames?.includes(name)) ||
      prevData.version !== CODE_VERSION
    ) {
      isImpreciseDist = true;
    }
  } else {
    isImpreciseDist = true;
  }

  if (isImpreciseDist) {
    console.log(
      'classnames-minifier: Changes found in package configuration. Cleaning the dist folder...'
    );

    // New code to remove contents without removing the directory
    const files = fs.readdirSync(distDir);
    for (const file of files) {
      const currentPath = path.join(distDir, file);
      if (fs.lstatSync(currentPath).isDirectory()) {
        // Check if the directory is named "cache"
        if (path.basename(currentPath) === 'cache') {
          // Remove everything inside the "cache" directory but not the directory itself
          const cacheFiles = fs.readdirSync(currentPath);
          for (const cacheFile of cacheFiles) {
            const cacheFilePath = path.join(currentPath, cacheFile);
            if (fs.lstatSync(cacheFilePath).isDirectory()) {
              fs.rmSync(cacheFilePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(cacheFilePath);
            }
          }
        } else {
          // Recursively remove the directory and its contents
          fs.rmSync(currentPath, { recursive: true, force: true });
        }
      } else {
        // Remove the file
        fs.unlinkSync(currentPath);
      }
    }

    console.log(
      'classnames-minifier: Changes found in package configuration. Dist folder cleared'
    );
  }
  if (!fs.existsSync(manifestDir))
    fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({ ...pluginOptions, version: CODE_VERSION }),
    { encoding: 'utf-8' }
  );
};

export default validateDist;
