const { createFile, isEndpointExist, logging } = require('./utility.js');
const convert = require('xml-js');
const fs = require('fs');
const url = require('url');
const template = require('../template.json');


/**
 * this function will check if the new resource are exsit on the exist resources if so will remove the new resource from resources list
 * 
 * @param {List<String>} resources 
 * @param {List<String>} existResources 
 * @returns {List<String>}
 */

function removeExistingResource(resources, existResources) {
    let removedIndex = [];
    for (let i = 0; i < resources.length; i++) {
        // in case some endpoint accept all paths
        if (isEndpointExist(resources[i].path.replace(/\*.*/g, '**'), resources[i].httpMethod, existResources)) {
            removedIndex.push(resources[i]);
        }
        // in case some endpoints has two stars
        else if (isEndpointExist(resources[i].path.split('*').join('**'), resources[i].httpMethod, existResources)) {
            removedIndex.push(resources[i]);
        }
        else if (isEndpointExist(resources[i].path, resources[i].httpMethod, existResources)) {
            removedIndex.push(resources[i]);
        }
    }
    removedIndex.forEach((resource) => {
        resources.splice(resources.indexOf(resource), 1);
    });
    return resources;
}

/**
 * this function will insert all condition to list
 * 
 * @param {JSON} Proxy 
 * @returns {List<String>} 
 */

function getFlows(Proxy) {
    let flows = [];
    if (Proxy.ProxyEndpoint.Flows == undefined) return flows;
    if (Proxy.ProxyEndpoint.Flows.Flow == undefined) return flows;
    if (!Array.isArray(Proxy.ProxyEndpoint.Flows.Flow)) {
        flows.push(Proxy.ProxyEndpoint.Flows.Flow.Condition._text);
        return flows;
    }
    Proxy.ProxyEndpoint.Flows.Flow.forEach((flow) => {
        if(flow.Condition) 
            if(flow.Condition._text)
                flows.push(flow.Condition._text);
    });
    return flows;
}



/**
 * this function will create xml file in case the api proxy is new
 * and if proxy is not new will check if proxy endpoints already exsit 
 * if so then will return reject message { Proxy endpoints up to date! }
 * if not exsit will generate the new endpoints and add it to file
 * 
 * @param {String} filePath 
 * @param {JSON} api 
 * @param {boolean} isProxyNew 
 * @param {swaggerFile} openapi
 * @returns {Promise}
 */

function createFlowFile(filePath, api, isProxyNew, fields, openapi) {
    return new Promise((resolve, reject) => {
        createFile(`${filePath}/apiproxy/resources/jsc/swagger.json`,
        `openapi = ${JSON.stringify(openapi, null, 2)}\ncontext.setVariable("swagger", JSON.stringify(openapi));`
        )
        .catch((err) => reject(err));
        console.log(openapi)
        console.log(`is proxy new ? '${isProxyNew}'`);
        if (isProxyNew) {
            let temp = JSON.parse(JSON.stringify(template));
            const jsonKey = Object.keys(temp.proxy)[0];
            const resources = getResources(api.paths, api.security);
            temp.proxy[jsonKey].HTTPProxyConnection.BasePath._text = getApiBasePath(api);
            if (!Array.isArray(temp.proxy[jsonKey].Flows.Flow)) {
                temp.proxy[jsonKey].Flows.Flow = [temp.proxy[jsonKey].Flows.Flow];
            }
            createTagPolicies(filePath, 
                getAllSwaggerTags(resources), 
                fields.projectName)
            .catch((err) => { return reject(err) });
            createSecurityPolicies(filePath,
                getAllSecurityTags(resources))
            .catch((err) => { return reject(err) });
            temp.proxy[jsonKey].Flows.Flow = [...generateFlows(resources, fields.projectName), ...temp.proxy[jsonKey].Flows.Flow];
            createFile(
                `${filePath}/apiproxy/proxies/${temp.proxy[jsonKey]._attributes.name}.xml`,
                convert.json2xml(temp.proxy, { compact: true, spaces: 4 })
            )
            .catch((err) => {
                reject(err);
            });
            createProxyBundelFile( fields.proxyName , 
                `${filePath}/apiproxy/${fields.proxyName}.xml`,
                fields.description
            ).catch((err) => {
                reject(err);
            });
            preparePoliciesFiles(filePath)
                .catch((err) => reject(err));

            prepareTargetsFiles(filePath)
                .catch((err) => reject(err));
            resolve(filePath);
            
        }
        else {
            let resources = getResources(api.paths , api.security);
            const file = fs.readFileSync(`${filePath}/apiproxy/proxies/default.xml`, 'utf8');
            let fileJson = JSON.parse(convert.xml2json(file, { compact: true, spaces: 4, ignoreDeclaration: true}));
            const existResources = getFlows(fileJson);
            resources = removeExistingResource(resources, existResources);
            if (resources.length > 0) {
                const jsonKey = Object.keys(fileJson)[0];
                if (fileJson[jsonKey].Flows.Flow == undefined) {
                    fileJson[jsonKey].Flows.Flow = [];
                }
                else if (!Array.isArray(fileJson[jsonKey].Flows.Flow)) {
                    fileJson[jsonKey].Flows.Flow = [fileJson[jsonKey].Flows.Flow];
                }
                addDescriptionToProxyBundelFile(fields.proxyName, 
                    filePath, 
                    fields.description)
                .catch((err) => { return reject(err)});
                
                createTagPolicies(filePath, 
                    getAllSwaggerTags(resources), 
                    fields.projectName)
                .catch((err) => { return reject(err) });
                fileJson[jsonKey].Flows.Flow = [...generateFlows(resources, fields.projectName), ...fileJson[jsonKey].Flows.Flow];
                createFile(
                    `${filePath}/apiproxy/proxies/default.xml`,
                    convert.json2xml(fileJson, { compact: true, spaces: 4 })
                ).then(() => resolve(filePath))
                    .catch((err) => {
                        reject(err);
                    });
            }
            else {
                return reject({ 'message': 'Proxy endpoints up to date!' });
            }
        }
    });

}


/**
 * this function will return all security tags has been addedd to api paths (without duplicate)
 * @param {List<Object>} resources 
 * @returns {List<String>}
 */

 function getAllSecurityTags(resources) {
    let security = [];
    resources.forEach((resource) => {
        security = [...security, ...resource.security];
    });
    security = security.filter((value, index) => security.indexOf(value) === index);
    return security;
}

/**
 * this function will return all tags has been addedd to api paths (without duplicate)
 * @param {List<Object>} resources 
 * @returns {List<String>}
 */

function getAllSwaggerTags(resources) {
    let tags = [];
    resources.forEach((resource) => {
        tags = [...tags, ...resource.tags];
    });
    tags = tags.filter((value, index) => tags.indexOf(value) === index);
    return tags;
}


/**
 * this function will create policy file from template tags if not exist 
 * 
 * @param {String} filePath 
 * @param {List<String>} tags 
 * @param {String} projectName 
 * @returns {Promise}
 */
function createTagPolicies(filePath, tags, projectName) {
    return new Promise((resolve, reject) => {
        if (template.tags[projectName] == undefined) return resolve();
        const temp = template.tags[projectName];
        tags.forEach((tag) => {
            if (temp[tag] != undefined) {
                temp[tag].request.forEach((step) => {
                    const fileName = step.policy[Object.keys(step.policy)[0]]._attributes.name;
                    if( !fs.existsSync(`${filePath}/apiproxy/policies/${fileName}.xml`) )
                    {
                        createFile(`${filePath}/apiproxy/policies/${fileName}.xml`,
                            convert.json2xml(step.policy, { compact: true, spaces: 4 })
                        ).catch((err) => {
                            reject(err);
                        });
                    }
                });
                temp[tag].response.forEach((step) => {
                    const fileName = step.policy[Object.keys(step.policy)[0]]._attributes.name;
                    if( !fs.existsSync(`${filePath}/apiproxy/policies/${fileName}.xml`) )
                    {
                        createFile(`${filePath}/apiproxy/policies/${fileName}.xml`,
                        convert.json2xml(step.policy, { compact: true, spaces: 4 })
                        ).catch((err) => {
                            reject(err);
                        });
                    }
                });
            }
        });
    });
}

/**
 * this function will create policy file from template tags if not exist 
 * 
 * @param {String} filePath 
 * @param {List<String>} tags 
 * @returns {Promise}
 */
 function createSecurityPolicies(filePath, tags) {
    return new Promise((resolve, reject) => {
        if (template.security == undefined) return resolve();
        const temp = template.security;
        tags.forEach((tag) => {
            if (temp[tag] != undefined) {
                const fileName = temp[tag].policy[Object.keys(temp[tag].policy)[0]]._attributes.name;
                if( !fs.existsSync(`${filePath}/apiproxy/policies/${fileName}.xml`) )
                {
                    createFile(`${filePath}/apiproxy/policies/${fileName}.xml`,
                        convert.json2xml(temp[tag].policy, { compact: true, spaces: 4 })
                    ).catch((err) => {
                        reject(err);
                    });
                }
            }
        });
    });
}


/**
 * this function will check if the base path is exist if so it will return the base path, if not then will extract the base path from the server
 * 
 * @param {JSON} api 
 * @returns {String}
 */
function getApiBasePath(api) {
    if (api.basePath != undefined) return api.basePath; // in case the api is 2.0
    if (api.servers == undefined) return '/';
    if (api.servers.length < 1) return '/';
    return url.parse(api.servers[0].url).pathname;
}


/**
 * 
 * @param {String} ApiProxyName 
 * @returns {Promise}
 */
function createProxyBundelFile(ApiProxyName, fileName, description) {
    return new Promise((resolve, reject) => {
        try {
            const templateProxyInfo = {
                "APIProxy": {
                    "_attributes": {
                        "name": ApiProxyName
                    },
                    "Description": {
                        "_text": description
                    }
                }
            };
            createFile(fileName,
                convert.json2xml(templateProxyInfo, { compact: true, spaces: 4 }))
                .then((fileName) => {
                    resolve(fileName);
                })
                .catch((err) => {
                    reject(err);
                });
        }
        catch (err) {
            reject(err);
        }
    });
}

function addDescriptionToProxyBundelFile(proxyName, filePath, description) {
    return new Promise((resolve, reject) => {
        try {
            const file = fs.readFileSync(`${filePath}/apiproxy/${proxyName}.xml`, 'utf8');
            let fileJson = JSON.parse(convert.xml2json(file, { compact: true, spaces: 4, ignoreDeclaration: true}));
            fileJson.APIProxy.Description._text = description;
            createFile(`${filePath}/apiproxy/${proxyName}.xml`,
                convert.json2xml(fileJson, { compact: true, spaces: 4 }))
                .then((fileName) => {
                    resolve(fileName);
                })
                .catch((err) => {
                    reject(err);
                });
        }
        catch (err) {
            reject(err);
        }
    });
}

/**
* this function will generate resource from api path and api http methode 
*
* @param {JsonObject} pathJson 
* @returns {List<String>}
*/
function getResources(pathJson, securityTag) {
    const allowedMethods = ["PATCH", "DELETE", "POST", "PUT", "HEAD", "GET", "OPTIONS"];
    var resources = [];
    Object.keys(pathJson)
        .forEach(
            function (path) {
                Object.keys(pathJson[path])
                    .forEach(
                        function (method) {
                            let httpMethod = method.toUpperCase();
                            if(allowedMethods.indexOf(httpMethod) != -1) 
                            {
                                resources.push(
                                    {
                                        name: path,
                                        path: path.split(/{[A-Za-z0-9-_]*}/g).join('*'), // /{[A-Za-z0-9-_]*}/g: this regex will convert any path parmater to star 
                                        httpMethod: httpMethod,
                                        tags: getTags(pathJson[path][method]),
                                        security: getPathSecurity(pathJson[path][method], securityTag)
                                    }
                                )
                            }
                        }
                    )

            }
        )
    return resources;
}

/**
 * if the path doesn't have security tag will check the open api security tag otherwise will take the path security tag.
 * @param {JSONObject} apiPath all open api paths
 * @param {List<Object>} apiSecurityTag open api securitry tag
 * @returns {List<Object>}
 */

function getPathSecurity(apiPath, apiSecurityTag) {
    if(apiPath.security == undefined) {
        if(apiSecurityTag == undefined ) return [];
        var apiSecurity = [];
        apiSecurityTag.forEach((securityTag) => {
            console.log(Object.keys(securityTag));
            apiSecurity = [ ...apiSecurity, ...Object.keys(securityTag)];
        });
        return apiSecurity;
    } else if (apiPath.security.length == 0){
        if(apiSecurityTag == undefined ) return [];
        var apiSecurity = [];
        apiSecurityTag.forEach((securityTag) => {
            console.log(Object.keys(securityTag));
            apiSecurity = [ ...apiSecurity, ...Object.keys(securityTag)];
        });
        return apiSecurity;
    }
    let security = [];
    apiPath.security.forEach((path) => {
        security = [ ...security, ...Object.keys(path)];
    });
    security = security.filter((value, index) => security.indexOf(value) === index);
    console.log(security);
    return security;
}

/**
 * this function will retrun list<String> contain all tags if exist
 * 
 * @param {JSON} apiPath tags section inside api path
 */

function getTags(apiPath) {
    if (apiPath.tags == undefined) return [];
    return apiPath.tags;
}


/**
* this function will generate proxy endpoint flow in json format from the resources then will convert json to xml
*
* @param {json} resources 
* @param {boolean} isNew 
* @returns {String} in xml format
*/
function generateFlows(resources, projectName) {
    let apis = [];
    resources.forEach(function (resource) {
        apis.push({
            '_attributes': { 'name': resource.httpMethod == 'GET' ? resource.name : `${resource.httpMethod} ${resource.name}` },
            'Description': {},
            'Request': { "Step": [ ...getPoliciesBasedOnSecurity(resource), ...getPoliciesBasedOnTags(resource, projectName, "request")] } ,
            'Response': { "Step": getPoliciesBasedOnTags(resource, projectName, "response") },
            'Condition': {
                '_text': `(proxy.pathsuffix MatchesPath "${resource.path}") and (request.verb = "${resource.httpMethod}")`
            }
        });
    });
    return apis;
    // return convert.json2xml(JSON.stringify({'Flow': apis}),{compact: true, spaces: 4});
}


/**
 * based on the security tag from the swagger file the function will add policy to the request step
 * if the prject is supported then the admin will need to setup the project config in configration 
 * based on the tag will generate the policy also if the the endpoint has more than one tags will add them all to Step list
 * 
 * @param {JOSN} resource 
 * @returns 
 */

function getPoliciesBasedOnSecurity(resource) {
    let temp = JSON.parse(JSON.stringify(template.security));
    let steps = [];
    resource.security.every((tag) => {
        if( temp[tag] != undefined ) {
            let stepName = temp[tag].policy[Object.keys(temp[tag].policy)[0]]._attributes.name;
            let policy = {
                "Name": {
                    "_text": stepName
                }
            }
            if (temp[tag].Condition.trim().length > 0) // to check if the Condition is not empty 
                policy.Condition = { "_text": temp[tag].Condition };
            steps.push(policy);
        }   
    });
    return steps;
}

/**
 * based on the tags from the swagger file the function will add policy to the request and response step
 * if the prject is supported then the admin will need to setup the project config in configration 
 * based on the tag will generate the policy also if the the endpoint has more than one tags will add them all to Step list
 * 
 * @param {JOSN} resource 
 * @param {String} projectName 
 * @param {request|response} position 
 * @returns 
 */

function getPoliciesBasedOnTags(resource, projectName, position) {
    if (projectName == "NoPolicy") return []; // will not add any policy 
    let temp = JSON.parse(JSON.stringify(template.tags));
    if (temp[projectName] == undefined) return []; // the project is not supported.
    let steps = [];
    resource.tags.every((tag) => {
        if (temp[projectName][tag] == undefined) return {};
        if (temp[projectName][tag][position] == undefined) return {};
        temp[projectName][tag][position].forEach((step) => {
            let stepName = step.policy[Object.keys(step.policy)[0]]._attributes.name;
            let policy = {
                "Name": {
                    "_text": stepName
                }
            };
            if (step.Condition.trim().length > 0) // to check if the Condition is not empty 
                policy.Condition = { "_text": step.Condition };
            steps.push(policy);
        });
    });
    return steps;
}


/**
 * this function will create policy file from template.
 * 
 * @param {String} filePath 
 * @returns 
 */

function preparePoliciesFiles(filePath) {
    return new Promise((resolve, reject) => {
        try {
            template.policies.forEach((policy) => {
                let jsonKey = Object.keys(policy)[0];
                createFile(`${filePath}/apiproxy/policies/${policy[jsonKey]._attributes.name}.xml`, convert.json2xml(policy, { compact: true, spaces: 4 }))
                    .catch((err) => reject(err));
            });
            resolve();
        }
        catch (err) {
            reject(err);
        }
    });
}

/**
 * this function will create target file from template.
 * 
 * @param {String} filePath 
 * @returns {Promise}
 */

function prepareTargetsFiles(filePath) {
    return new Promise((resolve, reject) => {
        try {
            template.targets.forEach((targets) => {
                let jsonKey = Object.keys(targets)[0];
                createFile(`${filePath}/apiproxy/targets/${targets[jsonKey]._attributes.name}.xml`, convert.json2xml(targets, { compact: true, spaces: 4 }))
                    .catch((err) => reject(err));
            });
            resolve();
        }
        catch (err) {
            reject(err);
        }
    });
}

exports.removeExistingResource = removeExistingResource;
exports.getFlows = getFlows;
exports.createFlowFile = createFlowFile;
exports.createProxyBundelFile = createProxyBundelFile;
exports.generateFlows = generateFlows;
exports.getResources = getResources;
exports.preparePoliciesFiles = preparePoliciesFiles;
exports.prepareTargetsFiles = prepareTargetsFiles;