# LML - List Markup Language

LML is a simplified JSON-based language to represent HTML (or JSX) data in JSON responses, as an alternative
to server-side rendering.

LML was designed to be
- easy to read/write for humans compared to an HTML Abstract Syntax Tree
- fast to parse and transform on the browser side
- framework agnostic, not bound to any server-side technology and cross platform (can be also used in mobile native apps)

A live LLM usage can be viewed throuth the [DPA demo] application.

Main benefits:
- possibility to process an HTML response as JSON content prior to rendering (e.g. remove/transform elements, pick a subset to implement pagination, etc.)
- safe HTML: the LML library sanitizes LML content when processed (cf. ```lml2jsx()``` util)
- possibility to mix LML content with structured data (e.g. JSON list containing LML nodes that can contain JSON data as node attributes)
- possibility to reference components
- possibility to assign components to namespaces (and implement bundle lazy loading, like in the [DPA demo])
- possibility to pass LML content as component attributes
- possibility to support richer HTML syntax (e.g. decorators, tagged children blocks)
- same size as HTML in average (when uncompressed)


## Example

```typescript
// Text node
const ex1: LML =
    // Hello World
    "Hello World";
// Span, no attribues -> # prefix for elements
const ex2: LML =
    // <span class="hello"> Hello <em> World! </em></span>
    ["#span.hello", "Hello", ["#em", "World!"]]
// Span with attributes
const ex3: LML =
    // <span class="hello" "title"="Greetings!"> Hello <em> World! </em></span>
    ["#span.hello", { "title": "Greetings" }, "Hello", ["#em", "World!"]]
// Fragment
const ex4: LML =
    // <Fragment><em>Hello</em>World!</Fragment>
    [["#em", "Hello"], "World!"]
// Component -> * prefix for elements
const ex5: LML =
    // <MyCpt className="abc" title="..."> Some <span class="em">content...</span> </MyCpt>
    ["*MyCpt.abc", { "title": "..." }, " Some ", ["#span.em", "content... "]]
// Node with type, id and empty attribute (here: checked - value will be ignored)
const ex6: LML =
    // <input type="checkbox" class="abc" id="subscribeNews" name="subscribe" value="newsletter" disabled />
    ["#input+checkbox.abc", { "id": "subscribeNews", "name": "subscribe", "value": "newsletter", "disabled": true }]
// Advanced component with bundle id + JSON and LML attributes
const ex7: LML =
    ["*b:MyCpt!abc-def-ghi", { // b = bundle id  key = abc-def-ghi
        "logo": ["*c:img", { "height": 22, "width": 22, "src": "..." }],
        "columnWidths": [1, 2, 3, 4]
    },
        ["#span.hello", "Some ", ["#em", "content..."]]
    ]
```

## Syntax

LML support 3 node types: **text nodes**, **fragments** and **element/component nodes**:
- *text nodes* are represented as strings
- *elements* and *components* are represented as Arrays
- *fragments* are represented as Arrays (of strings or Arrays)

As such, the only part to memorize is the element node structure:
- the **first item** in an element node contains the element type and name (that can be complemented with a few frequently
used attributes: type, class elements and key)
- the **second item** is optional and can be a JSON object containing the element attributes
- the **next items** (starting from position 1 or 2 depending on attributes) are the element child nodes

```typescript
// Element with no attributes and two child nodes
const el1 = ["#span", "Hello", ["#span.b", "World"]];
// Element with attributes and one childe node
const el2 = ["#div", {"title": "Greetings", "class": "header greeting"}, "Hello World"];
// Same element with the class elements shortcut in the element name
const el3 = ["#div.header.greeting", {"title": "Greetings"}, "Hello World"];
// Component -> different prefix (i.e. * instead of #)
const el3 = ["*section.header.greeting", {"title": "Greetings"}, "Hello World"];
```

The element name is composed of 6 parts:

1. the element **type**: # for html tags and * for components (other key words are reserved) - e.g. "*"
2. [optional] the element **namespace** - e.g. "c:"
3. the element name (cannot contain "+" or "." or "!")
4. [optional] the element **type attribute** (useful for input elements) - e.g. "+text"
5. [optional] several **class elements** - e.g. ".foo.bar"
6. [optional] a **key attribute** - useful for React rendering or top manage document updates (cf. below) - e.g. "!abc-def-ghi". Keys can contain any character, this is why they come last.

```typescript
// Element name:
// [#|*|!|@] [namespace:?] [nodename] [+typeattribute?] [.classattributes*] [!keyattribute?]
export const RX_NODE_NAME = /^(\#|\*|\!|\@)(\w+\:)?([\w\-]+)(\+[\w\-]+)?(\.[\.\w\-]+)*(\!.+)?$/;
```

## APIs

Apart from the LML types, the LML library provide the following APIs:

### ```nodeType()```

Return the type of an LML node:

```typescript
function nodeType(content: LML): LmlNodeType {}

type LmlNodeType = "text" | "element" | "component" | "fragment" | "invalid";

// examples
expect(nodeType("Hello")).toBe("text");
expect(nodeType(["#span", "Hello"])).toBe("element");
expect(nodeType([["#span", "b"]])).toBe("fragment");
expect(nodeType(["*cpt", "Hello"])).toBe("component");
expect(nodeType(["!x", "Hello"])).toBe("invalid");
```



### ```lml2jsx()``` / ```defaultSanitizationRules```

Convert an LML structure to a JSX tree through a createElement function that must be passed as argument. The JSX tree is also sanitized.

```typescript
function lml2jsx(v: LML,
    createElement: (type: any | Function, props: { [key: string]: any }, ...children: any) => JSX.Element,
    getComponent?: ((name: string, namespace: string) => Function | null) | null,
    error?: ((msg: string) => void) | null,
    sanitizationRules?: LmlSanitizationRules)
    : JsxContent {}

type JsxContent = JSX.Element | string | (JSX.Element | string)[];


// examples
import { defaultSanitizationRules, lml2jsx } from '../lml';
import { h } from 'preact';

let jsx1 = lml2jsx(v, h);

let jsx2 = lml2jsx(v, h, (name, ns) => {
    if (name === "MyCpt" && ns === "b") {
        return MyCpt2;
    }
    return null; // invalid component
});

const sanitizationRules: LmlSanitizationRules = {
    allowedElements: new Set(["input", "my-widget", ...defaultSanitizationRules.allowedElements]),
    forbiddenElementAttributes: defaultSanitizationRules.forbiddenElementAttributes,
    forbidEventHandlers: true,
    allowedUrlPrefixes: defaultSanitizationRules.allowedUrlPrefixes,
    urlAttributes: defaultSanitizationRules.urlAttributes
}

const errors:string[];
let jsx3 = lml2jsx(v, h, null, (msg) => {errors.push(msg)}, sanitizationRules) );
```

By default the following sanitization rules are applied:
```typescript
const defaultSanitizationRules: LmlSanitizationRules = {
    /**
     * Allowed tags - img + tags from https://github.com/apostrophecms/sanitize-html
     * Note: form and input are not in the list
     */
    allowedElements: new Set([
        "address", "article", "aside", "footer", "header", "h1", "h2", "h3", "h4",
        "h5", "h6", "hgroup", "main", "nav", "section", "blockquote", "dd", "div",
        "dl", "dt", "figcaption", "figure", "hr", "li", "main", "ol", "p", "pre",
        "ul", "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn",
        "em", "i", "kbd", "mark", "q", "rb", "rp", "rt", "rtc", "ruby", "s", "samp",
        "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr", "caption",
        "col", "colgroup", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "img"
    ]),

    /** Forbid style, srcset and event handler attributes */
    forbiddenElementAttributes: new Set(["style", "srcset"]),

    /** Tell if elemeent event handlers attributes must be discarded */
    forbidEventHandlers: true,

    /**
     * URL attributes used in allowedElements, will be checked against allowedUrlPrefixes
     * as per https://stackoverflow.com/questions/2725156/complete-list-of-html-tag-attributes-which-have-a-url-value
     */
    urlAttributes: new Set(["href", "src", "cite", "action", "profile", "longdesc", "usemap", "formaction", "icon",
        "poster", "background", "codebase", "data", "classid", "manifest"]),

    /** Allowed URLs - DO NOT PUT "data:text" -> data:text/html can contain malicious scripts */
    allowedUrlPrefixes: ["/", "./", "http://", "https://", "mailto://", "tel://", "data:image/"]
}
```

### ```updateLML()```

In-place update of an LML data structure with instructions provided as arguments. This function is particularly
handy when LML is combined with a reactive state management solution as it allows to update an existing DOM with
*update instructions* sent by the server. This behavior is demonstrated in the [DPA demo] application.

Return the new data structure (may be different if the original data is not a fragment)

```typescript
function updateLML(data: LML, instructions: LmlUpdate[]): LML {}

type LmlUpdate = LmlNodeUpdate | LmlNodeListUpdate | LmlNodeDelete;

interface LmlNodeUpdate {
    action: "insertBefore" | "insertAfter" | "replace";
    node: LmlNodeKey;
    path?: LmlNodePath;
    content: LML;
}
interface LmlNodeListUpdate {
    action: "append" | "prepend" | "replace";
    node: LmlNodeKey;
    path: LmlNodePath;
    content: LML;
}

interface LmlNodeDelete {
    action: "delete";
    node: LmlNodeKey;
    path?: LmlNodePath;
}

// examples (cf. unit tests)
const r1 = updateLML(["#div", "Hello", ["#span.firstName!FN", "Bart"], ["#span.lastName!LN", "Simpson"]], [{
    action: "insertBefore",
    node: "FN",
    content: ["#span.title!TITLE", "Mr"]
}]);
expect(print(r1)).toMatchObject([
    '<div>',
    '  Hello',
    '  <span class="title">',
    '    Mr',
    '  </span>',
    '  <span class="firstName">',
    '    Bart',
    '  </span>',
    '  <span class="lastName">',
    '    Simpson',
    '  </span>',
    '</div>',
]);

const r2 = updateLML(["*mycpt!CPT", { "footer": { "sections": ["First", ["#span", "Second"]] } }, "Hello"], [{
    action: "append",
    node: "CPT",
    path: "footer/sections",
    content: "NEW-NODE"
}]);
expect(print(r2)).toMatchObject([
    '<mycpt() footer={"sections":["First",["#span","Second"],"NEW-NODE"]}>',
    '  Hello',
    '</mycpt>',
]);

```

### ```processJSX()```

Scan LML data and transform them to JSX thanks to the formatter passed as arguement. This function is used by ```lml2jsx()``` behind the scenes.

**WARNING**: This function doesn't perform any sanitization - use with caution!

```typescript
function processJSX(v: LML, f: LmlFormatter): JsxContent

interface LmlFormatter {
    format(ndi: LmlNodeInfo, attributes?: LmlAttributeMap, children?: (JSX.Element | string)[]): JsxContent;
    error?(m: string): void;
}
```

[DPA demo]: https://github.com/asimojs/dpademo
