const zlib= require('zlib')
const axios= require('axios')
const path= require('path')
const fs = require("fs")

const {createGitDirectory} = require("./init");
const checkout = require("./checkout");
const {
    writeGitObject,
    readGitObject,
    parseGitObject,
    parseGitObjects,
  } = require("./utils");


  process.removeAllListeners("warning"); // remove deprecation warnings

  //This code works for all the repositories, the earlier code had a bug in the deltaObjects formation.


async function clone(url,directory){
    const gitDir= path.resolve(directory);
    fs.mkdirSync(gitDir);

    


    const {gitObjects, deltaObjects, checkSum, head}= await getParsedGitObjects(url);
    createGitDirectory(directory,head.ref.split("/")[2]);

      // .git/HEAD file. This will point to the current branch reference.

      fs.writeFileSync(
        path.join(gitDir, ".git", "HEAD"),
        `ref: ${head.ref.toString("utf8")}`,
      );

     // Creating the .git/refs/heads

    fs.mkdirSync(path.join(gitDir, ".git", "refs", "heads"), { recursive: true });

    //Writing the Branch Reference File. This creates or overwrites the file for the branch reference with the commit hash.
    fs.writeFileSync(
        path.join(gitDir, ".git", "refs", "heads", head.ref.split("/")[2]),  //head.ref.split("/")[2] extracts the branch name from the reference path
        head.hash,  //This is the commit hash associated with the branch.
      );

    // console.log(gitObjects)

    // let k=0;

    for(let key in gitObjects){
        let obj= gitObjects[key];
        // k++;
        // console.log(obj.hash,obj.type)
        writeGitObject(obj.hash,obj.parsed,gitDir);

    }

    // console.log("Toal GitObjects again ", k);

    let resolvedDeltas= resolveDeltaObjects(deltaObjects,gitDir);
    // console.log(resolvedDeltas);
    // console.log(deltaObjects);

    // let m=0

    for(let key in resolvedDeltas){
      let obj = resolvedDeltas[key];
      // m++;
      // console.log(obj.hash,obj.type);
      // writeGitObject(obj.hash,obj.parsed,gitDir);
      gitObjects[obj.hash] = obj;

    }

    // console.log("Toal ResolvedGitObjects again ",  m);

    // console.log("Toal Objects again ", k+m);

    let hashToCheckout= findTreeToCheckout(head.hash,gitDir);
    // console.log("hi", head.hash)

    checkout(hashToCheckout, gitDir, gitDir);



}

function findTreeToCheckout(hash, basePath=""){
  const { type, length, content } = readGitObject(hash, basePath);

  if (type !== "commit") {
    throw new Error("Not a commit");
  }

  let commit = content.slice(content.indexOf("\0"));
  commit = content.toString().split("\n");
  let treeToCheckout = commit[0].split(" ")[1];
  return treeToCheckout;

}



async function getParsedGitObjects(url){
    const { objects, checkSum, head } = await getRawGitObjects(url);

    objectLength = Object.keys(objects).length;
    // console.log("Git objects are ", objectLength);
    

    const gitObjects = parseGitObjects(objects);
    objectLength = Object.keys(gitObjects).length;
    // console.log("Here again gitobjects are ",objectLength);
    
    // console.log(gitObjects);

    const deltaObjects= {};
    let id=0;
    let k=0;

    objects.forEach((obj)=>{
      
        if(obj.type!== "commit" && obj.type !=="blob" && obj.type!=="tree")
          {//   console.log(obj.type);
        
            
            deltaObjects[id++]=obj;
            // console.log(obj.ref.toString("hex"));
          }else{
            k++;
          }

    })

    // console.log(id,k);

    objectLength22 = Object.keys(deltaObjects).length;
    // console.log("Here again Deltaobjects are ",objectLength22);

    return {gitObjects, deltaObjects,checkSum,head};

  
}


async function getRawGitObjects(url){
    const { data, head } = await getPackFile(url);

    const packFile= data;
    const packObjects= packFile.slice(20);

    //count of objects
    let entries= Buffer.from(packFile.slice(16,20)).readUInt32BE(0); // Interpret the bytes as a 32-bit unsigned integer, Read 4 bytes as big endian unsigned integer, big endian--> MSB byte is at the lowest address

    // console.log("Total Objects", entries)

    let i=0;
    const objects=[]

    for (let count=0; count<entries; count++){
        const [byte_read, obj]= await parsePackObject(packObjects,i);
         i+=byte_read
         objects.push(obj)

    }

    // console.log(`FOUND ${entries} ENTRIES`);
  // console.log(`THERE ARE ${objs.length} OBJECTS DECODED`);

  const checkSum= packObjects.slice(packObjects.length-20).toString('hex');
  i += 20 // final checksum length

  // console.log(`BYTES READ: ${i}, BYTES RECEIVED: ${packObjects.length}`);

  return { objects, checkSum, head };

}

async function getPackFile(url){
    const { packHash, ref } = await getPackFileHash(url);
   
    const packRes = await getPackFileFromServer(url, packHash);

    console.log(packRes.data);

    return { data: packRes.data, head: { ref, hash: packHash } };
}

async function getPackFileHash(url){

    const git_pack_url= '/info/refs?service=git-upload-pack'

    //Network Request to Fetch Repository Information

    const response = await axios.get(url+git_pack_url)
    

    let data= response.data

    data= data.split('\n');

    let hash=''
    let ref= ''

    for(const line of data){
        if((line.includes('refs/heads/master') || line.includes('refs/heads/main')) && line.includes('003')){
            const tupple= line.split(' ')

            hash= tupple[0].substring(4) //Remove leading 003f 
            ref= tupple[1].trim();
            break
        }
    }

    return { packHash: hash, ref };
}

async function getPackFileFromServer(url,hash){
    const git_pack_post_url= '/git-upload-pack';

    // Construct POST request options

  const hashToSend= Buffer.from(`0032want ${hash}\n00000009done\n`, 'utf8');

  const headers={
      'Content-Type': 'application/x-git-upload-pack-request',
      'accept-encoding': 'gzip,deflate'
  }
    // Perform POST request to git-upload-pack endpoint

  const response= await axios.post(url+git_pack_post_url, hashToSend, {
      headers,
      responseType: 'arraybuffer',//Interpret the response as buffer data rather than text or JSON.
  })

  console.log(response.data);


  return response;
}

async function parsePackObject(buffer,i){
    // Parse the body of object after header
    // i is the location read in the buffer
    // parsed_byte is the total bytes read from the object

    const TYPE_CODES = {
        1: "commit",
        2: "tree",
        3: "blob",
        7: "delta",
      };

    let [parsedBytes, type, size] = parsePackObjectHeader(buffer, i);
    i += parsedBytes;

  // console.log(`Parsed ${parsed_bytes} bytes found type ${type} and size ${size}`,);
  // console.log(`Object starting at ${i} ${buffer[i]}`);

  // console.log("use",type);

  if (type < 7 && type != 5) {
    const [gzip, used] = await decompressPackObject(buffer.slice(i), size);
    return [parsedBytes + used, { content: gzip, type: TYPE_CODES[type] }];
  }

  else if (type == 7) {
    //If the type is OBJ_REF_DELTA (reference delta object), the object metainformation (which we already parsed earlier) is followed by the 20-byte name of the base object

    const ref = buffer.slice(i, i + 20); //base object name
    parsedBytes += 20;
    const [gzip, used] = await decompressPackObject(buffer.slice(i + 20), size);
    return [parsedBytes + used, { content: gzip, type: TYPE_CODES[type], ref }];
  }


}

function parsePackObjectHeader(buffer,i){

    // Parse Packfile Header: type+size

    //To decode a variable-length integer from a byte stream 
  
    //Variable-length integers pack their least significant bits first, each subsequent byte contains increasingly significant bits

    cur= i
    type= (buffer[cur] & 112)>>4 //112-> 0b1110000 This extracts the 2nd,3rd,4th bit from left and aligns them by left shifting 4 bits as (b1b2b3b4b5b6b7b8) b2b3b4 contain type info, b1 is the continuation flag

    
    size= buffer[cur] & 15 // 15->0b00001111

    offset=4

    while(buffer[cur]>=128){ //if the continuation bit is set, then the number would be atleast 128
        cur++

        size+= (buffer[cur] & 127) <<offset  //127->0b01111111, Removes the Continuation bit and left shifts by offset 
        offset+=7
    }

    return [cur-i+1,type,size]

}

async function decompressPackObject(buffer, size) {
    try {
      const [data, used] = await inflateWithLengthLimit(buffer, size);
      return [data, used];
    } catch (err) {
      throw err;
    }
  }


  function inflateWithLengthLimit(compressedData, maxOutputSize) {
    return new Promise((resolve, reject) => {
      const inflater = new zlib.createInflate();
      let decompressedData = Buffer.alloc(0);
      let parsedBytes = 0;
  
      inflater.on("data", (chunk) => {
        decompressedData = Buffer.concat([decompressedData, chunk]);
        if (decompressedData.length > maxOutputSize) {
          inflater.emit(
            "error",
            new Error("Decompressed data exceeds maximum output size"),
          );
        }
      });
  
      inflater.on("end", () => {
        parsedBytes = inflater.bytesRead;
        resolve([decompressedData, parsedBytes]);
      });
  
      inflater.on("error", (err) => {
        reject(err);
      });
  
      inflater.write(compressedData);
      inflater.end();
    });
  }


  function resolveDeltaObjects(deltas, basepath=""){
    let results ={};
    let pending= {};

    for(let key in deltas){
        try{
            let delta= deltas[key];
            let hash= delta.ref.toString("hex");
            let instructions= delta.content;

            const {type, length, content}= readGitObject(hash, basepath);

            let decoded= {type: type, content: decodeDelta(instructions,content)};
            let raw= decoded.content;

            decoded= parseGitObject(decoded);
            // console.log(decoded);

            results[decoded.hash]={
          hash: decoded.hash,
          type: type,
          parsed: decoded.parsed,
          raw: raw,
            }
            // console.log(decoded.hash,decoded.type);
            writeGitObject(decoded.hash,decoded.parsed,basepath);

        }

        catch(err){
          pending[key] = deltas[key];
        }
    }

    if(pending.length>0){
      resolveDeltaObjects(pending,basepath);
    }

    return results;


  }


function decodeDelta(instructions, refContent){
  //The delta data starts with the size of the base object and the size of the object to be reconstructed. the remainder of the delta data is a sequence of instructions to reconstruct the object from the base object

    refContent= Buffer.from(refContent,'utf-8');

    content= Buffer.alloc(0);

    let i=0;

   //This is the size of the base object 

    let {parsedBytes: refParsedBytes, size: refSize}= parseSize(instructions,i);    //Destructuring the object

  //console.log("-----------------------------------");
  //console.log("PARSED REF SIZE AT OFFSET ", i, " FOUND SIZE ", refSize);

  i += refParsedBytes;

  //This is the size of the object to be reconstructed

  let { parsedBytes: targetParsedBytes, size: targetSize } = parseSize(
    instructions,
    i,
  );

   //console.log("PARSED TARGET SIZE AT OFFSET ", i, " FOUND SIZE ", targetSize);
  //console.log("-----------------------------------");
  i += targetParsedBytes;

  //Parsing Instructions

  while(i< instructions.length){
    //insert instruction--> 0b0xxxxxxx(max -> 127(01111111))

    if(instructions[i]<=127){
      let { parsedBytes, insertContent } = parseInsert(instructions, i);

      content= Buffer.concat([content, insertContent]);

      i+=parsedBytes;

    }

    //copy Instruction --> 0b1xxxxxxx
    else if(instructions[i] > 127 && instructions[i] < 256){
      let { parsedBytes, offset, size } = parseCopy(instructions, i);

      let copyContent= refContent.slice(offset, offset+size);
      content = Buffer.concat([content, copyContent]);

      i+=parsedBytes


    }

    else{
      throw new Error("Not copy or insert");
    }
  }

  if(targetSize==content.length){
    return content;
  }
  else{
    throw new Error("Wrong target size, error in decoding delta");
  }





}


function parseCopy(data,i){
  let offSetBytes= []
  let sizeBytes= []
  let mask= data[i];
  let parsedBytes=1;
  i++;

 
  if (mask === 0x10000) {  // size zero is automatically converted to 0x10000.
    sizeBytes = 0;
  }

  for(let k=0; k<7;k++){
    if(k<4){
      //offsets 4 bits

      if( mask &(1<<k)){
        offSetBytes.push(data[i]);
        i++;
        parsedBytes++;
      }

      else{
        offSetBytes.push(0);
      }
    }

    else if(k>=4){
      //sizes  bits

      if (mask & (1 << k)) {
        sizeBytes.push(data[i]);
        i++;
        parsedBytes++;
      } else {
        sizeBytes.push(0);

      
    }
  }
}

  let offset=0;

  for(let[index, value] of offSetBytes.entries()){
    offset += value << (index * 8);
  }

  let size = 0;
  for (let [index, value] of sizeBytes.entries()) {
    size += value << (index * 8);
  }

  return {
    parsedBytes,
    offset,
    size,
  };
}

function parseInsert(data,i){
    const size= data[i]
    let parsedBytes=1;
    i+=parsedBytes

    const insertContent= data.slice(i,i+size);

    parsedBytes+=size;
    return {parsedBytes, insertContent};
}


function parseSize(data, i){
    // This calculates the size of the delta object, it is variable integer encoding 
    size= data[i] & 127; //127-> 0b01111111

    parsedBytes=1;

    offset=7;

    while(data[i]>127){
        i++;
        size+= (data[i] & 127) <<offset; //Little endian
        parsedBytes++;
        offset+=7;
    }
    return {parsedBytes, size};
}


module.exports= clone
