const path = require("path");
const fs = require("fs");
const zlib = require("zlib");

//process.cwd() returns the current working directory, i.e. the directory from which you invoked the node command.
//__dirname returns the directory name of the directory containing the JavaScript source code file

function readGitBlob(sha, basepath = "") {
  //Read the git blob based on SHA1 hash

  const blobPath = path.resolve(
    basepath,
    ".git",
    "objects",
    sha.slice(0, 2),
    sha.slice(2)
  );

  const data = fs.readFileSync(blobPath);

  const dataUncompressed = zlib.unzipSync(data);

  //Find the index of null byte

  const nullByteIndex = dataUncompressed.indexOf("\0");

  const blobData = dataUncompressed.toString().slice(nullByteIndex + 1);

  if (dataUncompressed) {
    process.stdout.write(blobData);
    return blobData;
  } else {
    throw new Error("Can't decompress git blob");
  }
}
module.exports = readGitBlob;
