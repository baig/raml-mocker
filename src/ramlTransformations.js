#!/usr/bin/env node

/** Author: Wasif Hasan Baig <pr.wasif@gmail.com> */

var _ = require('lodash');

////////////////////////////////////////////////////////////////////////////////

function wrapObjectInsideAnObject (nameOfKey, objectToWrap) {
    return { [nameOfKey]: objectToWrap };
}

// TODO: rename function
// This function is doing more than just renaming response codes.
function _removeEscapedKeyFromResponses_(methodsArrayOfObjects, schemasArray) {
    _.each(methodsArrayOfObjects, function (methodsObj, idx) {
        _.each(methodsObj.responses, function (responseObj, key, col) {
            if ( _.isEqual( _.keys(responseObj.body), ['schema','example']) ) {
                responseObj.body = wrapObjectInsideAnObject('application/json', responseObj.body)
            }
            // Recursively substituting `schema` name with actual JSON string
            _.each(responseObj.body, function(bodyObj, key) {
                if (bodyObj.schema) {
                    bodyObj.schema = _.filter(schemasArray, bodyObj.schema)[0][bodyObj.schema]
                }
            })
            col[key.slice( '__$EscapedKey$__'.length )] = responseObj
            delete(col[key])
        });
    });
}

// Reduces the object to only keys starting with `/` (forward slashes).
// Note: keys starting with forward slashes are resources (REST endpoints)
function objectsHavingKeysWithSlash(apiJsObject) {
    return _.pick(apiJsObject, function (val, key) {
        if (_.startsWith(key, '/')) return key;
    });
}

// Recursively adds the resources to an array in the JSON representation of RAML
// Object while adding `relativeUri` key
function resourceifyNested(resourceObj) {
    'use strict';
    var list = [];
    _.each(resourceObj, function (val, key, col) {
        if (!_.isEmpty(resourceObj)) {
//            val = _.set(val, 'relativeUri', key)
            // Setting key as `relativeUri` in the `val` array and appending it to `list`.
            list.push(_.set(_.omit(_.set(_.set(val, 'relativeUri', key), 'relativeUriPathSegments', [key.slice(1)]), function (val, key) {
                // Omitting keys starting with `/` (forward slashes)
                if (_.startsWith(key, '/')) return key;
            }), 'resources', resourceifyNested(objectsHavingKeysWithSlash(val))));
        }
    });
    return list
}

// Have side effects
// multiple concerns
function methodifyNested_(resourceArrayOfObjects, schemasArray) {
    'use strict';
    // List of all HTTP methods
    var methods = ["get", "patch", "put", "post", "delete", "head", "options"];
    _.each(resourceArrayOfObjects, function (resourceObj, idx, col) {
        _.each(_.pick(resourceObj, methods), function (val, key) {
            if (resourceObj.resources) methodifyNested_(resourceObj.resources, schemasArray)
            resourceObj.methods = [];
            resourceObj.methods.push(_.set(val, 'method', key));
            _removeEscapedKeyFromResponses_(resourceObj.methods, schemasArray)
        });
        col[idx] = _.omit(resourceObj, methods);
    });
}

// Generate JSON schema from `types` object in RAML.
// RAML Types -> RAML JSON Schemas
function generateJsonSchemasFromRamlTypes (ramlTypesObject) {
    'use strict';
    
    var list = [];
    _.each(ramlTypesObject, function (val, key, col) {
        if ( _.endsWith(val.type, '[]') ) val = expandArrayType(val, col)
//            = expandArrayType (key)
        
        list.push({
            [key]: JSON.stringify(removeRoundBracketsFromKeys(val))
        });
    });
    return list;
    
    // Expand array types to objects
    function expandArrayType (obj, ramlTypesObject) {
        'use strict';
        var obj = ramlTypesObject[obj.type.slice(0,-2)]
        var objs = {
            type: 'array',
            '$schema': obj['$schema'],
            items: (function() {
                delete(obj['$schema']);
                return obj;
            }()),
        }
        return objs;
    }
    
    // Recursively remove round brackets from the object keys.
    // Usually `$schema` and `format`
    function removeRoundBracketsFromKeys (obj) {
        'use strict';
        _.each(obj, function(val, key) {
            if (_.isObject(val)) removeRoundBracketsFromKeys(val)
            else {
                if ( _.startsWith(key, '(') && _.endsWith(key, ')') ) {
                    obj[key.slice(1,-1)] = obj[key]
                    delete(obj[key])
                }
            }
        });
        return obj;
    }
}


////////////////////////////////////////////////////////////////////////////////

module.exports = {
    resourceifyNested: resourceifyNested,
    methodifyNested_: methodifyNested_,
    objectsHavingKeysWithSlash: objectsHavingKeysWithSlash,
    generateJsonSchemasFromRamlTypes: generateJsonSchemasFromRamlTypes
}
