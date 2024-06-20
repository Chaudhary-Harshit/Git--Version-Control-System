const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

function readTreeObject(file_name) {
    file_path = path.join(
      process.cwd(),
      ".git",
      "objects",
      file_name.slice(0, 2),
      file_name.slice(2)
    );
    // console.log(file_path);
  
    let content = fs.readFileSync(file_path);
  
    decompress_data = zlib.unzipSync(content).toString();
  
    // console.log(decompress_data)
  
    let final_content = decompress_data.split("\0");
    //  console.log(final_content)
  
    final_names = [];
  
    for (let i = 1; i < final_content.length - 1; i++) {
      let temp = final_content[i].split(" ");
  
      // console.log(temp.slice(-1))
      final_names.push(temp.slice(-1));
    }
    final_names.sort();
    // console.log(final_names)
  
    final_names.forEach((name) => {
      console.log(name[0]);
    });
  }

  module.exports= readTreeObject;