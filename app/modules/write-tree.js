const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

function hashFile(file_path) {
    file = fs.readFileSync(file_path,'utf-8');
  
    to_be_compressed = "blob " + Buffer.byteLength(file, "utf-8") + "\x00" + file;
    new_blob_path = crypto.createHash("sha1").update(to_be_compressed).digest('hex');
  
    // final_str = "100644" + " " + path.basename(file_path) + "\0" + new_blob_path;
    blob_object_path = path.join(
      process.cwd(),
      ".git",
      "objects",
      new_blob_path.slice(0, 2),
      new_blob_path.slice(2)
    );
    // console.log(blob_object_path)
  
    // compressed_data = zlib.deflateSync(to_be_compressed);
  
    // fs.mkdirSync(
    //   path.join(__dirname, ".git", "objects", new_blob_path.slice(0, 2)),
    //   { recursive: true }
    // );
  
    // fs.writeFile(blob_object_path, compressed_data, (err) => {
    //   if (err) {
    //     console.error(err);
    //     return;
    //   }
    // });
  
  
  
    return new_blob_path;
  }
  
  function writeTreeObject(dir = process.cwd()) {
    let filenames = fs
    .readdirSync(dir)
    .filter((f) => f !== ".git" && f !== "main.js");
    // console.log(filenames);
  
    const entries = [];
  
    filenames.forEach((file) => {
      stats = fs.statSync(path.join(dir, file));
      file_path = path.join(dir, file);
  
      if (stats.isFile()) {
        entries.push({
          mode: "100644",
          name: file,
          hash: hashFile(file_path),
        });
      } else if (stats.isDirectory()) {
        entries.push({
          mode: "40000",
          name: file,
          hash: writeTreeObject(path.join(dir, file)),
        });
      }
    });
  
    // entries.sort((x,y)=>x.name-y.name);
  
    // console.log(entries)
  
    // let treeData= ""
    // entries.forEach((obj)=>{
    //   res = obj.mode+" "+obj.name+"\0"+Buffer.from(obj.hash,"hex")
    //   // res = `${obj.mode} ${obj.name}\x00${obj.hash}`
    //   // console.log(res)
    //   treeData+= res
    // })
  
    const treedata = entries.reduce((accumulator,{mode,name,hash}) => {
      return Buffer.concat([
        accumulator,
        Buffer.from(`${mode} ${name}\0`),
        Buffer.from(hash,'hex'),
      ])
    },Buffer.alloc(0))
  
  
    // console.log(treeData)
      const header = Buffer.concat([
        Buffer.from(`tree ${treedata.length}\0`),
        treedata
      ])
   // const header="tree "+Buffer.byteLength(treeData,'utf-8')+"\x00"+treeData
    //console.log(header)
  
    const treeHash= crypto
    .createHash("sha1")
    .update(header)
    .digest("hex");
    fs.mkdirSync(path.join(process.cwd(), ".git", "objects", treeHash.slice(0, 2)), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        process.cwd(),
        ".git",
        "objects",
        treeHash.slice(0, 2),
        treeHash.slice(2)
      ),
      zlib.deflateSync(header)
    );
  
    return treeHash;
  
   
  
  
  }
  function getFormattedUtcOffset() {
    const date = new Date();
    const offsetMinutes = -date.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMinutesRemainder = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes < 0 ? "-" : "+";
    const formattedOffset = `${sign}${offsetHours
      .toString()
      .padStart(2, "0")}${offsetMinutesRemainder.toString().padStart(2, "0")}`;
    return formattedOffset;
  }

  module.exports= writeTreeObject;
  