const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

function commitObject(tree_hash, commit_sha=null,message){

    let contents= Buffer.from("tree "+tree_hash+"\n")
  
  
  
    if(commit_sha){
      contents= Buffer.concat([contents,
        Buffer.from("parent "+commit_sha+"\n"),
      ])
  
    }
    
  
    let seconds = new Date().getTime() / 1000;
    const utcOffset = '+0000';
  
    contents= Buffer.concat([contents,
      Buffer.from("author "+"harshit "+"<harshit_chaudhary@mail.com> "+seconds+" "+utcOffset+"\n"),
      Buffer.from("committer "+"harshit "+"<harshit_chaudhary@mail.com> "+seconds+" "+utcOffset+"\n"),
      Buffer.from("\n"),
      Buffer.from(message+"\n"),
  
    ])
  
    final_str=Buffer.concat([Buffer.from("commit "+contents.length+"\0"),contents])
  
    new_object_path = crypto.createHash("sha1").update(final_str).digest('hex');
  
  
    fs.mkdirSync(path.join(process.cwd(), ".git", "objects", new_object_path .slice(0, 2)), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(
        process.cwd(),
        ".git",
        "objects",
        new_object_path .slice(0, 2),
        new_object_path .slice(2)
      ),
      zlib.deflateSync(final_str)
    );
  
  
    process.stdout.write(new_object_path+"\n")
  
  
  
  
  
  
  
    // let tree=Buffer.from("tree "+tree_hash+"\n")
    // let parents_list= Buffer.from("parent "+commit_sha+"\n")
    // let seconds = new Date().getTime() / 1000;
    // const utcOffset = getFormattedUtcOffset();
    // author_list=Buffer.from("author "+"harshit_chaudhary "+"<harshit_chaudhary@mail.com> "+seconds+" "+utcOffset+"\n")
    // commiter_list=Buffer.from("committer "+"harshit_chaudhary "+"<harshit_chaudhary@mail.com> "+seconds+" "+utcOffset+"\n")
    // let contents=[tree,parents_list,author_list,commiter_list,Buffer.from(message+"\n")]
    // contents= Buffer.concat(contents)
  
    // final_str=Buffer.concat([Buffer.from("commit "+"\0"+contents.length),contents])
  
    // new_object_path = crypto.createHash("sha1").update(final_str).digest('hex');
  
  
    // fs.mkdirSync(path.join(__dirname, ".git", "objects", new_object_path .slice(0, 2)), {
    //   recursive: true,
    // });
    // fs.writeFileSync(
    //   path.join(
    //     __dirname,
    //     ".git",
    //     "objects",
    //     new_object_path .slice(0, 2),
    //     new_object_path .slice(2)
    //   ),
    //   zlib.deflateSync(final_str)
    // );
  
  
    // process.stdout.write(new_object_path+"\n")
  
  
  
  }

  module.exports= commitObject;