# Read a blob object

These are used to store file data. Blobs only store the contents of a file, not its name or permissions.

As discussed before the path to an object is derived from its 40 character SHA1 hash.

The path for the object with the hash `e88f7a929cd70b0274c4ea33b209c97fa845fdbc` would be:

```bash
  ./.git/objects/e8/8f7a929cd70b0274c4ea33b209c97fa845fdbc
```

Each Git Blob is stored as a separate file in the `.git/objects` directory. The file contains a header and the contents of the blob object, compressed using Zlib.

The format of a blob object file looks like this (after Zlib decompression):

```
  blob <size>\0<content>
```

* `<size>` is the size of the content (in bytes)
* `\0` is a null byte
*   `<content>` is the actual content of the file

    For example, if the contents of a file are `hello world`, the blob object file would look like this (after Zlib decompression):

```
  blob 11\0hello world
```

Now we would talk about the cat-file command that reads blob objects from objects directory and prints its content after decompression.

`git cat-file` is used to view the type of an object, its size, and its content. Example usage:

```bash
  $ git cat-file -p <blob_sha>
  hello world # This is the contents of the blob
```

To implement this:

* Read the contents of the blob object file from the `.git/objects` directory
* Decompress the contents using Zlib
* Extract the actual "content" from the decompressed data
* Print the content to terminal.
