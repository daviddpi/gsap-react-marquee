import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const distDirectory = resolve(repositoryRoot, "dist");
const declarationIntermediates = resolve(distDirectory, "types");
const cleanDeclarationsOnly = process.argv.includes("--declarations-only");
const targetDirectory = cleanDeclarationsOnly
  ? declarationIntermediates
  : distDirectory;

const expectedParent = cleanDeclarationsOnly ? distDirectory : repositoryRoot;
if (dirname(targetDirectory) !== expectedParent) {
  throw new Error(`Refusing to clean unexpected directory: ${targetDirectory}`);
}

await rm(targetDirectory, { force: true, recursive: true });
