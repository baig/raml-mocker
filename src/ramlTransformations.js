#!/usr/bin/env node

/** Author: Wasif Hasan Baig <pr.wasif@gmail.com> */

var _ = require('lodash');

////////////////////////////////////////////////////////////////////////////////

function _removeEscapedKeyFromResponses_(methodsArrayOfObjects) {
    _.each(methodsArrayOfObjects, function (methodsObj, idx) {
        _.each(methodsObj.responses, function (responseObj, key, col) {
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
function methodifyNested_(resourceArrayOfObjects) {
    'use strict';
    // List of all HTTP methods
    var methods = ["get", "patch", "put", "post", "delete", "head", "options"];
    _.each(resourceArrayOfObjects, function (resourceObj, idx, col) {
        _.each(_.pick(resourceObj, methods), function (val, key) {
            if (resourceObj.resources) methodifyNested_(resourceObj.resources)
            resourceObj.methods = [];
            resourceObj.methods.push(_.set(val, 'method', key));
            _removeEscapedKeyFromResponses_(resourceObj.methods)
        });
        col[idx] = _.omit(resourceObj, methods);
    });
}

////////////////////////////////////////////////////////////////////////////////

module.exports = {
    resourceifyNested: resourceifyNested,
    methodifyNested_: methodifyNested_,
    objectsHavingKeysWithSlash: objectsHavingKeysWithSlash
}
