const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const configuration = require('../Configuration.json');
const { getOrganization } = require('./utility.js');
const DOWNLOAD_PATH = configuration.DOWNLOAD_PATH;
/**
 * this function will check if the proxy is exsit 
 * if so then will return boolean flag (false) and proxy info
 * if not will return only boolean flag  (true)
 * 
 * @param {String} proxyName 
 * @param {String} organizationName
 * @returns {boolean & JSON} isNew & data
 */
 function isProxyNew(proxyName, organizationName) {
    return new Promise((resolve,reject) => {
        const organization = getOrganization(organizationName, "download");
        const apiPath = configuration.apiPathParameter.replace("${organizationName}", organization);
        axios({
            method: 'get',
            url: `${configuration.hostName}${apiPath}${proxyName}`,
            headers: { 
            'Authorization': configuration.Authorization
            }
        })
        .then(function (response) {
            return resolve({
                isNew: false,
                proxyData: JSON.parse(JSON.stringify(response.data))
            });
        })
        .catch((err) => {
            console.log("ERROR")
            console.log(err.message);
            return resolve({
                isNew: true,
                proxyData: err,
                status: err.response.status
            });
        });
    });
}


/**
* this function will download last revision of the proxy
* 
* @param {String} proxyName 
* @param {JSON} proxyData
* @param {String} organizationName
* @returns {Promise}
*/

async function downloadProxy
    (
    proxyName , 
    proxyData ,
    organizationName
    ) {
    return  new Promise
    ((
        resolve ,
        reject
        ) => {
            const organization = getOrganization(organizationName, "download");
            const apiPath = configuration.apiPathParameter.replace("${organizationName}", organization);
            const revisionNumber = proxyData.revision.pop();
            const url = `${configuration.hostName}${apiPath}${proxyName}/revisions/${revisionNumber}?format=bundle`;
            const writer = fs.createWriteStream(`${DOWNLOAD_PATH + proxyName}_revision_${revisionNumber}.zip`)
            // logging(proxyName,'downloadProxy','Start');
            axios({
                url,
                method: 'get',
                responseType: 'stream',
                headers: { 
                    'Authorization': configuration.Authorization, 
                    'Accept': 'application/json'
                }
            })
            .then(async (response) => {
                try {
                    response.data.pipe(writer);
                    writer.on('finish', () => {
                        // logging(proxyName,'downloadProxy','Success');
                        writer.close(resolve(`${DOWNLOAD_PATH + proxyName}_revision_${revisionNumber}.zip`));
                    });
                } catch (err) {
                    // logging(proxyName,'downloadProxy','Error',err.message);
                    return reject(err);
                }
            })
            .catch((err) => {
                // logging(proxyName,'downloadProxy','Error',err.message);
                return reject(err)
            });
        }
    );
    
}



/**
 * 
 * @param {String} proxyName 
 * @param {String} filePath 
 * @param {String} organizationName
 * @returns {Promise}
 */
function uploadProxy(proxyName, filePath, organizationName) {
    return new Promise((resolve,reject) => {
        const organization = getOrganization(organizationName, "upload");
        const apiPath = configuration.apiPathParameter.replace("${organizationName}", organization);
        var data = new FormData();
        data.append('file', fs.createReadStream(filePath));
        axios({
            method: 'post',
            url: `${configuration.hostName}${apiPath}?action=import&name=${proxyName}`,
            headers: { 
            'Content-Type': 'multipart/form-data', 
            'Authorization': configuration.Authorization, 
            ...data.getHeaders()
            },
            data : data
        })
        .then((response) => {
            fs.unlinkSync(filePath)
            return resolve(response);
        })
        .catch((err) => {
            console.log(err)
            return reject(err);
        });
    });

}

exports.downloadProxy = downloadProxy;
exports.uploadProxy = uploadProxy;
exports.isProxyNew = isProxyNew;