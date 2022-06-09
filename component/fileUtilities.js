const fse = require('fs-extra');
const fs = require('fs');
const archiver = require('archiver');
const unzipper = require('unzipper');

/**
 * @param {String} source
 * @param {String} out
 * @returns {Promise}
 */
 function copyDirectory(source, out) {
    return new Promise((resolve, reject) => {
        try {
            fse.copySync(source, out, { overwrite: true });
            resolve();
        }
        catch(err) {
            reject(err);
        }
    });
}

/**
 * @param {String} source
 * @param {String} out
 * @returns {Promise}
 */
function zipDirectory(source) {
    const out = `${source}_generated.zip`
    const archive = archiver('zip', { zlib: { level: 9 }});
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
    archive
        .directory(source, false)
        .on('error', err => reject(err))
        .pipe(stream);

    stream.on('close', () => {
        fs.rmdirSync(source, { recursive: true });
        resolve(out);
    });
    archive.finalize();
    });
}


/**
 * @param {String} proxyName to extract the downloaded proxy by the name.
 */
function extractProxyZip(zipPath) {
    return new Promise((resolve,reject) => {
        try {
            fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: '.'+zipPath.split('.')[1] }))
            .on('close', () => resolve('.'+zipPath.split('.')[1]))
            .on('error', (error) => reject(error));
        }
        catch(err)
        {
            reject(err);
        }
    });
}

exports.extractProxyZip = extractProxyZip;
exports.zipDirectory = zipDirectory;
exports.copyDirectory = copyDirectory;