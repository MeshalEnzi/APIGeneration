const { validateRequestFields } = require('./utility.js');
const { downloadProxy, uploadProxy, isProxyNew } = require('./apigeeApiMgmt.js');
const { extractProxyZip, zipDirectory, copyDirectory} = require('./fileUtilities.js');
const { createFlowFile, createProxyBundelFile } = require('./flow.js')
const fs = require('fs');
const path = require("path");
const yaml = require('js-yaml');
const SwaggerParser = require('swagger-parser');
const CircularJSON = require('circular-json');
const DOWNLOAD_PATH = require('../Configuration.json').DOWNLOAD_PATH;

/**
 * 
 * @param {Object} req 
 * @param {Object} form 
 * @returns 
 */
 function proccessUploadedFile(req, form) {
    return new Promise((resolve, reject) => {
        try {
            form.parse(req, function (err, fields, files) {
                validateRequestFields(fields)
                .then(() => {
                    var oldpath = files.swaggerFile.path;
                    var fileType = files.swaggerFile.name.split(".").pop();
                    var newpath = DOWNLOAD_PATH + files.swaggerFile.name;
                    fs.rename(oldpath, newpath, function (err) {
                        if (err) return reject(err);
                        fs.readFile(newpath, (err, data) => {
                            if (err) return reject(err);
                            validateAndGenerateSwaggerFile(data,
                                fileType,
                                fields) 
                            .then((response) => {
                                fs.unlinkSync(newpath);
                                resolve(response);
                            })
                            .catch((err) => {
                                fs.unlinkSync(newpath);
                                reject(err);
                            });

                        });
                    });
                })
                .catch((err) => {
                    return reject(err)
                });
            });
        }
        catch(err) {
            return reject(err);
        }
    });
}

/**
 * this function will validate swagger file 
 * if the swagger is valid will return the api as josn
 * if not valid will return err
 * 
 * @param {Json|Yaml} data 
 * @returns {Json}
 */
function validateSwaggerFile(data) {
    return new Promise((resolve, reject) => {
        try {
            let api = SwaggerParser.validate(data);
            resolve(api);
        }
        catch(err) {
            reject(err);
        }
    });
}


/**
 * this function will validate the swagger file
 * if the swagger is valid will check the proxy if it exsit or not
 * if the proxy not exsit then will generate the proxy endpoints from the api 
 * the template dir will contain the apigee stander and template
 * after generate the apis will create the zip file and push it to apigee
 * 
 * @param {Json|Yaml} data the swagger file
 * @param {String} fileType uploaded file type
 * @param {Object} fields request fields contain { proxyName }
 * @returns {Promise} in case resolve will return the proxy zip file path, in case reject will return err
 */
async function validateAndGenerateSwaggerFile(data,fileType,fields) {
    return new Promise((resolve, reject) => {
        try {
            switch(fileType) {
                case 'yaml':
                    data = yaml.load(data);
                    break;
                case 'json':
                    data = JSON.parse(data);
                    break;
                default:
                    reject({'message':'FILE TYPE IS NOT ALLOWED TYPE!'});
            }
            const newFilePath = DOWNLOAD_PATH + fields.proxyName;
            console.log(data);
            validateSwaggerFile(data)
                .then((api) => {
                    api = JSON.parse(CircularJSON.stringify(api,null,2));
                    console.log(JSON.stringify(api));
                    isProxyNew(fields.proxyName, 
                        fields.organizationName)
                    .then((response) => {
                        if(response.isNew && response.status == 404) 
                        {
                            createFlowFile(
                                newFilePath, // => filePath
                                api,
                                response.isNew,
                                fields,
                                data
                            ).catch((err) => reject(err));
                            zipDirectory(
                                newFilePath
                            )
                            .then((zipFilePath) => {
                                uploadProxy(
                                    fields.proxyName,
                                    zipFilePath, 
                                    fields.organizationName);
                                return resolve({'message': `file has been deployed successfully!`});
                            })
                            .catch((err) => {
                                reject(err);
                            });
                        } 
                        else if(!response.isNew)  
                        {
                            downloadProxy(fields.proxyName, 
                                response.proxyData, 
                                fields.organizationName)
                            .then((zipFilePath) => {
                                extractProxyZip(zipFilePath)
                                .then((filePath) => {
                                    createFlowFile(
                                        filePath,
                                        api,
                                        response.isNew,
                                        fields,
                                        data)
                                    .then(() => {
                                        zipDirectory(
                                            filePath
                                        ).then((zipFilePath) => {
                                            uploadProxy(fields.proxyName,
                                                zipFilePath,
                                                fields.organizationName);
                                            return resolve({'message': `file has been deployed successfully!`});
                                        });
                                    })
                                    .catch((err) => {
                                        fs.unlinkSync(zipFilePath)
                                        fs.rmdirSync(filePath, { recursive: true });
                                        return reject(err);
                                    });
                                    
                                });
                            });
                        } 
                        else
                        {
                            return reject({'message': `Generice error: ${response.proxyData.message}`});
                        }
                    });
                })
                .catch((err) => {
                    reject({'message': `Swagger error: ${err.message}\nPlease visit https://editor.swagger.io/ and solve the error.`});
                });
            
                        
        }
        catch(err) {
            reject({'message': `Generice error: ${err.message}`});
        }
    });
}

exports.proccessUploadedFile = proccessUploadedFile;