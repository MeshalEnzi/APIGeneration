# API Generation
## The Fasts Way To Create Proxy

### What is API Generation?
API Generation is tool has been created by Integration team to help the team to develop APIs once it’s ready to expose it.

### How it’s work? 
At first it will validate the swagger file then it will extract the APIs and check if it’s already expose or not in case it’s not exposed it will add the new APIs to the proxy.


### how to use API Generation?
Simple API call to:
 - URL: POST https://{Internal-domain}/apigeneration/apiproxy
with the following inputs:
 - proxyName: The name of proxy you want to modify.
  - description: Describe the change you’re making.
 - organizationName: The name of the organization it has the proxy.
 - projectName: The name of project it owns the proxy ( please contact with Integration team to provide you with more details ).
 - swaggerFile: Openapi file has the APIs want to expose.

## Features

- create a new proxy from openapi
- add new APIs to existing proxy
- add policy to flow request and response
- add policy based on API security


## Installation

Dillinger requires [Node.js](https://nodejs.org/) v14+ to run.

Install the dependencies and devDependencies and start the server.

```sh
cd APIGeneration
npm i
node server
```

## License

MIT

**Free Software, Hell Yeah!**