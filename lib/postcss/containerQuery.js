'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _lodash = require('lodash.trim');

var _lodash2 = _interopRequireDefault(_lodash);

var _lodash3 = require('lodash.camelcase');

var _lodash4 = _interopRequireDefault(_lodash3);

var _utils = require('./utils');

var _unit_constants = require('../unit_constants');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @param {String} value
 *
 * @returns {boolean}
 */
function isValueUsingContainerUnits(value) {
    return value.indexOf(_unit_constants.HEIGHT_UNIT) !== -1 || value.indexOf(_unit_constants.WIDTH_UNIT) !== -1;
}

/**
 * Creates a styles object that contains only css declarations that use
 * container units.
 */
function extractContainerUnitStylesFromRule(ruleNode, isContainer) {
    var styles = {};

    ruleNode.nodes.forEach(function (node) {
        if (node.type !== 'decl' || !isValueUsingContainerUnits(node.value)) {
            return;
        }

        if (isContainer && ['width', 'height'].indexOf(node.prop) !== -1) {
            // @todo more helpful message here
            throw new Error('A container cannot use container units for its width and/or height properties.');
        }

        styles[(0, _lodash4.default)(node.prop)] = node.value;
    });

    return styles;
}

function addStylesToDefaultQuery(defaultElementRef, styles) {
    var keepValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    for (var prop in styles) {
        if (typeof defaultElementRef.styles[prop] !== 'undefined') {
            continue;
        }

        defaultElementRef.styles[prop] = keepValues ? styles[prop] : '';
    }
}

function getConditionsFromQueryParams(params) {
    var conditionArr = params.match(/\(([^\)]*)\)/g);
    return conditionArr.map(function (condition) {
        var conditionArr = (0, _lodash2.default)(condition, '()');

        conditionArr = conditionArr.match(/([a-z]*)([ :><=]*)([a-z0-9]*)/i);
        conditionArr.shift();

        conditionArr = conditionArr.map(_lodash2.default);

        return conditionArr;
    });
}

function getStylesObjectFromNodes(nodes) {
    var styles = {};

    nodes.forEach(function (node) {
        if (node.type !== 'decl') {
            return;
        }

        styles[(0, _lodash4.default)(node.prop)] = node.value;
    });

    return styles;
}

function isEmptyObject(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }

    return true;
}

/**
 * @type {{ JSONSavePath: string }}
 */
function containerQuery(options) {
    return function (root) {
        options = options || {};

        var containers = {};
        var currentContainerSelector = null;
        var currentDefaultQuery = null;
        var currentDefaultQueryMap = null;

        function getElementRefBySelector(selector) {
            if (typeof currentDefaultQueryMap[selector] === 'undefined') {
                var elementRef = {
                    selector: selector,
                    styles: {}
                };

                currentDefaultQuery.elements.push(elementRef);
                currentDefaultQueryMap[selector] = elementRef;
            }

            return currentDefaultQueryMap[selector];
        }

        function flushCurrentContainerData() {
            var newContainer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;

            if (currentContainerSelector !== null) {
                containers[currentContainerSelector].queries.unshift(currentDefaultQuery);
            }
            if (newContainer !== null) {
                containers[newContainer] = {
                    selector: newContainer,
                    queries: []
                };
            }
            currentDefaultQuery = { elements: [] };
            currentDefaultQueryMap = {};

            currentContainerSelector = newContainer;
        }

        root.walk(function (node) {
            if (node.type === 'rule') {
                // Check if there's a @define-container declaration in the rule
                var newContainer = (0, _utils.detectContainerDefinition)(node);
                if (newContainer !== null) {
                    flushCurrentContainerData(newContainer);
                }

                if (currentContainerSelector !== null) {
                    // Process potential container unit usages to the default query
                    addStylesToDefaultQuery(getElementRefBySelector(node.selector), extractContainerUnitStylesFromRule(node, newContainer !== null), true);
                }
            } else if (node.type === 'atrule' && node.name === 'container') {
                if (currentContainerSelector === null) {
                    // @todo be more specific
                    // throw new Error('A @container query was found, without preceding @define-container declaration.');
                } else {

                    var query = {
                        conditions: getConditionsFromQueryParams(node.params),
                        elements: []
                    };

                    node.nodes.forEach(function (elementRule) {
                        if (elementRule.type !== 'rule') {
                            return;
                        }

                        // @todo check here if the "element" is the container itself, and then don't allow width / height container units
                        var element = {
                            selector: elementRule.selector,
                            styles: getStylesObjectFromNodes(elementRule.nodes)
                        };

                        if (!isEmptyObject(element.styles)) {
                            addStylesToDefaultQuery(getElementRefBySelector(elementRule.selector), element.styles);

                            query.elements.push(element);
                        }
                    });

                    if (query.elements.length > 0) {
                        containers[currentContainerSelector].queries.push(query);
                    }
                }
            }
        });

        flushCurrentContainerData();

        options.getJSON(containers);
    };
}

exports.default = _postcss2.default.plugin('postcss-container-query', containerQuery);