const fs= require('fs')
const path= require('path')
const zlib= require('zlib')
const crypto= require('crypto')
const https= require('https')
const axios= require('axios')


async function git_upload_pack__hash_discovery(url){
    const git_pack_url= '/info/refs?service=git-upload-pack'

    //Network Request to Fetch Repository Information

    const response = await axios.get(url+git_pack_url)

    const data= response.data

    data= data.split('\n');

    let hash=''

    for(const line of data){
        if((line.includes('refs/heads/master') || line.includes('refs/heads/main')) && line.includes('003')){
            const tupple= line.split(' ')

            hash= tupple[0].substring(4) //Remove leading 003f 

            break
        }
    }

    return hash;

}


async function git_request_pack_file(url,hash){
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

    return response;
}


async function fetch_git_pack(url){
    const packHash= await git_upload_pack__hash_discovery(url);

    const packResp= await git_request_pack_file(url,packHash);


    return packResp.data;
}


async function parse_git_pack(url){

    const packFile= await fetch_git_pack(url);

    const packObjects= packFile.slice(20);

    //count of objects
    let entries= Buffer.from(packFile.slice(16,20)).readUInt32BE(0); // Interpret the bytes as a 32-bit unsigned integer, Read 4 bytes as big endian unsigned integer, big endian--> MSB byte is at the lowest address

    console.log(entries)

    let i=0;
    const objs=[]

    for (let count=0; count<entries; count++){
        const [byte_read, obj]= await read_pack_object(packObjects,i);
         i+=byte_read
         objs.push(obj)

    }

    // console.log(`FOUND ${entries} ENTRIES`);
  objs.forEach((e) => console.log(e))
  // console.log(`THERE ARE ${objs.length} OBJECTS DECODED`);

  const checkSum= packObjects.slice(packObjects.length-20).toString('hex');
  i += 20 // final checksum length
  // console.log(`BYTES READ: ${i}, BYTES RECEIVED: ${packObjects.length}`);
  console.log(objs)
  return [objs, checkSum]

}

async function read_pack_object(buffer,i){
    // Parse the body of object after header
    // i is the location read in the buffer
    // parsed_byte is the total bytes read from the object

    const TYPE_CODES = {
        1: 'commit',
        2: 'tree',
        3: 'blob'
      }
    
    let [parsed_bytes, type, size]= read_pack_header(buffer,i);

    i+=parsed_bytes

    // console.log(`Object starting at ${i} ${buffer[i]}`);

    if(type<7 && type!=5){
        const [gzip, used]= await decompressFile(buffer.slice(i),size);

    // console.log(gzip.toString(), `Next parsing location at: ${parsed_bytes}`);
    // console.log("THIS IS PARSED", parsed_bytes, gzip.toString());

    return [
        parsed_bytes+used,
        {
            obj: gzip.toString(), type: TYPE_CODES[type]
        }
    ]

    }

    else if (type==7){
    //If the type is OBJ_REF_DELTA (reference delta object), the object metainformation (which we already parsed earlier) is followed by the 20-byte name of the base object

    const ref= buffer.slice(i,i+20) //base object name
    parsed_bytes+=20
    i+=20
    const [gzip, used] = await decompressFile(buffer.slice(i), size);

    return [
        parsed_bytes+used,
        {
            obj: gzip.toString(), type, ref: ref.toString('hex')
        }
    ]


    }



}



function read_pack_header(buffer,i){
    // Parse Packfile Header: type+size

    //To decode a variable-length integer from a byte stream 
  
  //Variable-length integers pack their least significant bits first, each subsequent byte contains increasingly significant bits
  

    cur= i
    type= (buffer[cur] & 112)>>4 //112-> 0b1110000 This extracts the 2nd,3rd,4th bit from left and aligns them by left shifting 4 bits as (b1b2b3b4b5b6b7b8) b2b3b4 contain type info, b1 is the continuation flag

    
    size= buffer[cur] & 15 // 15->0b00001111

    offset=4

    while(buff[cur]>=128){ //if the continuation bit is set, then the number would be atleast 128
        cur++

        size+= (buffer[cur] & 127) <<offset  //127->0b01111111, Removes the Continuation bit and left shifts by offset 
        offset+=7
    }

    return [cur-i+1,type,size]

}

async function decompressFile(buffer,size){
    try{
        const [decompressedData,used ]=await inflateWithLengthLimit(buffer,size);
        // console.log("Used data length:", used);

        return [decompressedData, used]
    }
    catch(err){
         // console.error("Decompression failed:", err.message);

         throw err;
    }
}

function inflateWithLengthLimit(compressedData, maxOutputSize){
    return new Promise((resolve,reject)=>{

        const inflater= new zlib.Inflate()

        let decompressedData= Buffer.alloc(0)

        let parsedBytes=0;


        inflater.on('data', (chunk)=>{
            decompressedData= Buffer.concat([decompressedData,chunk]);

            if(decompressedData> maxOutputSize){

                inflater.emit('error',
                    new Error('Decompressed Data Exceeds Maximum Output Size')
                )
            }
        })

        inflater.on('end',()=>{

            parsedBytes= inflater.bytesRead

            resolve ([decompressedData,parsedBytes])
        })

        inflater.on('error', (err)=>{
            reject(err)
        })

        inflater.write(compressedData)
        inflater.end()

    })
}

async function clone (url, directory) {
    await fetch_git_pack(url)
  }


function  createGitDirectory(dirName=null){
    let repoFolder;

    if(dirName){
        repoFolder= path.resolve(dirName)
    }

    fs.mkdirSync(path.join(repoFolder, '.git'), { recursive: true })
    fs.mkdirSync(path.join(repoFolder, '.git', 'objects'), {
        recursive: true
      })
      fs.mkdirSync(path.join(repoFolder, '.git', 'refs'), { recursive: true })
    
      fs.writeFileSync(
        path.join(repoFolder, '.git', 'HEAD'),
        'ref: refs/heads/main\n'
      )
      console.log('Initialized git directory')
}