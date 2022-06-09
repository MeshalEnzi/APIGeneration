const fs = require('fs');
const configuration = require('../Configuration.json');
/**
 * 
 * @param {String} fileName 
 * @param {String} data 
 * @returns {Promise} 
 */
 async function createFile(fileName, data) {
    return new Promise((resolve, reject) => {
        try {
            const dir = (fileName.split('/')).slice(0,-1).join('/');
            if( !fs.existsSync(dir) ){
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fileName, data, 'utf8');
            resolve(fileName);
        }
        catch(err) {
            reject(err);
        }
    });
}

/**
 * this function will check if the request fields contain all required fields 
 * if not will return an error
 * 
 * @param {Object} fields 
 * @returns {Promise}
 */
 async function validateRequestFields(fields) {
    return new Promise((resolve, reject) => {
        try {
            /**
             * proxyName: The name of proxy want to modify.
             * projectName: if u have multi projects on the config file.
             * description: description of the changes on the proxy.
             * organizationName: if u have multi organizations on config file.
             */
            const requierdFields = ['proxyName','projectName', 'description', 'organizationName'];
            let requestFields = Object.keys(fields);
            requierdFields.forEach((field) => {
                if(!requestFields.includes(field)) 
                {
                    reject({'message': `Missing Requierd Fields! { ${field} }`})
                }
            });
            resolve(requestFields);
        }
        catch(err)
        {
            reject(err);
        }
    });
}


/**
 * this function will return true if the two string are exsit on the same index for example:
 * array : ['Meshal is developer','Meshal is software engineer']
 * string1 : Meshal
 * string2 : developer
 * returns : true, because the first index contain both strings.
 * 
 * @param {String} string1 
 * @param {String} string2 
 * @param {List<String>} array 
 * @returns {boolean}
 */

 function isEndpointExist(string1, string2, array) {
    for(let i = 0; i < array.length; i++) 
    {
        // remove the space or taps then split on ( , ) 
        let condition = array[i].split(/\s\s+/g).join(' ').split(/\(|\)/g);
        condition = condition.filter(e => e.trim())
        // ignoring path case
        if(condition[0].trim().toUpperCase() == `proxy.pathsuffix MatchesPath "${string1}"`.toUpperCase()) 
        {
            if(condition.length > 1) // if the length < 1 that's mean it's accept all http verbs
            {
                if(condition[1].trim() == 'and')
                {
                    if(condition[2].trim() == `request.verb = "${string2}"`)
                    {
                        return true;
                    }
                }
            }
            else
            {
                return true;
            }
        }
    }
    return false;
}


/**
* 
* @param {String} proxyName 
* @param {String} funName 
* @param {String} status 
* @param {String} errMessage
*/
function logging(proxyName,funName,status,errMessage) {
    console.log(JSON.stringify({
        'proxyName' : proxyName,
        'step':funName,
        'status': status,
        'errMessage': errMessage
    }));
}

/**
 * 
 * @param {String} organizationName 
 * @param {String} organizationType
 * @returns {String}
 */
function getOrganization(organizationName, organizationType) {
    // if the org not exist will take the default.
    if( configuration.organizations[organizationType][organizationName.toLowerCase()] == undefined )
        return configuration.organizations[organizationType].default;
    return configuration.organizations[organizationType][organizationName.toLowerCase()];
}


exports.createFile = createFile;
exports.validateRequestFields = validateRequestFields;
exports.isEndpointExist = isEndpointExist;
exports.logging = logging;
exports.getOrganization = getOrganization;