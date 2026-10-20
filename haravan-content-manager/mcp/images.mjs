import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { imageSize } from "image-size";

import { InputValidationError } from "./errors.mjs";

function isJpeg(buffer) {
  return buffer.length >= 4
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[buffer.length - 2] === 0xff
    && buffer[buffer.length - 1] === 0xd9;
}

export async function validateJpegFile(filePath, contract) {
  if (typeof filePath !== "string" || !path.isAbsolute(filePath)) {
    throw new InputValidationError(`${contract.label} path must be absolute.`);
  }
  if (!/\.jpe?g$/i.test(filePath)) {
    throw new InputValidationError(`${contract.label} must use a .jpg or .jpeg filename.`);
  }

  let fileStat;
  let buffer;
  try {
    fileStat = await stat(filePath);
    buffer = await readFile(filePath);
  } catch (error) {
    throw new InputValidationError(`${contract.label} could not be read from the supplied path.`, { cause: error });
  }

  if (!fileStat.isFile()) {
    throw new InputValidationError(`${contract.label} path must point to a file.`);
  }
  if (fileStat.size > contract.maxBytes) {
    throw new InputValidationError(`${contract.label} exceeds the ${contract.maxBytes}-byte limit.`);
  }
  if (!isJpeg(buffer)) {
    throw new InputValidationError(`${contract.label} content is not a valid JPEG.`);
  }

  let dimensions;
  try {
    dimensions = imageSize(buffer);
  } catch (error) {
    throw new InputValidationError(`${contract.label} JPEG dimensions could not be read.`, { cause: error });
  }

  if (dimensions.width !== contract.width || dimensions.height !== contract.height) {
    throw new InputValidationError(
      `${contract.label} must be exactly ${contract.width}x${contract.height}; received ${dimensions.width}x${dimensions.height}.`,
    );
  }

  return {
    path: filePath,
    filename: path.basename(filePath),
    width: dimensions.width,
    height: dimensions.height,
    bytes: fileStat.size,
    attachment: buffer.toString("base64"),
  };
}

export function validateArticleImage(filePath) {
  return validateJpegFile(filePath, {
    label: "Article cover",
    width: 1920,
    height: 1080,
    maxBytes: 1_048_576,
  });
}

export async function validateProductImages(filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length !== 3) {
    throw new InputValidationError("Product creation requires exactly three image paths.");
  }

  const images = [];
  for (let index = 0; index < filePaths.length; index += 1) {
    images.push(await validateJpegFile(filePaths[index], {
      label: `Product image ${index + 1}`,
      width: 1600,
      height: 1600,
      maxBytes: 512_000,
    }));
  }
  return images;
}
