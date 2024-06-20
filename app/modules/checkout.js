const fs = require("fs");
const path = require("path");
const { readGitObject, parseTreeEntries } = require("./utils");



// function listFilesAndFolders(dir, allFiles = []) {
//   const files = fs.readdirSync(dir);

//   files.forEach(file => {
//     const fullPath = path.join(dir, file);
//     if (fs.statSync(fullPath).isDirectory()) {
//       // Recursively call the function for subdirectories
//       listFilesAndFolders(fullPath, allFiles);
//     } else {
//       // Add file path to the array
//       allFiles.push(fullPath);
//     }
//   });

//   return allFiles;
// }

function checkout(hash, gitDir, basePath = "") {
//   const allFilesAndFolders = listFilesAndFolders(gitDir);

// console.log('All files and folders:', allFilesAndFolders);

  const { type, length, content } = readGitObject(hash, gitDir);
  if (type !== "tree") {
    throw new Error("Not a tree");
  }
  let entries = parseTreeEntries(content);
  // console.log(entries)
  for (let entry of entries) {
    if(entry.name=== ".git") continue;
    if (entry.mode === "100644") {
      // console.log(path.join(basePath, entry.name), entry.hash);
      const blob = readGitObject(entry.hash, gitDir);
     
      fs.writeFileSync(path.join(basePath, entry.name), blob.content);
    } else if (entry.mode === "40000") {
      // console.log("FOUND FOLDER", entry.hash, entry.name);
      let folder = path.join(basePath, entry.name);
      fs.mkdirSync(folder);
      checkout(entry.hash, gitDir, folder);
    }
  }
}

module.exports = checkout;