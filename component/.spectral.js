const {oas: oas} = require("@stoplight/spectral-rulesets");
const {truthy: truthy, schema: schema, casing: casing} = require("@stoplight/spectral-functions");
module.exports = {
  "extends": oas,
  "rules": {
    "openapi-version-rule": {
      "description": "File must be following OpenAPI 3.",
      "severity": "error",
      "given": "$",
      "then": {
        "field": "openapi",
        "function": truthy
      }
    },
    "OpenAPI-info-rule": {
      "description": "OpenAPI must have info section.",
      "severity": "error",
      "given": "$",
      "then": {
        "field": "info",
        "function": truthy
      }
    },
    "info-title-rule": {
      "description": "info must have a title.",
      "severity": "error",
      "given": "$.info",
      "then": {
        "field": "title",
        "function": truthy
      }
    },
    "info-description-rule": {
      "description": "info must have a description.",
      "severity": "error",
      "given": "$.info",
      "then": {
        "field": "description",
        "function": truthy
      }
    },
    "info-contact-rule": {
      "description": "info must have a contact.",
      "severity": "error",
      "given": "$.info",
      "then": {
        "field": "contact",
        "function": truthy
      }
    },
    "info-version-rule": {
      "description": "info must have a version.",
      "severity": "error",
      "given": "$.info",
      "then": {
        "field": "version",
        "function": truthy
      }
    },
    "OpenAPI-tags-rule": {
      "description": "OpenAPI must have tag section.",
      "severity": "error",
      "given": "$",
      "then": {
        "field": "tags",
        "function": truthy
      }
    },
    "tags-description-rule": {
      "description": "Tags must have a description.",
      "severity": "error",
      "given": "$.tags[*]",
      "then": {
        "field": "description",
        "function": truthy
      }
    },
    "OpenAPI-servers-rule": {
      "description": "OpenAPI must have servers section.",
      "severity": "error",
      "given": "$",
      "then": {
        "field": "servers",
        "function": truthy
      }
    },
    "servers-url-rule": {
      "description": "servers must have urls.",
      "severity": "error",
      "given": "$",
      "then": {
        "field": "servers",
        "function": schema,
        "functionOptions": {
          "schema": {
            "items": {
              "type": "object"
            },
            "minItems": 1,
            "type": "array"
          }
        }
      }
    },
    "OpenAPI-security-rule": {
      "description": "OpenAPI must have security section.",
      "severity": "error",
      "given": "$",
      "then": {
        "field": "security",
        "function": truthy
      }
    },
    "paths-kebab-case-name-rule": {
      "description": "paths should be kebabCased.",
      "message": "Paths is not named in kebab case: {{path}}",
      "type": "style",
      "severity": "error",
      "given": "$.paths[*]",
      "then": {
        "function": casing,
        "functionOptions": {
          "type": "kebab",
          "separator": {
            "char": "/",
            "allowLeading": true
          }
        }
      }
    },
    "path-property-camel-case-name-rule": {
      "description": "Name should be camelCased.",
      "message": "Property is not named in camel case: {{path}}, {{property}}",
      "type": "style",
      "severity": "warn",
      "given": "$..[?(@.type === 'object' && @.properties)].properties.*~",
      "then": {
        "function": casing,
        "functionOptions": {
          "type": "camel"
        }
      }
    },
    "path-property--description-rule": {
      "description": "property must have a description.",
      "message": "Property does not have description: {{path}}, {{property}}",
      "severity": "error",
      "given": "$..[?(@.type === 'object' && @.properties)].properties.*",
      "then": {
        "field": "description",
        "function": truthy
      }
    },
    "path-parameter-camel-case-name-rule": {
      "description": "Name should be camelCased.",
      "message": "Parameter is not named in camel case: {{path}}, {{property}}",
      "type": "style",
      "severity": "warn",
      "given": "$..parameters.*.name",
      "then": {
        "function": casing,
        "functionOptions": {
          "type": "camel"
        }
      }
    },
    "path-parameter-description-rule": {
      "description": "parameter must have a description.",
      "message": "Parameter does not have description : {{path}}, {{property}}",
      "severity": "error",
      "given": "$..parameters.*",
      "then": {
        "field": "description",
        "function": truthy
      }
    },
    "oas3-parameter-description": "error",
    "operation-success-response": "error",
    "oas3-server-not-example.com": "error",
    "oas3-server-trailing-slash": "error",
    "path-keys-no-trailing-slash": "error"
  }
};
