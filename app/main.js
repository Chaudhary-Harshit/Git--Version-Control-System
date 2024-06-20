const createGitDirectory = require("./modules/inits");
const readBlobObject = require("./modules/cat-file");
const createBlobObject = require("./modules/hash-object");
const readTreeObject = require("./modules/ls-tree");
const writeTreeObject = require("./modules/write-tree");
const commitObject = require("./modules/commit-tree");
const clone_repo = require("./modules/clone");

const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;
  case "cat-file":
    readBlobObject(process.argv[4]);
    break;

  case "hash-object":
    createBlobObject(process.argv[4]);
    break;

  case "ls-tree":
    readTreeObject(process.argv[4]);
    break;

  case "write-tree":
    process.stdout.write(writeTreeObject());
    break;

  case "commit-tree":
    commitObject(process.argv[3], process.argv[5], process.argv[7]);
    break;

  case "clone":
    clone_repo(process.argv[3], process.argv[4]);
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}
