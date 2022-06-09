
const fs = require('fs');
const convert = require('xml-js');
const {downloadProxy, isProxyNew} = require('./apigeeApiMgmt.js');
const { extractProxyZip } = require('./fileUtilities.js');
const { getFlows } = require('./flow.js');
const uuid = require('uuid');
const configuration = require('../Configuration.json');

/**
 * this function will check if the proxy is exist or not
 * if exist then will download it and generate postman collection from proxy endpoint
 * if not will return an error
 * 
 * @param {String} proxyName 
 * @returns {Promise}
 */

 function proccessGeneratePostmanColl(proxyName, orgName) {
    return new Promise((resolve,reject) => {
        isProxyNew(proxyName, orgName)
        .then((response) => {
            if(!response.isNew)  
            {
                downloadProxy(proxyName, response.proxyData, orgName)
                .then((zipFilePath) => {
                    extractProxyZip(zipFilePath).then((filePath) => {
                        resolve(prepareGeneratePostmanColl(filePath, proxyName));
                    });
                }).catch((err) => { return reject(err); });
            } 
            else if(response.isNew && response.status == 404) 
            {
                return reject({'message':'Proxy does not exist!'});
            }
            else
            {
                return reject({'message': `Generice error: ${response.proxyData.message}`});
            }
        });
    });
    
}

/**
 * this function will check if the proxy is exist or not
 * if exist then will download it and generate postman collection from proxy endpoint
 * if not will return an error
 * 
 * @param {String} proxyName 
 * @returns {Promise}
 */

 function proccessGenerateOpenApi(proxyName, orgName) {
    return new Promise((resolve,reject) => {
        isProxyNew(proxyName, orgName)
        .then((response) => {
            if(!response.isNew)  
            {
                downloadProxy(proxyName, response.proxyData, orgName)
                .then((zipFilePath) => {
                    extractProxyZip(zipFilePath).then((filePath) => {
                        resolve(prepareGenerateOpenApi(filePath, proxyName));
                    });
                }).catch((err) => { return reject(err); });
            } 
            else if(response.isNew && response.status == 404) 
            {
                return reject({'message':'Proxy does not exist!'});
            }
            else
            {
                return reject({'message': `Generice error: ${response.proxyData.message}`});
            }
        });
    });
    
}

/**
 * this function will check if the proxy is exist or not in case is exist will return all info of the proxy
 * {
 *  proxyName,
 *  basePath,
 *  resources[]
 * }
 * 
 * @param {String} proxyName 
 * @returns {JSON}
 */

function getProxyEndpoints(proxyName, orgName) {
    return new Promise((resolve,reject) => {
        isProxyNew(proxyName, orgName)
        .then((response) => {
            if(!response.isNew)  
            {
                downloadProxy(proxyName, response.proxyData, orgName)
                .then((zipFilePath) => {
                    extractProxyZip(zipFilePath).then((filePath) => {
                        resolve(getProxyEndpointsPath(filePath, proxyName));
                    });
                }).catch((err) => { return reject(err); });
            } 
            else if(response.isNew && response.status == 404) 
            {
                return reject({'message':'Proxy does not exist!'});
            }
            else
            {
                return reject({'message': `Generice error: ${response.proxyData.message}`});
            }
        });
    });
    
}

function getBasePathFromJsonFile(proxy) {
    try 
    {
        return proxy.ProxyEndpoint.HTTPProxyConnection.BasePath._text;
    }
    catch (err) 
    {
        return '/';
    }
}

/**
 * this function will read proxy file and generate array of string contain the condition of proxy endpoint
 * 
 * @param {String} filePath 
 * @param {String} proxyName 
 * @returns 
 */

function prepareGenerateOpenApi(filePath, proxyName) {
    const file = fs.readFileSync(`${filePath}/apiproxy/proxies/default.xml`,'utf8');
    let fileJson = JSON.parse(convert.xml2json(file,{compact: true, spaces: 4}));
    let apiBasePath = getBasePathFromJsonFile(fileJson);
    const flows = getFlows(fileJson);
    const apiStructure = getApiStructure(flows, proxyName, apiBasePath);
    return generateOpenApi(apiStructure, proxyName, apiBasePath);
}

/**
 * this function will read proxy file and generate array of string contain the condition of proxy endpoint
 * 
 * @param {String} filePath 
 * @param {String} proxyName 
 * @returns 
 */

function prepareGeneratePostmanColl(filePath, proxyName) {
    const file = fs.readFileSync(`${filePath}/apiproxy/proxies/default.xml`,'utf8');
    let fileJson = JSON.parse(convert.xml2json(file,{compact: true, spaces: 4}));
    let apiBasePath = getBasePathFromJsonFile(fileJson);
    const flows = getFlows(fileJson);
    const apiStructure = getApiStructure(flows, proxyName, apiBasePath);
    return generatePostmanColl(apiStructure,proxyName, apiBasePath);
}

/**
 * this function will return an object contain proxy name and base path and list of resource.
 * 
 * @param {String} filePath 
 * @param {String} proxyName 
 * @returns {JSON}
 */

function getProxyEndpointsPath(filePath, proxyName) {
    const file = fs.readFileSync(`${filePath}/apiproxy/proxies/default.xml`,'utf8');
    let fileJson = JSON.parse(convert.xml2json(file,{compact: true, spaces: 4}));
    let apiBasePath = getBasePathFromJsonFile(fileJson);
    const flows = getFlows(fileJson);
    return {
        "proxyName": proxyName,
        "basePath": apiBasePath,
        "resources": getApiStructure(flows)
    };
}


/**
 * this function will return api path and verb from condition field.
 * 
 * @param {List<String>} flows 
 * @param {String} proxyName 
 * @param {String} apiBasePath 
 * @returns 
 */

function getApiStructure(flows) {
    let apiStructure = [];
    var path;
    var verb;
    const rxVerb = /request.verb = "(.*?)"/g;
    const rxPath = /proxy.pathsuffix MatchesPath "(.*?)"/g;
    flows.forEach((flow) => {
        try
        {
            verb = flow.match(rxVerb);
            path = flow.match(rxPath);
            if(verb != null) {
                if(path != null) {
                    apiStructure.push({
                        path: path[0].split(rxPath)[1],
                        verb: verb[0].split(rxVerb)[1]
                    });
                }
            } 
        }
        catch(err)
        {

        }
    });
    return apiStructure;
}

function appendApiBasePathToServers(servers, apiBasePath) {
    const serversWithBasePath = [];
    for (let i = 0; i < servers.length; i++) {
        serversWithBasePath.push({
            "url": servers[i].url + apiBasePath
        })
    }
    return serversWithBasePath;
}

function generateOpenApi(apiStructure, proxyName, apiBasePath) {
    let openapi = {
        "openapi": "3.0.1",
        "info": {
            "title": proxyName,
            "version": "1.0",
            "contact": {
              "name": configuration.openapi.contact.name,
              "email": configuration.openapi.contact.email,
              "url": configuration.openapi.contact.url
            },
            "termsOfService": configuration.openapi.termsOfService,
            "description": `${proxyName} APIs`
          },
          "servers": appendApiBasePathToServers(configuration.openapi.servers, apiBasePath),
          "paths": {},
          "components": { "schemas": {} }
    }

    apiStructure.forEach((api) => {
        if(openapi.paths[api.path] == undefined) {
            openapi.paths[api.path] = {};
            openapi.paths[api.path][api.verb.toLowerCase()] = {
                "responses": { "200": { "description": "OK" } }
            };
        } else {
            openapi.paths[api.path][api.verb.toLowerCase()] = {
                "responses": { "200": { "description": "OK" } }
            };
        }
    });

    return openapi;
}

/**
 * this function will generate postman collection file from api path and verb
 * 
 * @param {List<Object>} apiStructure 
 * @param {String} proxyName 
 * @param {String} apiBasePath 
 * @returns {JSON} postman collection file
 */

function generatePostmanColl(apiStructure, proxyName, apiBasePath) {
    let collJson = {
        "info": {
            "_postman_id": uuid.v4(),
            "name": proxyName,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item":[]
    };

    apiStructure.forEach((api) => {
        collJson.item.push({
            "name": api.path,
            "request": {
                "method": api.verb,
                "url": {
					"raw": `{{apigee_url}}${apiBasePath}${api.path}`,
					"host": [
						"{{apigee_url}}"
					],
					"path": [
						apiBasePath + api.path
					]
				}
            }

        })
    });
    return collJson;
}

exports.proccessGeneratePostmanColl = proccessGeneratePostmanColl;
exports.proccessGenerateOpenApi = proccessGenerateOpenApi;
exports.getProxyEndpoints = getProxyEndpoints;
