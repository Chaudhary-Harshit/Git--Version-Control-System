const fs = require("fs");
const path = require("path");

function createGitDirectory(basePath = "", branch) {
  fs.mkdirSync(path.join(process.cwd(), basePath, ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), basePath, ".git", "objects"), {
    recursive: true,
  });
  fs.mkdirSync(path.join(process.cwd(), basePath, ".git", "refs"), {
    recursive: true,
  });

  fs.writeFileSync(
    path.join(process.cwd(), basePath, ".git", "HEAD"),
    `ref: refs/heads/${branch}\n`
  );
  //console.log('Initialized git directory')
}

module.exports = { createGitDirectory };
