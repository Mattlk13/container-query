import postcss from 'postcss';
import {
    WIDTH_UNIT,
    HEIGHT_UNIT,
    DEFINE_CONTAINER_NAME,
} from "../constants";
import containerQuery from './containerQuery';
import Root from "../../__mocks__/Root";
import Node from "../../__mocks__/Node";
jest.mock('./saveJSON');

// @todo test when an "element" of a @container {} query is actually a container itself, and certain properties should be prohibited

test('should use the default json saving function if none was supplied', () => {
    const saveJSON = require('./saveJSON').default;

    const pluginInstance = containerQuery();

    pluginInstance(
        (new Root({
            input: {
                file: 'file/path.css'
            }
        }))
    );

    expect(saveJSON).toHaveBeenCalledTimes(1);
});

test('missing container declaration', () => {
    const pluginInstance = containerQuery({ getJson: () => {} });

    expect(() => {
        pluginInstance(
            (new Root())
                .addNode(
                    new Node({
                        type: 'atrule',
                        name: 'container',
                        params: '(orientation: landscape)',
                    })
                )
        )
    }).toThrowError(new RegExp(`^A @container query was found, without a preceding @${DEFINE_CONTAINER_NAME} declaration.$`));
});

test('A container should not be able to ', () => {
    const pluginInstance = containerQuery({ getJson: () => {} });

    expect(() => {
        pluginInstance(
            (new Root())
                .addNode(
                    new Node({
                        type: 'atrule',
                        name: 'container',
                        params: '(orientation: landscape)',
                    })
                )
        )
    }).toThrowError(new RegExp(`^A @container query was found, without a preceding @${DEFINE_CONTAINER_NAME} declaration.$`));
});

test('proper json and css output', () => {
    let containersJSON = null;

    return postcss([ containerQuery({
            getJSON: (cssPath, json) => containersJSON = json
        }) ])
        .process(`
                .container {
                    @${DEFINE_CONTAINER_NAME};
                    border: none;
                    font-size: 50${HEIGHT_UNIT};
                    /* Ignore this */
                    line-height: 100${HEIGHT_UNIT};
                }

                @container (height >= 100) and (width >= 100) {
                    .container {
                        font-size: 70${HEIGHT_UNIT};
                    }
                }

                @container (height >= 100) {
                    .container {
                        background: none;
                    }
                    /* Ignore this */
                }

                /* Ignore this */

                .container2 {
                    @${DEFINE_CONTAINER_NAME}
                    font-size: 10px;
                    border: 1px solid;
                }

                .container2__element {
                    width: 50${WIDTH_UNIT};
                    height: 50${HEIGHT_UNIT};
                    background: green;
                }

                @container (orientation: portrait) {
                    .container2 {
                        font-size: 70${HEIGHT_UNIT};
                    }

                    .container2__element {
                        width: 75${WIDTH_UNIT};
                        height: 75${HEIGHT_UNIT};
                        background: red;
                    }
                }
            `, { from: 'src/app.css', to: 'dest/app.css' })
        .then(result => {
            expect(result.css).toEqual(`
                .container {
                    border: none;
                    /* Ignore this */
                }

                /* Ignore this */

                .container2 {
                    border: 1px solid;
                }

                .container2__element {
                    background: green;
                }
            `);

            expect(typeof containersJSON['.container']).toBe('object');
            expect(containersJSON['.container']).toEqual({
                selector: '.container',
                queries: [
                    {
                        "elements": [
                            {
                                "selector": ".container",
                                "styles": {
                                    "fontSize": "50" + HEIGHT_UNIT,
                                    "lineHeight": "100" + HEIGHT_UNIT,
                                    "background": "",
                                }
                            }
                        ]
                    },
                    {
                        "conditions": [
                            [ "height", ">=", "100" ],
                            [ "width", ">=", "100" ],
                        ],
                        "elements": [
                            {
                                "selector": ".container",
                                "styles": {
                                    "fontSize": "70" + HEIGHT_UNIT
                                }
                            }
                        ]
                    },
                    {
                        "conditions": [
                            [ "height", ">=", "100" ],
                        ],
                        "elements": [
                            {
                                "selector": ".container",
                                "styles": {
                                    "background": "none"
                                }
                            }
                        ]
                    }
                ]
            });

            expect(typeof containersJSON['.container2']).toBe('object');
            expect(containersJSON['.container2']).toEqual({
                "selector": ".container2",
                "queries": [
                    {
                        "elements": [
                            {
                                "selector": ".container2",
                                "styles": {
                                    "fontSize": ""
                                }
                            },
                            {
                                "selector": ".container2__element",
                                "styles": {
                                    "width": "50" + WIDTH_UNIT,
                                    "height": "50" + HEIGHT_UNIT,
                                    "background": ""
                                }
                            }
                        ]
                    },
                    {
                        "conditions": [
                            [
                                "orientation",
                                ":",
                                "portrait"
                            ]
                        ],
                        "elements": [
                            {
                                "selector": ".container2",
                                "styles": {
                                    "fontSize": "70" + HEIGHT_UNIT
                                }
                            },
                            {
                                "selector": ".container2__element",
                                "styles": {
                                    "width": "75" + WIDTH_UNIT,
                                    "height": "75" + HEIGHT_UNIT,
                                    "background": "red"
                                }
                            }
                        ]
                    }
                ]
            });
        });
});
