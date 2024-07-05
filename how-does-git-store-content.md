# How does Git Store Content?

<figure><img src=".gitbook/assets/image (1).png" alt=""><figcaption></figcaption></figure>

The first thing it modifies is the `index` file. The index is what stores the information about what is currently staged. This is used to signify that the file named `file` has been added to the index.

<figure><img src=".gitbook/assets/image (2).png" alt=""><figcaption></figcaption></figure>

It contains the type, size and data of the file named `file` that we did a `git add` on. In this case, the data says that it is a `blob` of size `9` and the content is `meain.io.`

So basically content is stored as Zlib Decompressed content in objects folder in a pattern which differs for every git object.

Now as far as the filename is concerned, it is the SHA1 hash of the content(which is written inside-- blob 9\0meain.io ) of the file and `git` takes the sha1 of the content to be written, takes the first two characters, in this case `4c`, creates a folder and then uses the rest of it as the filename. `git` creates folders from the first two chars to make sure we don't have too many files under the single `objects` folder.
