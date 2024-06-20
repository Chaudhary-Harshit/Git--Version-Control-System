const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");


function createBlobObject(file_name) {
    file_path = path.join(process.cwd(), file_name);
    file = fs.readFileSync(file_path).toString();
  
    to_be_compressed = "blob " + Buffer.byteLength(file, "utf-8") + "\0" + file;
  
    // console.log(to_be_compressed)
  
    new_blob_path = crypto
      .createHash("sha1")
      .update(to_be_compressed)
      .digest("hex")
      .toString();
    // console.log(new_blob_path)
    blob_object_path = path.join(
      process.cwd(),
      ".git",
      "objects",
      new_blob_path.slice(0, 2),
      new_blob_path.slice(2)
    );
    // console.log(blob_object_path)
  
    compressed_data = zlib.deflateSync(to_be_compressed);
  
    fs.mkdirSync(
      path.join(process.cwd(), ".git", "objects", new_blob_path.slice(0, 2)),
      { recursive: true }
    );
  
    fs.writeFile(blob_object_path, compressed_data, (err) => {
      if (err) {
        console.error(err);
        return;
      }
    });
  
    process.stdout.write(new_blob_path);
  }

  module.exports=createBlobObject;
  