const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function readBlobObject(names) {
  filePath = path.join(
    process.cwd(),
    ".git",
    "objects",
    names.slice(0, 2),
    names.slice(2)
  );
  // console.log(filePath);

  let content = fs.readFileSync(filePath);

  decompress_data = zlib.unzipSync(content).toString();

  // console.log(decompress_data)

  let final_content = decompress_data.split("\0");
  final_content = final_content.slice(1).toString();

  process.stdout.write(final_content);
}

module.exports = readBlobObject;
